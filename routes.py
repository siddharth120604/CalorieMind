from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
from datetime import datetime, timedelta
from app import db
from models import User, Meal, Activity, Notification
from ai_service import ai_service
from utils import get_daily_summary, get_weekly_data, get_monthly_data
from models import DailyReport
from datetime import timezone
try:
    # Python 3.9+
    from zoneinfo import ZoneInfo
    IST_ZONE = ZoneInfo('Asia/Kolkata')
except Exception:
    IST_ZONE = None
from sqlalchemy import func
import logging
from functools import wraps

logger = logging.getLogger(__name__)

main_bp = Blueprint('main', __name__)

@main_bp.app_context_processor
def inject_template_vars():
    """Inject template variables"""
    def get_user_by_id(user_id):
        return User.query.get(user_id) if user_id else None
    
    return dict(get_user_by_id=get_user_by_id)


def _get_daily_report_for_user(user, today_summary):
    """Helper to build user/summary objects and call the AI service.

    Returns: dict or None
    """
    try:
        user_obj = {
            'name': user.name,
            'age': user.age,
            'gender': user.gender,
            'weight': user.weight,
            'height': user.height,
            'goal': user.goal
        }
        summary_obj = {
            'calories_consumed': today_summary.get('calories_consumed', 0),
            'calories_burned': today_summary.get('calories_burned', 0),
            'net_calories': today_summary.get('net_calories', 0),
            'meals_count': today_summary.get('meals_count', 0),
            'activities_count': today_summary.get('activities_count', 0),
            'protein': today_summary.get('protein', 0),
            'carbs': today_summary.get('carbs', 0),
            'fats': today_summary.get('fats', 0),
            'fiber': today_summary.get('fiber', 0),
            'sugar': today_summary.get('sugar', 0),
            'sodium': today_summary.get('sodium', 0)
        }
        logger.debug('Calling AIService.generate_daily_report')
        report = ai_service.generate_daily_report(user_obj, summary_obj)
        return report
    except Exception:
        logger.exception('Failed to generate daily report')
        return None


def _format_token_usage(last_usage):
    """Format last usage dict from AIService into a short string."""
    if not last_usage or not isinstance(last_usage, dict):
        return None
    usage = last_usage.get('usage')
    if not usage or not isinstance(usage, dict):
        return None
    in_tok = usage.get('input_tokens')
    out_tok = usage.get('output_tokens')
    total = usage.get('total_tokens')
    parts = []
    if total is not None:
        parts.append(f"total {total}")
    if in_tok is not None:
        parts.append(f"in {in_tok}")
    if out_tok is not None:
        parts.append(f"out {out_tok}")
    return "Tokens: " + ", ".join(parts) if parts else None


def _log_token_usage(action, user, last_usage):
    """Log token usage to the server logs (terminal)."""
    try:
        usage_str = _format_token_usage(last_usage)
        who = None
        if user:
            who = user.email or str(user.id)
        if usage_str:
            logger.info("AI tokens %s user=%s %s", action, who, usage_str)
        else:
            logger.info("AI tokens %s user=%s unavailable", action, who)
    except Exception:
        # Never break the request due to metrics
        logger.debug("Failed to log token usage", exc_info=True)


@main_bp.route('/')
def index():
    """Home page"""
    # Ensure an initial admin exists (promote known admin email if present and no admins exist)
    _ensure_initial_admin()

    if 'user_id' not in session:
        show_pending = request.args.get('pending') in ('1', 'true', 'yes')
        return render_template('index.html', show_pending=show_pending)
    
    user = User.query.get(session['user_id'])
    if not user:
        session.clear()
        return render_template('index.html')
    
    # Check if profile is completed
    if not user.profile_completed:
        flash('Please complete your profile to start tracking', 'info')
        return redirect(url_for('main.profile'))
    
    # Get today's summary
    today_summary = get_daily_summary(user.id)

    # Load today's saved report if any
    daily_report = DailyReport.query.filter(
        DailyReport.user_id == user.id,
        DailyReport.date >= datetime.combine(datetime.utcnow().date(), datetime.min.time())
    ).order_by(DailyReport.created_at.desc()).first()
    if daily_report:
        daily_report = {
            'overview': daily_report.overview,
            'advice': daily_report.advice,
            'concerns': getattr(daily_report, 'concerns', None),
        }

    return render_template('dashboard.html', user=user, today=today_summary, daily_report=daily_report)


@main_bp.route('/api/daily_view')
def api_daily_view():
    """Return JSON for a specific date: summary, meals, activities, and report"""
    if 'user_id' not in session:
        return jsonify({'error': 'authentication required'}), 401

    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({'error': 'user not found'}), 404

    date_str = request.args.get('date')
    try:
        if date_str:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        else:
            date_obj = datetime.utcnow().date()
    except Exception:
        date_obj = datetime.utcnow().date()

    # summary
    summary = get_daily_summary(user.id, date_obj)

    # start/end for DB queries
    start_dt = datetime.combine(date_obj, datetime.min.time())
    end_dt = start_dt + timedelta(days=1)

    meals_q = Meal.query.filter(
        Meal.user_id == user.id,
        Meal.timestamp >= start_dt,
        Meal.timestamp < end_dt
    ).order_by(Meal.timestamp.asc()).all()

    activities_q = Activity.query.filter(
        Activity.user_id == user.id,
        Activity.timestamp >= start_dt,
        Activity.timestamp < end_dt
    ).order_by(Activity.timestamp.asc()).all()

    # find any saved daily report for that date
    report = DailyReport.query.filter(
        DailyReport.user_id == user.id,
        DailyReport.date >= start_dt,
        DailyReport.date < end_dt
    ).order_by(DailyReport.created_at.desc()).first()

    meals = [
        {
            'id': m.id,
            'meal_text': m.meal_text,
            'total_calories': m.total_calories,
            'protein': m.protein,
            'carbs': m.carbs,
            'fats': m.fats,
            'timestamp': m.timestamp.isoformat()
        }
        for m in meals_q
    ]

    activities = [
        {
            'id': a.id,
            'activity_text': a.activity_text,
            'duration': a.duration,
            'calories_burned': a.calories_burned,
            'timestamp': a.timestamp.isoformat()
        }
        for a in activities_q
    ]

    report_data = None
    if report:
        report_data = {
            'overview': report.overview,
            'advice': report.advice,
            'concerns': getattr(report, 'concerns', None),
            'created_at': report.created_at.isoformat(),
        }

    return jsonify({'summary': summary, 'meals': meals, 'activities': activities, 'report': report_data})

@main_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Login page"""
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        
        if not email or not password:
            flash('Please enter both email and password', 'error')
            return render_template('index.html', show_login=True)
        
        user = User.query.filter_by(email=email).first()
        
        if user and user.check_password(password):
            # Block login for pending users
            if getattr(user, 'role', 'user') == 'pending':
                flash('Your account is awaiting admin approval. You will be notified when approved.', 'error')
                return render_template('index.html', show_login=True)

            session['user_id'] = user.id

            # If user was just approved, show a one-time celebration message.
            try:
                approved_note = (Notification.query
                                 .filter_by(recipient_id=user.id, is_read=False)
                                 .filter(Notification.message.ilike('%approved%'))
                                 .order_by(Notification.created_at.desc())
                                 .first())
                if approved_note:
                    approved_note.is_read = True
                    db.session.commit()
                    flash("Yay! You're in — your account has been approved.", 'success')
                else:
                    flash(f'Welcome back, {user.name or user.email}!', 'success')
            except Exception:
                db.session.rollback()
                flash(f'Welcome back, {user.name or user.email}!', 'success')
            return redirect(url_for('main.index'))
        else:
            flash('Invalid email or password', 'error')
            return render_template('index.html', show_login=True)
    
    return render_template('index.html', show_login=True)

@main_bp.route('/register', methods=['GET', 'POST'])
def register():
    """Register page"""
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        
        if not email or not password:
            flash('Please enter both email and password', 'error')
            return render_template('index.html', show_register=True)
        
        if password != confirm_password:
            flash('Passwords do not match', 'error')
            return render_template('index.html', show_register=True)
        
        if len(password) < 6:
            flash('Password must be at least 6 characters long', 'error')
            return render_template('index.html', show_register=True)
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            flash('An account with this email already exists', 'error')
            return render_template('index.html', show_register=True)
        
        try:
            ADMIN_EMAIL = 'siddharthraturi12@gmail.com'

            # Create new user
            user = User(email=email)
            user.set_password(password)
            user.role = 'admin' if email == ADMIN_EMAIL else 'pending'
            db.session.add(user)
            db.session.commit()

            # Notify all admins internally for pending signups
            if user.role == 'pending':
                admins = User.query.filter_by(role='admin').all()
                if admins:
                    for admin in admins:
                        note = Notification(recipient_id=admin.id, sender_id=None, message=f"New user registered: {user.email}")
                        db.session.add(note)
                    db.session.commit()

                flash('Account created. An admin will review your registration shortly.', 'success')
                return redirect(url_for('main.index', pending=1))

            flash('Admin account created. You can log in now.', 'success')
            return redirect(url_for('main.login'))

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating user: {e}")
            flash('Error creating account. Please try again.', 'error')
            return render_template('index.html', show_register=True)
    
    return render_template('index.html', show_register=True)

@main_bp.route('/logout')
def logout():
    """Logout user"""
    session.clear()
    flash('You have been logged out successfully', 'info')
    return redirect(url_for('main.index'))

@main_bp.route('/profile', methods=['GET', 'POST'])
def profile():
    """User profile management"""
    if 'user_id' not in session:
        flash('Please login first', 'error')
        return redirect(url_for('main.login'))
    
    user = User.query.get(session['user_id'])
    if not user:
        session.clear()
        flash('User not found', 'error')
        return redirect(url_for('main.login'))
    
    if request.method == 'POST':
        name = request.form.get('name')
        age = request.form.get('age', type=int)
        gender = request.form.get('gender')
        weight = request.form.get('weight', type=float)
        height = request.form.get('height', type=float)
        goal = request.form.get('goal', 'maintain')
        activity_level = request.form.get('activity_level', 'moderate')

        if not all([name, age, gender, weight, height, activity_level]):
            flash('All fields are required.', 'error')
            return render_template('profile.html', user=user)

        try:
            user.name = name
            user.age = age
            user.gender = gender
            user.weight = weight
            user.height = height
            user.activity_level = activity_level
            user.goal = goal
            user.profile_completed = True

            db.session.commit()
            flash('Profile saved successfully!', 'success')
            return redirect(url_for('main.index'))
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error saving profile: {e}")
            flash('Error saving profile. Please try again.', 'error')
    
    return render_template('profile.html', user=user)

@main_bp.route('/dashboard')
def dashboard():
    """Dashboard page"""
    if 'user_id' not in session:
        flash('Please login first', 'error')
        return redirect(url_for('main.login'))
    
    user = User.query.get(session['user_id'])
    if not user:
        session.clear()
        flash('User not found', 'error')
        return redirect(url_for('main.login'))
    
    if not user.profile_completed:
        flash('Please complete your profile to view dashboard', 'info')
        return redirect(url_for('main.profile'))
    
    # Get today's summary
    today_summary = get_daily_summary(user.id)

    # Load today's saved report if any
    daily_report = DailyReport.query.filter(
        DailyReport.user_id == user.id,
        DailyReport.date >= datetime.combine(datetime.utcnow().date(), datetime.min.time())
    ).order_by(DailyReport.created_at.desc()).first()
    if daily_report:
        daily_report = {'overview': daily_report.overview, 'advice': daily_report.advice}

    return render_template('dashboard.html', user=user, today=today_summary, daily_report=daily_report)

@main_bp.route('/meals')
def meals():
    """Meals page"""
    if 'user_id' not in session:
        flash('Please login first', 'error')
        return redirect(url_for('main.login'))
    
    user = User.query.get(session['user_id'])
    if not user:
        session.clear()
        flash('User not found', 'error')
        return redirect(url_for('main.login'))
    
    if not user.profile_completed:
        flash('Please complete your profile first', 'info')
        return redirect(url_for('main.profile'))
    
    # Get user's meals for today using IST (Asia/Kolkata) boundaries
    if IST_ZONE:
        ist_now = datetime.now(IST_ZONE)
        ist_start = datetime.combine(ist_now.date(), datetime.min.time()).replace(tzinfo=IST_ZONE)
        ist_end = ist_start + timedelta(days=1)
        # convert IST boundaries to UTC for comparison if timestamps are stored in UTC
        start_of_day = ist_start.astimezone(timezone.utc)
        end_of_day = ist_end.astimezone(timezone.utc)
    else:
        # fallback to UTC day boundaries
        start_of_day = datetime.combine(datetime.utcnow().date(), datetime.min.time()).replace(tzinfo=timezone.utc)
        end_of_day = start_of_day + timedelta(days=1)

    meals = (Meal.query
             .filter(Meal.user_id == user.id)
             .filter(Meal.timestamp >= start_of_day, Meal.timestamp < end_of_day)
             .order_by(Meal.timestamp.desc())
             .limit(50)
             .all())
    
    # Get today's summary
    today_summary = get_daily_summary(user.id)
    
    return render_template('meals.html', meals=meals, user=user, today=today_summary)

@main_bp.route('/activities')
def activities():
    """Activities page"""
    if 'user_id' not in session:
        flash('Please login first', 'error')
        return redirect(url_for('main.login'))
    
    user = User.query.get(session['user_id'])
    if not user:
        session.clear()
        flash('User not found', 'error')
        return redirect(url_for('main.login'))
    
    if not user.profile_completed:
        flash('Please complete your profile first', 'info')
        return redirect(url_for('main.profile'))
    
    # Get user's activities for today using IST (Asia/Kolkata) boundaries
    if IST_ZONE:
        ist_now = datetime.now(IST_ZONE)
        ist_start = datetime.combine(ist_now.date(), datetime.min.time()).replace(tzinfo=IST_ZONE)
        ist_end = ist_start + timedelta(days=1)
        # convert IST boundaries to UTC for comparison if timestamps are stored in UTC
        start_of_day = ist_start.astimezone(timezone.utc)
        end_of_day = ist_end.astimezone(timezone.utc)
    else:
        # fallback to UTC day boundaries
        start_of_day = datetime.combine(datetime.utcnow().date(), datetime.min.time()).replace(tzinfo=timezone.utc)
        end_of_day = start_of_day + timedelta(days=1)

    activities = (Activity.query
                  .filter(Activity.user_id == user.id)
                  .filter(Activity.timestamp >= start_of_day, Activity.timestamp < end_of_day)
                  .order_by(Activity.timestamp.desc())
                  .limit(50)
                  .all())
    
    # Get today's summary
    today_summary = get_daily_summary(user.id)
    
    return render_template('activities.html', activities=activities, user=user, today=today_summary)

@main_bp.route('/add_meal', methods=['POST'])
def add_meal():
    """Add a new meal"""
    if 'user_id' not in session:
        flash('Please login first', 'error')
        return redirect(url_for('main.login'))
    
    meal_text = request.form.get('meal_text', '').strip()
    meal_type = request.form.get('meal_type', 'meal')
    
    if not meal_text:
        flash('Please enter a meal description', 'error')
        return redirect(url_for('main.meals'))
    
    user = User.query.get(session['user_id'])
    if not user:
        flash('User not found', 'error')
        return redirect(url_for('main.profile'))
    
    try:
        # Parse meal with AI
        parsed_data = ai_service.parse_meal(meal_text)
        _log_token_usage('parse_meal', user, ai_service.pop_last_usage())
        
        # Create meal record
        meal = Meal(
            user_id=user.id,
            meal_text=meal_text,
            parsed_data=parsed_data,
            total_calories=parsed_data.get('total_calories', 0),
            protein=parsed_data.get('total_protein', 0),
            carbs=parsed_data.get('total_carbs', 0),
            fats=parsed_data.get('total_fats', 0),
            fiber=parsed_data.get('total_fiber', 0),
            sugar=parsed_data.get('total_sugar', 0),
            sodium=parsed_data.get('total_sodium', 0),
            meal_type=parsed_data.get('meal_type', meal_type)
        )
        
        db.session.add(meal)
        db.session.commit()

        flash(f'Meal added successfully! Estimated {meal.total_calories:.0f} calories', 'success')
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding meal: {e}")
        flash('Error processing meal. Please try again.', 'error')
    
    return redirect(url_for('main.meals'))

@main_bp.route('/add_activity', methods=['POST'])
def add_activity():
    """Add a new activity"""
    if 'user_id' not in session:
        flash('Please set up your profile first', 'error')
        return redirect(url_for('main.profile'))
    
    activity_text = request.form.get('activity_text', '').strip()
    
    if not activity_text:
        flash('Please enter an activity description', 'error')
        return redirect(url_for('main.activities'))
    
    user = User.query.get(session['user_id'])
    if not user:
        flash('User not found', 'error')
        return redirect(url_for('main.profile'))
    
    try:
        # Parse activity with AI
        parsed_data = ai_service.parse_activity(activity_text, user.weight, user.age, user.gender)
        _log_token_usage('parse_activity', user, ai_service.pop_last_usage())
        
        # Create activity record
        activity = Activity(
            user_id=user.id,
            activity_text=activity_text,
            parsed_data=parsed_data,
            activity_type=parsed_data.get('activity_type', 'other'),
            duration=parsed_data.get('total_duration', 0),
            intensity=parsed_data.get('intensity', 'moderate'),
            calories_burned=parsed_data.get('total_calories', 0)
        )
        
        db.session.add(activity)
        db.session.commit()

        flash(f'Activity added successfully! Estimated {activity.calories_burned:.0f} calories burned', 'success')
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding activity: {e}")
        flash('Error processing activity. Please try again.', 'error')
    
    return redirect(url_for('main.activities'))

@main_bp.route('/generate_report', methods=['POST'])
def generate_report():
    """Generate a daily report via the LLM and save it to DB"""
    if 'user_id' not in session:
        flash('Please login first', 'error')
        return redirect(url_for('main.login'))

    user = User.query.get(session['user_id'])
    if not user:
        flash('User not found', 'error')
        return redirect(url_for('main.login'))

    today_summary = get_daily_summary(user.id)
    report = _get_daily_report_for_user(user, today_summary)
    if not report:
        flash('Failed to generate report. Try again later.', 'error')
        return redirect(url_for('main.index'))

    _log_token_usage('generate_daily_report', user, ai_service.pop_last_usage())

    # Save to DB: replace today's report if exists, otherwise create
    try:
        # Start of today (UTC)
        start_of_day = datetime.combine(datetime.utcnow().date(), datetime.min.time())
        existing = DailyReport.query.filter(
            DailyReport.user_id == user.id,
            DailyReport.date >= start_of_day
        ).order_by(DailyReport.created_at.desc()).first()

        if existing:
            existing.overview = report.get('overview')
            existing.advice = report.get('advice')
            existing.concerns = report.get('concerns')
            existing.created_at = datetime.utcnow()
            existing.date = datetime.utcnow()
            db.session.commit()
            flash('Daily report regenerated and saved (replaced previous).', 'success')
        else:
            dr = DailyReport(
                user_id=user.id,
                date=datetime.utcnow(),
                overview=report.get('overview'),
                advice=report.get('advice'),
                concerns=report.get('concerns'),
            )
            db.session.add(dr)
            db.session.commit()
            flash('Daily report generated and saved.', 'success')
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error saving daily report: {e}")
        flash('Report generated but failed to save.', 'warning')

    return redirect(url_for('main.index'))

@main_bp.route('/reports')
def reports():
    """List saved daily reports"""
    if 'user_id' not in session:
        flash('Please login first', 'error')
        return redirect(url_for('main.login'))

    user = User.query.get(session['user_id'])
    if not user:
        flash('User not found', 'error')
        return redirect(url_for('main.login'))

    reports = DailyReport.query.filter(DailyReport.user_id == user.id).order_by(DailyReport.created_at.desc()).all()

    def to_ist_str(dt):
        if not dt:
            return ''
        try:
            if IST_ZONE:
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                local = dt.astimezone(IST_ZONE)
            else:
                # Fallback: add 5.5 hours
                local = dt + timedelta(hours=5, minutes=30)
            return local.strftime('%Y-%m-%d %H:%M')
        except Exception:
            return dt.strftime('%Y-%m-%d %H:%M')

    reports_display = []
    for r in reports:
        reports_display.append({
            'id': r.id,
            'date_str': to_ist_str(r.date),
            'created_at_str': to_ist_str(r.created_at),
            'overview': r.overview,
            'advice': r.advice
        })

    return render_template('reports.html', reports=reports_display, user=user)

@main_bp.route('/reports/<int:report_id>')
def report_detail(report_id):
    """Show a saved report with related meals and activities for that day"""
    if 'user_id' not in session:
        flash('Please login first', 'error')
        return redirect(url_for('main.login'))

    user = User.query.get(session['user_id'])
    if not user:
        flash('User not found', 'error')
        return redirect(url_for('main.login'))

    report = DailyReport.query.filter_by(id=report_id, user_id=user.id).first()
    if not report:
        flash('Report not found', 'error')
        return redirect(url_for('main.reports'))

    # Get meals and activities for the day of the report
    report_date = report.date.date()
    start_dt = datetime.combine(report_date, datetime.min.time())
    end_dt = start_dt + timedelta(days=1)

    meals = Meal.query.filter(Meal.user_id == user.id, Meal.timestamp >= start_dt, Meal.timestamp < end_dt).all()
    activities = Activity.query.filter(Activity.user_id == user.id, Activity.timestamp >= start_dt, Activity.timestamp < end_dt).all()

    # Compute macros for the day (or reuse utils.get_daily_summary)
    summary = get_daily_summary(user.id, report_date)

    # Format report times to IST for display
    def to_ist_str(dt):
        if not dt:
            return ''
        try:
            if IST_ZONE:
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                local = dt.astimezone(IST_ZONE)
            else:
                local = dt + timedelta(hours=5, minutes=30)
            return local.strftime('%Y-%m-%d %H:%M')
        except Exception:
            return dt.strftime('%Y-%m-%d %H:%M')

    report_display = {
        'id': report.id,
        'date_str': to_ist_str(report.date),
        'created_at_str': to_ist_str(report.created_at),
        'overview': report.overview,
        'advice': report.advice,
        'concerns': getattr(report, 'concerns', None),
    }

    return render_template('report_detail.html', report=report_display, meals=meals, activities=activities, summary=summary, user=user)

@main_bp.route('/api/weekly_data')
def api_weekly_data():
    """API endpoint for weekly chart data"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    weekly_data = get_weekly_data(session['user_id'])
    
    return jsonify({
        'dates': [day['date'].strftime('%Y-%m-%d') for day in weekly_data],
        'calories_consumed': [day['calories_consumed'] for day in weekly_data],
        'calories_burned': [day['calories_burned'] for day in weekly_data],
        'net_calories': [day['net_calories'] for day in weekly_data]
    })

@main_bp.route('/api/monthly_data')
def api_monthly_data():
    """API endpoint for monthly chart data"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)
    
    monthly_data = get_monthly_data(session['user_id'], year, month)
    
    return jsonify({
        'dates': [day['date'].strftime('%Y-%m-%d') for day in monthly_data],
        'calories_consumed': [day['calories_consumed'] for day in monthly_data],
        'calories_burned': [day['calories_burned'] for day in monthly_data],
        'net_calories': [day['net_calories'] for day in monthly_data]
    })

@main_bp.route('/delete_meal/<int:meal_id>', methods=['POST'])
def delete_meal(meal_id):
    """Delete a meal"""
    if 'user_id' not in session:
        flash('Not authenticated', 'error')
        return redirect(url_for('main.login'))
    
    meal = Meal.query.filter_by(id=meal_id, user_id=session['user_id']).first()
    if not meal:
        flash('Meal not found', 'error')
        return redirect(url_for('main.meals'))
    
    try:
        db.session.delete(meal)
        db.session.commit()
        flash('Meal deleted successfully', 'success')
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting meal: {e}")
        flash('Error deleting meal', 'error')
    
    return redirect(url_for('main.meals'))

@main_bp.route('/repeat_meal/<int:meal_id>', methods=['POST'])
def repeat_meal(meal_id):
    """Duplicate a meal entry for the current user with a new timestamp"""
    if 'user_id' not in session:
        flash('Not authenticated', 'error')
        return redirect(url_for('main.login'))

    orig = Meal.query.filter_by(id=meal_id, user_id=session['user_id']).first()
    if not orig:
        flash('Meal not found', 'error')
        return redirect(url_for('main.meals'))

    try:
        new_meal = Meal(
            user_id=orig.user_id,
            meal_text=orig.meal_text,
            parsed_data=orig.parsed_data,
            total_calories=orig.total_calories,
            protein=orig.protein,
            carbs=orig.carbs,
            fats=orig.fats,
            fiber=orig.fiber,
            sugar=orig.sugar,
            sodium=orig.sodium,
            meal_type=orig.meal_type
        )
        db.session.add(new_meal)
        db.session.commit()
        flash('Meal repeated successfully', 'success')
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error repeating meal: {e}")
        flash('Error repeating meal', 'error')

    return redirect(url_for('main.meals'))

@main_bp.route('/delete_activity/<int:activity_id>', methods=['POST'])
def delete_activity(activity_id):
    """Delete an activity"""
    if 'user_id' not in session:
        flash('Not authenticated', 'error')
        return redirect(url_for('main.login'))
    
    activity = Activity.query.filter_by(id=activity_id, user_id=session['user_id']).first()
    if not activity:
        flash('Activity not found', 'error')
        return redirect(url_for('main.activities'))
    
    try:
        db.session.delete(activity)
        db.session.commit()
        flash('Activity deleted successfully', 'success')
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting activity: {e}")
        flash('Error deleting activity', 'error')
    
    return redirect(url_for('main.activities'))


# --- RBAC / Admin helper routes ---
def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please login first', 'error')
            return redirect(url_for('main.login'))
        user = User.query.get(session['user_id'])
        if not user or getattr(user, 'role', '') != 'admin':
            flash('Admin access required', 'error')
            return redirect(url_for('main.index'))
        return f(*args, **kwargs)
    return decorated


def _ensure_initial_admin():
    """Promote a known admin email to admin if no admins exist yet."""
    try:
        admin_count = User.query.filter_by(role='admin').count()
        if admin_count == 0:
            admin_email = 'siddharthraturi12@gmail.com'
            u = User.query.filter_by(email=admin_email).first()
            if u:
                u.role = 'admin'
                db.session.commit()
    except Exception:
        db.session.rollback()


@main_bp.route('/admin')
@admin_required
def admin_index():
    # show pending users and unread notifications
    pending = User.query.filter_by(role='pending').order_by(User.created_at.asc()).all()
    notifications = Notification.query.filter_by(recipient_id=session['user_id']).order_by(Notification.created_at.desc()).all()
    return render_template('admin_pending.html', pending=pending, notifications=notifications)


@main_bp.route('/admin/approve/<int:user_id>', methods=['POST'])
@admin_required
def admin_approve(user_id):
    u = User.query.get(user_id)
    if not u:
        flash('User not found', 'error')
        return redirect(url_for('main.admin_index'))
    try:
        u.role = 'user'
        db.session.commit()
        # notify the user
        note = Notification(recipient_id=u.id, sender_id=session.get('user_id'), message='Your account has been approved by an admin. You can now log in.')
        db.session.add(note)
        db.session.commit()
        flash('User approved', 'success')
    except Exception as e:
        db.session.rollback()
        logger.error(f'Error approving user: {e}')
        flash('Failed to approve user', 'error')
    return redirect(url_for('main.admin_index'))


@main_bp.route('/admin/reject/<int:user_id>', methods=['POST'])
@admin_required
def admin_reject(user_id):
    u = User.query.get(user_id)
    if not u:
        flash('User not found', 'error')
        return redirect(url_for('main.admin_index'))
    try:
        db.session.delete(u)
        db.session.commit()
        flash('User rejected and removed', 'success')
    except Exception as e:
        db.session.rollback()
        logger.error(f'Error rejecting user: {e}')
        flash('Failed to remove user', 'error')
    return redirect(url_for('main.admin_index'))


@main_bp.route('/admin/promote/<int:user_id>', methods=['POST'])
@admin_required
def admin_promote(user_id):
    u = User.query.get(user_id)
    if not u:
        flash('User not found', 'error')
        return redirect(url_for('main.admin_index'))
    try:
        u.role = 'admin'
        db.session.commit()
        flash('User promoted to admin', 'success')
    except Exception as e:
        db.session.rollback()
        logger.error(f'Error promoting user: {e}')
        flash('Failed to promote user', 'error')
    return redirect(url_for('main.admin_index'))


@main_bp.route('/admin/mark_read/<int:note_id>', methods=['POST'])
@admin_required
def admin_mark_read(note_id):
    n = Notification.query.get(note_id)
    if not n:
        return ('', 404)
    try:
        n.is_read = True
        db.session.commit()
    except Exception:
        db.session.rollback()
    return ('', 204)


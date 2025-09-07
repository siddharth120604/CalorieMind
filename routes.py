from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
from datetime import datetime, timedelta
from app import db
from models import User, Meal, Activity
from ai_service import ai_service
from utils import get_daily_summary, get_weekly_data, get_monthly_data
import logging

logger = logging.getLogger(__name__)

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    """Home page"""
    if 'user_id' not in session:
        return render_template('index.html')
    
    user = User.query.get(session['user_id'])
    if not user:
        session.clear()
        return render_template('index.html')
    
    # Get today's summary
    today_summary = get_daily_summary(user.id)
    return render_template('dashboard.html', user=user, today=today_summary)

@main_bp.route('/profile', methods=['GET', 'POST'])
def profile():
    """User profile management"""
    if request.method == 'POST':
        name = request.form.get('name')
        age = request.form.get('age', type=int)
        gender = request.form.get('gender')
        weight = request.form.get('weight', type=float)
        height = request.form.get('height', type=float)
        activity_level = request.form.get('activity_level')
        
        if not all([name, age, gender, weight, height, activity_level]):
            flash('All fields are required', 'error')
            return render_template('profile.html')
        
        # Check if user exists or create new one
        if 'user_id' in session:
            user = User.query.get(session['user_id'])
            if user:
                user.name = name
                user.age = age
                user.gender = gender
                user.weight = weight
                user.height = height
                user.activity_level = activity_level
            else:
                user = User(name=name, age=age, gender=gender, weight=weight, height=height, activity_level=activity_level)
                db.session.add(user)
        else:
            user = User(name=name, age=age, gender=gender, weight=weight, height=height, activity_level=activity_level)
            db.session.add(user)
        
        try:
            db.session.commit()
            session['user_id'] = user.id
            flash('Profile saved successfully!', 'success')
            return redirect(url_for('main.index'))
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error saving profile: {e}")
            flash('Error saving profile. Please try again.', 'error')
    
    # GET request
    user = None
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
    
    return render_template('profile.html', user=user)

@main_bp.route('/add_meal', methods=['POST'])
def add_meal():
    """Add a new meal"""
    if 'user_id' not in session:
        flash('Please set up your profile first', 'error')
        return redirect(url_for('main.profile'))
    
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

@main_bp.route('/meals')
def meals():
    """Meals dashboard"""
    if 'user_id' not in session:
        flash('Please set up your profile first', 'error')
        return redirect(url_for('main.profile'))
    
    user = User.query.get(session['user_id'])
    if not user:
        flash('User not found', 'error')
        return redirect(url_for('main.profile'))
    
    # Get recent meals (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_meals = Meal.query.filter(
        Meal.user_id == user.id,
        Meal.timestamp >= thirty_days_ago
    ).order_by(Meal.timestamp.desc()).limit(50).all()
    
    # Get today's summary
    today_summary = get_daily_summary(user.id)
    
    return render_template('meals.html', meals=recent_meals, today=today_summary, user=user)

@main_bp.route('/activities')
def activities():
    """Activities dashboard"""
    if 'user_id' not in session:
        flash('Please set up your profile first', 'error')
        return redirect(url_for('main.profile'))
    
    user = User.query.get(session['user_id'])
    if not user:
        flash('User not found', 'error')
        return redirect(url_for('main.profile'))
    
    # Get recent activities (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_activities = Activity.query.filter(
        Activity.user_id == user.id,
        Activity.timestamp >= thirty_days_ago
    ).order_by(Activity.timestamp.desc()).limit(50).all()
    
    # Get today's summary
    today_summary = get_daily_summary(user.id)
    
    return render_template('activities.html', activities=recent_activities, today=today_summary, user=user)

@main_bp.route('/dashboard')
def dashboard():
    """Main dashboard with charts"""
    if 'user_id' not in session:
        flash('Please set up your profile first', 'error')
        return redirect(url_for('main.profile'))
    
    user = User.query.get(session['user_id'])
    if not user:
        flash('User not found', 'error')
        return redirect(url_for('main.profile'))
    
    # Get today's summary
    today_summary = get_daily_summary(user.id)
    
    return render_template('dashboard.html', user=user, today=today_summary)

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
        return redirect(url_for('main.profile'))
    
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

@main_bp.route('/delete_activity/<int:activity_id>', methods=['POST'])
def delete_activity(activity_id):
    """Delete an activity"""
    if 'user_id' not in session:
        flash('Not authenticated', 'error')
        return redirect(url_for('main.profile'))
    
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

import logging
from datetime import datetime, date as date_type
from backend.extensions import db
from backend.models.daily_report import DailyReport
from backend.models.weight_log import WeightLog
from backend.services.ai_service import ai_service
from backend.services.summary_service import get_daily_summary
from backend.utils.timezone import get_ist_today

logger = logging.getLogger(__name__)


def generate_daily_report(user, date=None):
    summary = get_daily_summary(user.id, date)

    # Get today's weight log notes (how user is feeling)
    report_date = date or get_ist_today()
    weight_log = WeightLog.query.filter_by(
        user_id=user.id, date=report_date,
    ).first()

    user_obj = {
        'name': user.name,
        'age': user.age,
        'gender': user.gender,
        'weight': user.weight,
        'height': user.height,
        'goal': user.goal,
        'daily_calorie_target': user.daily_calorie_target,
    }
    summary_obj = {
        'calories_consumed': summary.get('calories_consumed', 0),
        'calories_burned': summary.get('calories_burned', 0),
        'net_calories': summary.get('net_calories', 0),
        'meals_count': summary.get('meals_count', 0),
        'activities_count': summary.get('activities_count', 0),
        'protein': summary.get('protein', 0),
        'carbs': summary.get('carbs', 0),
        'fats': summary.get('fats', 0),
        'fiber': summary.get('fiber', 0),
        'sugar': summary.get('sugar', 0),
        'sodium': summary.get('sodium', 0),
    }
    if weight_log and weight_log.notes:
        summary_obj['user_notes'] = weight_log.notes

    report = ai_service.generate_daily_report(user_obj, summary_obj)
    token_usage = ai_service.pop_last_usage()

    if not report:
        return None, token_usage

    # Upsert: replace today's report or create new
    start_of_day = datetime.combine(datetime.utcnow().date(), datetime.min.time())
    existing = DailyReport.query.filter(
        DailyReport.user_id == user.id,
        DailyReport.date >= start_of_day,
    ).order_by(DailyReport.created_at.desc()).first()

    if existing:
        existing.overview = report.get('overview')
        existing.advice = report.get('advice')
        existing.concerns = report.get('concerns')
        existing.created_at = datetime.utcnow()
        existing.date = datetime.utcnow()
        db.session.commit()
        return existing, token_usage
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
        return dr, token_usage


def get_reports(user_id):
    return DailyReport.query.filter(
        DailyReport.user_id == user_id
    ).order_by(DailyReport.created_at.desc()).all()


def get_report_by_id(user_id, report_id):
    return DailyReport.query.filter_by(id=report_id, user_id=user_id).first()

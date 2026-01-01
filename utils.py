from datetime import datetime, timedelta, timezone
from app import db
from models import Meal, Activity, User
from ai_service import ai_service

try:
    # Python 3.9+
    from zoneinfo import ZoneInfo
    IST_ZONE = ZoneInfo('Asia/Kolkata')
except Exception:
    IST_ZONE = None

def get_daily_summary(user_id, date=None):
    """Get daily summary of calories consumed and burned"""
    if date is None:
        # Get current date in IST
        if IST_ZONE:
            date = datetime.now(IST_ZONE).date()
        else:
            date = datetime.utcnow().date()
    
    # Create IST boundaries and convert to UTC for database query
    if IST_ZONE:
        ist_start = datetime.combine(date, datetime.min.time()).replace(tzinfo=IST_ZONE)
        ist_end = ist_start + timedelta(days=1)
        start_date = ist_start.astimezone(timezone.utc).replace(tzinfo=None)
        end_date = ist_end.astimezone(timezone.utc).replace(tzinfo=None)
    else:
        # Fallback to UTC
        start_date = datetime.combine(date, datetime.min.time())
        end_date = start_date + timedelta(days=1)
    
    # Get meals for the day
    meals = Meal.query.filter(
        Meal.user_id == user_id,
        Meal.timestamp >= start_date,
        Meal.timestamp < end_date
    ).all()
    
    # Get activities for the day
    activities = Activity.query.filter(
        Activity.user_id == user_id,
        Activity.timestamp >= start_date,
        Activity.timestamp < end_date
    ).all()
    
    total_calories_consumed = sum(meal.total_calories for meal in meals)
    total_calories_burned = sum(activity.calories_burned for activity in activities)
    # Sum macros from meals (some meal fields may be None)
    total_protein = sum((meal.protein or 0) for meal in meals)
    total_carbs = sum((meal.carbs or 0) for meal in meals)
    total_fats = sum((meal.fats or 0) for meal in meals)
    total_fiber = sum((meal.fiber or 0) for meal in meals)
    total_sugar = sum((meal.sugar or 0) for meal in meals)
    total_sodium = sum((meal.sodium or 0) for meal in meals)

    return {
        'date': date,
        'calories_consumed': total_calories_consumed,
        'calories_burned': total_calories_burned,
        'net_calories': total_calories_consumed - total_calories_burned,
        'meals_count': len(meals),
        'activities_count': len(activities),
        'protein': total_protein,
        'carbs': total_carbs,
        'fats': total_fats,
        'fiber': total_fiber,
        'sugar': total_sugar,
        'sodium': total_sodium
    }

def get_weekly_data(user_id, end_date=None):
    """Get weekly summary data for charts"""
    if end_date is None:
        # Get current date in IST
        if IST_ZONE:
            end_date = datetime.now(IST_ZONE).date()
        else:
            end_date = datetime.utcnow().date()
    
    start_date = end_date - timedelta(days=6)  # 7 days total
    
    daily_data = []
    current_date = start_date
    
    while current_date <= end_date:
        daily_summary = get_daily_summary(user_id, current_date)
        daily_data.append(daily_summary)
        current_date += timedelta(days=1)
    
    return daily_data

def get_monthly_data(user_id, year=None, month=None):
    """Get monthly summary data"""
    if year is None or month is None:
        # Get current year/month in IST
        if IST_ZONE:
            ist_now = datetime.now(IST_ZONE)
            if year is None:
                year = ist_now.year
            if month is None:
                month = ist_now.month
        else:
            if year is None:
                year = datetime.utcnow().year
            if month is None:
                month = datetime.utcnow().month
    
    start_date = datetime(year, month, 1).date()
    if month == 12:
        end_date = datetime(year + 1, 1, 1).date() - timedelta(days=1)
    else:
        end_date = datetime(year, month + 1, 1).date() - timedelta(days=1)
    
    current_date = start_date
    monthly_data = []
    
    while current_date <= end_date:
        daily_summary = get_daily_summary(user_id, current_date)
        monthly_data.append(daily_summary)
        current_date += timedelta(days=1)
    
    return monthly_data

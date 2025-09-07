from datetime import datetime, timedelta
from app import db
from models import Meal, Activity

def get_daily_summary(user_id, date=None):
    """Get daily summary of calories consumed and burned"""
    if date is None:
        date = datetime.utcnow().date()
    
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
    
    return {
        'date': date,
        'calories_consumed': total_calories_consumed,
        'calories_burned': total_calories_burned,
        'net_calories': total_calories_consumed - total_calories_burned,
        'meals_count': len(meals),
        'activities_count': len(activities)
    }

def get_weekly_data(user_id, end_date=None):
    """Get weekly summary data for charts"""
    if end_date is None:
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

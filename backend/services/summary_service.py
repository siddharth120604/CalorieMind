from datetime import datetime, timedelta
from backend.extensions import db
from backend.models.meal import Meal
from backend.models.activity import Activity
from backend.utils.timezone import IST_ZONE, get_ist_today, get_day_boundaries_utc


def get_daily_summary(user_id, date=None):
    if date is None:
        date = get_ist_today()

    start_date, end_date = get_day_boundaries_utc(date)

    meals = Meal.query.filter(
        Meal.user_id == user_id,
        Meal.timestamp >= start_date,
        Meal.timestamp < end_date,
    ).all()

    activities = Activity.query.filter(
        Activity.user_id == user_id,
        Activity.timestamp >= start_date,
        Activity.timestamp < end_date,
    ).all()

    total_calories_consumed = sum(m.total_calories for m in meals)
    total_calories_burned = sum(a.calories_burned for a in activities)
    total_protein = sum((m.protein or 0) for m in meals)
    total_carbs = sum((m.carbs or 0) for m in meals)
    total_fats = sum((m.fats or 0) for m in meals)
    total_fiber = sum((m.fiber or 0) for m in meals)
    total_sugar = sum((m.sugar or 0) for m in meals)
    total_sodium = sum((m.sodium or 0) for m in meals)

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
        'sodium': total_sodium,
    }


def get_weekly_data(user_id, end_date=None):
    if end_date is None:
        end_date = get_ist_today()

    start_date = end_date - timedelta(days=6)
    daily_data = []
    current_date = start_date

    while current_date <= end_date:
        daily_data.append(get_daily_summary(user_id, current_date))
        current_date += timedelta(days=1)

    return daily_data


def get_monthly_data(user_id, year=None, month=None):
    if year is None or month is None:
        today = get_ist_today()
        if year is None:
            year = today.year
        if month is None:
            month = today.month

    start_date = datetime(year, month, 1).date()
    if month == 12:
        end_date = datetime(year + 1, 1, 1).date() - timedelta(days=1)
    else:
        end_date = datetime(year, month + 1, 1).date() - timedelta(days=1)

    current_date = start_date
    monthly_data = []

    while current_date <= end_date:
        monthly_data.append(get_daily_summary(user_id, current_date))
        current_date += timedelta(days=1)

    return monthly_data

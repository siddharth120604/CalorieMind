"""Compute and store weekly summaries with correction factors."""
from datetime import timedelta, date as date_type
from backend.extensions import db
from backend.models.weight_log import WeightLog
from backend.models.weekly_summary import WeeklySummary
from backend.services.summary_service import get_daily_summary

CAL_PER_KG = 7700


def compute_weekly_summary(user, week_start, week_end):
    """Compute and upsert a WeeklySummary for the given week."""
    # Get avg weight this week
    weight_logs = WeightLog.query.filter(
        WeightLog.user_id == user.id,
        WeightLog.date >= week_start,
        WeightLog.date <= week_end,
    ).all()
    avg_weight = sum(l.weight for l in weight_logs) / len(weight_logs) if weight_logs else None

    # Get avg weight previous week
    prev_start = week_start - timedelta(days=7)
    prev_end = week_start - timedelta(days=1)
    prev_logs = WeightLog.query.filter(
        WeightLog.user_id == user.id,
        WeightLog.date >= prev_start,
        WeightLog.date <= prev_end,
    ).all()
    prev_avg_weight = sum(l.weight for l in prev_logs) / len(prev_logs) if prev_logs else None

    # Calories consumed/burned for the week
    consumed = 0
    burned = 0
    current = week_start
    while current <= min(week_end, date_type.today()):
        summary = get_daily_summary(user.id, current)
        consumed += summary['calories_consumed']
        burned += summary['calories_burned']
        current += timedelta(days=1)

    daily_target = user.daily_calorie_target or 0
    weekly_target = daily_target * 7

    # Predicted weight change: (consumed - bmr*7) / 7700
    bmr = user.calculate_bmr()
    predicted_change = ((consumed - burned) - (bmr * 7)) / CAL_PER_KG if bmr > 0 else None

    # Actual weight change
    actual_change = None
    if avg_weight and prev_avg_weight:
        actual_change = avg_weight - prev_avg_weight

    # Correction factor for this week
    week_factor = None
    if predicted_change and actual_change and predicted_change != 0:
        week_factor = actual_change / predicted_change

    # Upsert
    existing = WeeklySummary.query.filter_by(
        user_id=user.id, week_start=week_start,
    ).first()

    if existing:
        ws = existing
    else:
        ws = WeeklySummary(user_id=user.id, week_start=week_start, week_end=week_end)
        db.session.add(ws)

    ws.avg_weight = round(avg_weight, 2) if avg_weight else None
    ws.calories_consumed = round(consumed)
    ws.calories_target = round(weekly_target)
    ws.calories_burned = round(burned)
    ws.predicted_weight_change = round(predicted_change, 4) if predicted_change else None
    ws.actual_weight_change = round(actual_change, 4) if actual_change else None
    ws.correction_factor = round(week_factor, 4) if week_factor else None

    db.session.commit()

    # Update user's rolling correction factor (last 4 weeks)
    recent = WeeklySummary.query.filter(
        WeeklySummary.user_id == user.id,
        WeeklySummary.correction_factor.isnot(None),
    ).order_by(WeeklySummary.week_end.desc()).limit(4).all()

    if recent:
        factors = [s.correction_factor for s in recent]
        user.correction_factor = round(sum(factors) / len(factors), 4)
        db.session.commit()

    return ws

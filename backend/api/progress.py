from datetime import datetime, timedelta, date as date_type
from flask import Blueprint, request, jsonify, g
from backend.extensions import db
from backend.middleware.auth import jwt_required
from backend.models.weight_log import WeightLog
from backend.models.weekly_summary import WeeklySummary
from backend.services.summary_service import get_daily_summary

progress_bp = Blueprint('progress', __name__)

CAL_PER_KG = 7700  # ~7700 cal deficit ≈ 1kg fat loss


def _get_week_bounds(date=None):
    """Get Monday-Sunday bounds for the week containing the given date."""
    if date is None:
        date = date_type.today()
    monday = date - timedelta(days=date.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday


def _get_weekly_avg_weight(user_id, week_start, week_end):
    """Average weight from logs within the week."""
    logs = WeightLog.query.filter(
        WeightLog.user_id == user_id,
        WeightLog.date >= week_start,
        WeightLog.date <= week_end,
    ).all()
    if not logs:
        return None
    return sum(l.weight for l in logs) / len(logs)


def _compute_week_calories(user_id, week_start, week_end):
    """Sum consumed and burned across the week."""
    consumed = 0
    burned = 0
    current = week_start
    while current <= min(week_end, date_type.today()):
        summary = get_daily_summary(user_id, current)
        consumed += summary['calories_consumed']
        burned += summary['calories_burned']
        current += timedelta(days=1)
    return consumed, burned


@progress_bp.route('/weekly', methods=['GET'])
@jwt_required
def weekly_progress():
    week_start, week_end = _get_week_bounds()
    consumed, burned = _compute_week_calories(g.current_user.id, week_start, week_end)
    target = g.current_user.daily_calorie_target or 0
    days_in_week = (min(week_end, date_type.today()) - week_start).days + 1
    weekly_target = target * days_in_week

    return jsonify({
        'week_start': week_start.isoformat(),
        'week_end': week_end.isoformat(),
        'days_tracked': days_in_week,
        'calories_consumed': round(consumed),
        'calories_burned': round(burned),
        'calories_target': round(weekly_target),
        'calories_remaining': round(weekly_target - consumed + burned),
        'on_track': consumed <= weekly_target,
    }), 200


@progress_bp.route('/monthly', methods=['GET'])
@jwt_required
def monthly_progress():
    today = date_type.today()
    month_start = today.replace(day=1)
    consumed, burned = _compute_week_calories(g.current_user.id, month_start, today)
    target = g.current_user.daily_calorie_target or 0
    days = (today - month_start).days + 1
    monthly_target = target * days

    return jsonify({
        'month_start': month_start.isoformat(),
        'days_tracked': days,
        'calories_consumed': round(consumed),
        'calories_burned': round(burned),
        'calories_target': round(monthly_target),
        'calories_remaining': round(monthly_target - consumed + burned),
        'on_track': consumed <= monthly_target,
    }), 200


@progress_bp.route('/projection', methods=['GET'])
@jwt_required
def projection():
    user = g.current_user
    target = user.daily_calorie_target or 0
    bmr = user.calculate_bmr()
    factor = user.correction_factor or 1.0

    if bmr == 0 or target == 0:
        return jsonify({'error': 'Profile not complete', 'code': 'VALIDATION_ERROR'}), 400

    # Daily deficit/surplus based on target vs BMR
    daily_diff = target - bmr  # negative = deficit
    adjusted_daily_diff = daily_diff * factor

    weekly_change = (adjusted_daily_diff * 7) / CAL_PER_KG
    current_weight = user.weight or 0

    projections = []
    for weeks in [1, 2, 4]:
        projected = current_weight + (weekly_change * weeks)
        projections.append({
            'weeks': weeks,
            'projected_weight': round(projected, 2),
            'projected_change': round(weekly_change * weeks, 2),
        })

    at_goal = None
    if user.target_weight and current_weight and weekly_change != 0:
        weight_to_go = user.target_weight - current_weight
        weeks_to_goal = weight_to_go / weekly_change
        if weeks_to_goal > 0:
            at_goal = {
                'weeks': round(weeks_to_goal, 1),
                'target_weight': user.target_weight,
            }

    return jsonify({
        'current_weight': current_weight,
        'daily_calorie_target': target,
        'bmr': round(bmr),
        'correction_factor': factor,
        'weekly_projected_change_kg': round(weekly_change, 3),
        'projections': projections,
        'estimated_goal_reach': at_goal,
    }), 200


@progress_bp.route('/adjustment', methods=['GET'])
@jwt_required
def get_adjustment():
    """Calculate suggested target adjustment based on recent weekly summaries."""
    user = g.current_user

    # Get last 4 weekly summaries with actual weight data
    summaries = WeeklySummary.query.filter(
        WeeklySummary.user_id == user.id,
        WeeklySummary.actual_weight_change.isnot(None),
        WeeklySummary.predicted_weight_change.isnot(None),
    ).order_by(WeeklySummary.week_end.desc()).limit(4).all()

    if len(summaries) < 2:
        return jsonify({
            'has_suggestion': False,
            'message': 'Need at least 2 weeks of weight data to suggest adjustments.',
            'weeks_of_data': len(summaries),
        }), 200

    # Rolling average correction factor
    factors = [s.correction_factor for s in summaries if s.correction_factor]
    if not factors:
        return jsonify({'has_suggestion': False, 'message': 'Insufficient data.'}), 200

    avg_factor = sum(factors) / len(factors)
    current_target = user.daily_calorie_target or 0
    bmr = user.calculate_bmr()

    if bmr == 0 or current_target == 0:
        return jsonify({'has_suggestion': False, 'message': 'Profile not complete.'}), 200

    # Suggest new target: adjust the deficit/surplus by the correction factor
    current_diff = current_target - bmr
    adjusted_diff = current_diff / avg_factor if avg_factor != 0 else current_diff
    suggested_target = round(bmr + adjusted_diff)

    # Don't suggest if change is tiny (<50 cal)
    if abs(suggested_target - current_target) < 50:
        return jsonify({
            'has_suggestion': False,
            'message': 'Your current target is well calibrated.',
        }), 200

    # Safety floors
    if user.gender and user.gender.lower() == 'female':
        suggested_target = max(suggested_target, 1200)
    else:
        suggested_target = max(suggested_target, 1500)

    return jsonify({
        'has_suggestion': True,
        'current_target': current_target,
        'suggested_target': suggested_target,
        'correction_factor': round(avg_factor, 3),
        'weeks_of_data': len(summaries),
        'reasoning': f"Based on {len(summaries)} weeks of data, your body responds at {round(avg_factor * 100)}% of the standard estimate. Adjusting target from {current_target} to {suggested_target} cal.",
    }), 200


@progress_bp.route('/adjustment/accept', methods=['POST'])
@jwt_required
def accept_adjustment():
    data = request.get_json() or {}
    suggested_target = data.get('suggested_target')
    correction_factor = data.get('correction_factor')

    if not suggested_target:
        return jsonify({'error': 'Missing suggested_target', 'code': 'VALIDATION_ERROR'}), 400

    g.current_user.daily_calorie_target = int(suggested_target)
    if correction_factor:
        g.current_user.correction_factor = float(correction_factor)
    db.session.commit()

    return jsonify({
        'message': 'Target updated',
        'daily_calorie_target': g.current_user.daily_calorie_target,
        'correction_factor': g.current_user.correction_factor,
    }), 200


@progress_bp.route('/adjustment/reject', methods=['POST'])
@jwt_required
def reject_adjustment():
    return jsonify({'message': 'Adjustment dismissed. Will re-evaluate next week.'}), 200

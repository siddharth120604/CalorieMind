from flask import Blueprint, request, jsonify, g
from backend.extensions import db
from backend.middleware.auth import jwt_required
from backend.models.weight_log import WeightLog
from backend.models.body_metric_log import BodyMetricLog

goals_bp = Blueprint('goals', __name__)


@goals_bp.route('', methods=['GET'])
@jwt_required
def get_goals():
    user = g.current_user
    return jsonify({
        'goal': user.goal,
        'target_weight': user.target_weight,
        'target_body_fat_pct': user.target_body_fat_pct,
        'target_muscle_mass': user.target_muscle_mass,
        'target_waist_size': user.target_waist_size,
        'current_weight': user.weight,
        'initial_weight': user.initial_weight,
    }), 200


@goals_bp.route('', methods=['PUT'])
@jwt_required
def update_goals():
    data = request.get_json() or {}
    user = g.current_user

    if 'target_weight' in data:
        user.target_weight = float(data['target_weight']) if data['target_weight'] else None
    if 'target_body_fat_pct' in data:
        user.target_body_fat_pct = float(data['target_body_fat_pct']) if data['target_body_fat_pct'] else None
    if 'target_muscle_mass' in data:
        user.target_muscle_mass = float(data['target_muscle_mass']) if data['target_muscle_mass'] else None
    if 'target_waist_size' in data:
        user.target_waist_size = float(data['target_waist_size']) if data['target_waist_size'] else None

    db.session.commit()

    return jsonify({
        'message': 'Goals updated',
        'target_weight': user.target_weight,
        'target_body_fat_pct': user.target_body_fat_pct,
        'target_muscle_mass': user.target_muscle_mass,
        'target_waist_size': user.target_waist_size,
    }), 200


@goals_bp.route('/status', methods=['GET'])
@jwt_required
def goal_status():
    user = g.current_user
    status = []

    # Weight progress
    if user.target_weight and user.initial_weight:
        total_change_needed = user.target_weight - user.initial_weight
        current_change = (user.weight or user.initial_weight) - user.initial_weight
        progress_pct = (current_change / total_change_needed * 100) if total_change_needed != 0 else 100
        achieved = (total_change_needed < 0 and (user.weight or 999) <= user.target_weight) or \
                   (total_change_needed > 0 and (user.weight or 0) >= user.target_weight)
        status.append({
            'metric': 'weight',
            'target': user.target_weight,
            'current': user.weight,
            'initial': user.initial_weight,
            'progress_pct': min(max(round(progress_pct, 1), 0), 100),
            'achieved': achieved,
            'remaining': round(abs((user.weight or 0) - user.target_weight), 2),
        })

    # Body fat progress
    if user.target_body_fat_pct:
        latest = BodyMetricLog.query.filter(
            BodyMetricLog.user_id == user.id,
            BodyMetricLog.body_fat_pct.isnot(None),
        ).order_by(BodyMetricLog.date.desc()).first()
        if latest:
            status.append({
                'metric': 'body_fat_pct',
                'target': user.target_body_fat_pct,
                'current': latest.body_fat_pct,
                'achieved': latest.body_fat_pct <= user.target_body_fat_pct,
                'remaining': round(abs(latest.body_fat_pct - user.target_body_fat_pct), 2),
            })

    # Muscle mass progress
    if user.target_muscle_mass:
        latest = BodyMetricLog.query.filter(
            BodyMetricLog.user_id == user.id,
            BodyMetricLog.muscle_mass.isnot(None),
        ).order_by(BodyMetricLog.date.desc()).first()
        if latest:
            status.append({
                'metric': 'muscle_mass',
                'target': user.target_muscle_mass,
                'current': latest.muscle_mass,
                'achieved': latest.muscle_mass >= user.target_muscle_mass,
                'remaining': round(abs(latest.muscle_mass - user.target_muscle_mass), 2),
            })

    # Waist size progress
    if user.target_waist_size:
        latest = BodyMetricLog.query.filter(
            BodyMetricLog.user_id == user.id,
            BodyMetricLog.waist_size.isnot(None),
        ).order_by(BodyMetricLog.date.desc()).first()
        if latest:
            status.append({
                'metric': 'waist_size',
                'target': user.target_waist_size,
                'current': latest.waist_size,
                'achieved': latest.waist_size <= user.target_waist_size,
                'remaining': round(abs(latest.waist_size - user.target_waist_size), 2),
            })

    any_achieved = any(s['achieved'] for s in status) if status else False

    return jsonify({
        'goals': status,
        'any_achieved': any_achieved,
    }), 200

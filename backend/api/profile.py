import logging
from flask import Blueprint, request, jsonify, g
from backend.extensions import db
from backend.middleware.auth import jwt_required
from backend.services.ai_service import ai_service

logger = logging.getLogger(__name__)

profile_bp = Blueprint('profile', __name__)


@profile_bp.route('', methods=['GET'])
@jwt_required
def get_profile():
    return jsonify(g.current_user.to_dict()), 200


@profile_bp.route('', methods=['PUT'])
@jwt_required
def update_profile():
    data = request.get_json() or {}
    user = g.current_user

    name = data.get('name')
    age = data.get('age')
    gender = data.get('gender')
    weight = data.get('weight')
    height = data.get('height')
    goal = data.get('goal', 'maintain')

    if not all([name, age, gender, weight, height]):
        return jsonify({'error': 'All fields are required', 'code': 'VALIDATION_ERROR'}), 400

    try:
        user.name = name
        user.age = int(age)
        user.gender = gender
        user.weight = float(weight)
        user.height = float(height)
        user.goal = goal
        user.profile_completed = True

        # Calculate personalized calorie target via LLM
        target_data = ai_service.calculate_calorie_target({
            'age': user.age,
            'gender': user.gender,
            'weight': user.weight,
            'height': user.height,
            'bmr': round(user.calculate_bmr()),
            'goal': user.goal,
        })
        if target_data and 'daily_calorie_target' in target_data:
            user.daily_calorie_target = int(target_data['daily_calorie_target'])
        else:
            # Fallback to BMR if LLM fails
            user.daily_calorie_target = int(user.calculate_bmr())

        db.session.commit()
    except (ValueError, TypeError):
        db.session.rollback()
        return jsonify({'error': 'Invalid field values', 'code': 'VALIDATION_ERROR'}), 400

    response = {
        'message': 'Profile updated successfully',
        'user': user.to_dict(),
    }
    if target_data and 'reasoning' in target_data:
        response['calorie_reasoning'] = target_data['reasoning']

    return jsonify(response), 200

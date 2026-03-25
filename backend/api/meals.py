from datetime import datetime
from flask import Blueprint, request, jsonify, g
from backend.middleware.auth import jwt_required
from backend.services import meal_service

meals_bp = Blueprint('meals', __name__)


def _parse_date(date_str):
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else None
    except Exception:
        return None


@meals_bp.route('', methods=['GET'])
@jwt_required
def list_meals():
    date = _parse_date(request.args.get('date'))
    meals = meal_service.get_meals_for_date(g.current_user.id, date)

    meals_data = [m.to_dict() for m in meals]
    summary = {
        'total_calories': sum(m.total_calories or 0 for m in meals),
        'total_protein': sum(m.protein or 0 for m in meals),
        'total_carbs': sum(m.carbs or 0 for m in meals),
        'total_fats': sum(m.fats or 0 for m in meals),
    }

    return jsonify({'meals': meals_data, 'summary': summary, 'count': len(meals)}), 200


@meals_bp.route('', methods=['POST'])
@jwt_required
def add_meal():
    data = request.get_json() or {}
    meal_text = (data.get('meal_text') or '').strip()
    meal_type = data.get('meal_type', 'meal')

    if not meal_text:
        return jsonify({'error': 'Please enter a meal description', 'code': 'VALIDATION_ERROR'}), 400

    meal, token_usage = meal_service.create_meal(g.current_user, meal_text, meal_type)

    response = {'message': 'Meal added successfully', 'meal': meal.to_dict()}
    if token_usage and isinstance(token_usage, dict):
        usage = token_usage.get('usage')
        if usage:
            response['token_usage'] = usage

    return jsonify(response), 201


@meals_bp.route('/<int:meal_id>', methods=['GET'])
@jwt_required
def get_meal(meal_id):
    from backend.models.meal import Meal
    meal = Meal.query.filter_by(id=meal_id, user_id=g.current_user.id).first()
    if not meal:
        return jsonify({'error': 'Meal not found', 'code': 'NOT_FOUND'}), 404
    return jsonify(meal.to_dict()), 200


@meals_bp.route('/<int:meal_id>', methods=['DELETE'])
@jwt_required
def delete_meal(meal_id):
    if not meal_service.delete_meal(g.current_user.id, meal_id):
        return jsonify({'error': 'Meal not found', 'code': 'NOT_FOUND'}), 404
    return jsonify({'message': 'Meal deleted successfully'}), 200


@meals_bp.route('/<int:meal_id>/repeat', methods=['POST'])
@jwt_required
def repeat_meal(meal_id):
    new_meal = meal_service.repeat_meal(g.current_user.id, meal_id)
    if not new_meal:
        return jsonify({'error': 'Meal not found', 'code': 'NOT_FOUND'}), 404
    return jsonify({'message': 'Meal repeated successfully', 'meal': new_meal.to_dict()}), 201

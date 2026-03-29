from datetime import datetime
from flask import Blueprint, request, jsonify, g
from backend.middleware.auth import jwt_required
from backend.services import meal_plan_service

meal_plans_bp = Blueprint('meal_plans', __name__)


def _parse_date(date_str):
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else None
    except Exception:
        return None


@meal_plans_bp.route('/generate', methods=['POST'])
@jwt_required
def generate():
    data = request.get_json() or {}
    plan_date = _parse_date(data.get('date'))

    plan, error = meal_plan_service.generate_meal_plan(g.current_user, plan_date)

    if error == 'NO_INVENTORY':
        return jsonify({'error': 'No inventory items found. Add items to your inventory first.', 'code': 'VALIDATION_ERROR'}), 400
    if error == 'AI_ERROR':
        return jsonify({'error': 'Failed to generate meal plan. Please try again.', 'code': 'AI_ERROR'}), 500

    return jsonify({'message': 'Meal plan generated successfully', 'meal_plan': plan.to_dict()}), 201


@meal_plans_bp.route('', methods=['GET'])
@jwt_required
def list_plans():
    plan_date = _parse_date(request.args.get('date'))
    plans = meal_plan_service.get_meal_plans(g.current_user.id, plan_date)
    return jsonify({'meal_plans': [p.to_dict() for p in plans], 'count': len(plans)}), 200


@meal_plans_bp.route('/<int:plan_id>', methods=['GET'])
@jwt_required
def get_plan(plan_id):
    plan = meal_plan_service.get_meal_plan(g.current_user.id, plan_id)
    if not plan:
        return jsonify({'error': 'Meal plan not found', 'code': 'NOT_FOUND'}), 404
    return jsonify(plan.to_dict()), 200


@meal_plans_bp.route('/<int:plan_id>', methods=['DELETE'])
@jwt_required
def delete_plan(plan_id):
    if not meal_plan_service.delete_meal_plan(g.current_user.id, plan_id):
        return jsonify({'error': 'Meal plan not found', 'code': 'NOT_FOUND'}), 404
    return jsonify({'message': 'Meal plan deleted successfully'}), 200

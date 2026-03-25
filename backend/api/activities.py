from datetime import datetime
from flask import Blueprint, request, jsonify, g
from backend.middleware.auth import jwt_required
from backend.services import activity_service

activities_bp = Blueprint('activities', __name__)


def _parse_date(date_str):
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else None
    except Exception:
        return None


@activities_bp.route('', methods=['GET'])
@jwt_required
def list_activities():
    date = _parse_date(request.args.get('date'))
    activities = activity_service.get_activities_for_date(g.current_user.id, date)

    activities_data = [a.to_dict() for a in activities]
    summary = {
        'total_calories_burned': sum(a.calories_burned or 0 for a in activities),
        'total_duration': sum(a.duration or 0 for a in activities),
    }

    return jsonify({'activities': activities_data, 'summary': summary, 'count': len(activities)}), 200


@activities_bp.route('', methods=['POST'])
@jwt_required
def add_activity():
    data = request.get_json() or {}
    activity_text = (data.get('activity_text') or '').strip()

    if not activity_text:
        return jsonify({'error': 'Please enter an activity description', 'code': 'VALIDATION_ERROR'}), 400

    activity, token_usage = activity_service.create_activity(g.current_user, activity_text)

    response = {'message': 'Activity added successfully', 'activity': activity.to_dict()}
    if token_usage and isinstance(token_usage, dict):
        usage = token_usage.get('usage')
        if usage:
            response['token_usage'] = usage

    return jsonify(response), 201


@activities_bp.route('/<int:activity_id>', methods=['GET'])
@jwt_required
def get_activity(activity_id):
    from backend.models.activity import Activity
    activity = Activity.query.filter_by(id=activity_id, user_id=g.current_user.id).first()
    if not activity:
        return jsonify({'error': 'Activity not found', 'code': 'NOT_FOUND'}), 404
    return jsonify(activity.to_dict()), 200


@activities_bp.route('/<int:activity_id>', methods=['DELETE'])
@jwt_required
def delete_activity(activity_id):
    if not activity_service.delete_activity(g.current_user.id, activity_id):
        return jsonify({'error': 'Activity not found', 'code': 'NOT_FOUND'}), 404
    return jsonify({'message': 'Activity deleted successfully'}), 200

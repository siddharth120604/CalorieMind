from flask import Blueprint, request, jsonify, g
from backend.extensions import db
from backend.models.notification import Notification
from backend.middleware.auth import jwt_required

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('', methods=['GET'])
@jwt_required
def list_notifications():
    unread_only = request.args.get('unread_only', '').lower() in ('true', '1', 'yes')

    query = Notification.query.filter_by(recipient_id=g.current_user.id)
    if unread_only:
        query = query.filter_by(is_read=False)

    notifications = query.order_by(Notification.created_at.desc()).all()
    unread_count = Notification.query.filter_by(
        recipient_id=g.current_user.id, is_read=False,
    ).count()

    return jsonify({
        'notifications': [n.to_dict() for n in notifications],
        'unread_count': unread_count,
    }), 200


@notifications_bp.route('/<int:notification_id>/read', methods=['POST'])
@jwt_required
def mark_read(notification_id):
    n = Notification.query.filter_by(
        id=notification_id, recipient_id=g.current_user.id,
    ).first()
    if not n:
        return jsonify({'error': 'Notification not found', 'code': 'NOT_FOUND'}), 404

    n.is_read = True
    db.session.commit()
    return '', 204

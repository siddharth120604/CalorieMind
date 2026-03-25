from flask import Blueprint, jsonify, g
from backend.extensions import db
from backend.models.user import User
from backend.models.notification import Notification
from backend.middleware.auth import admin_required

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/pending', methods=['GET'])
@admin_required
def pending_users():
    pending = User.query.filter_by(role='pending').order_by(User.created_at.asc()).all()
    return jsonify({
        'pending_users': [
            {'id': u.id, 'email': u.email, 'created_at': u.created_at.isoformat() if u.created_at else None}
            for u in pending
        ],
        'count': len(pending),
    }), 200


@admin_bp.route('/approve/<int:user_id>', methods=['POST'])
@admin_required
def approve_user(user_id):
    u = User.query.get(user_id)
    if not u:
        return jsonify({'error': 'User not found', 'code': 'NOT_FOUND'}), 404

    u.role = 'user'
    db.session.commit()

    note = Notification(
        recipient_id=u.id,
        sender_id=g.current_user.id,
        message='Your account has been approved by an admin. You can now log in.',
    )
    db.session.add(note)
    db.session.commit()

    return jsonify({'message': 'User approved', 'user_id': user_id}), 200


@admin_bp.route('/reject/<int:user_id>', methods=['POST'])
@admin_required
def reject_user(user_id):
    u = User.query.get(user_id)
    if not u:
        return jsonify({'error': 'User not found', 'code': 'NOT_FOUND'}), 404

    db.session.delete(u)
    db.session.commit()
    return jsonify({'message': 'User rejected and removed', 'user_id': user_id}), 200


@admin_bp.route('/promote/<int:user_id>', methods=['POST'])
@admin_required
def promote_user(user_id):
    u = User.query.get(user_id)
    if not u:
        return jsonify({'error': 'User not found', 'code': 'NOT_FOUND'}), 404

    u.role = 'admin'
    db.session.commit()
    return jsonify({'message': 'User promoted to admin', 'user_id': user_id}), 200


@admin_bp.route('/users', methods=['GET'])
@admin_required
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({
        'users': [u.to_dict() for u in users],
        'count': len(users),
    }), 200

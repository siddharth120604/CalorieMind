from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.user import User
from backend.models.notification import Notification
from backend.services.auth_service import create_token_pair, decode_token, create_access_token
from backend.config import Config

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')
    confirm_password = data.get('confirm_password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required', 'code': 'VALIDATION_ERROR'}), 400

    if password != confirm_password:
        return jsonify({'error': 'Passwords do not match', 'code': 'VALIDATION_ERROR'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters', 'code': 'VALIDATION_ERROR'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'An account with this email already exists', 'code': 'EMAIL_EXISTS'}), 409

    user = User(email=email)
    user.set_password(password)
    user.role = 'admin' if email == Config.ADMIN_EMAIL else 'pending'
    db.session.add(user)
    db.session.commit()

    if user.role == 'pending':
        admins = User.query.filter_by(role='admin').all()
        for admin in admins:
            note = Notification(
                recipient_id=admin.id, sender_id=None,
                message=f"New user registered: {user.email}",
            )
            db.session.add(note)
        db.session.commit()

        return jsonify({
            'message': 'Account created. An admin will review your registration shortly.',
            'user': {'id': user.id, 'email': user.email, 'role': user.role},
        }), 201

    tokens = create_token_pair(user)
    return jsonify({
        'message': 'Account created successfully',
        'user': user.to_dict(),
        **tokens,
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required', 'code': 'VALIDATION_ERROR'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password', 'code': 'INVALID_CREDENTIALS'}), 401

    if user.role == 'pending':
        return jsonify({'error': 'Your account is awaiting admin approval', 'code': 'ACCOUNT_PENDING'}), 403

    tokens = create_token_pair(user)
    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict(),
        **tokens,
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Refresh token required', 'code': 'AUTH_REQUIRED'}), 401

    token = auth_header[7:]
    payload = decode_token(token)

    if payload is None or payload.get('type') != 'refresh':
        return jsonify({'error': 'Invalid or expired refresh token', 'code': 'INVALID_REFRESH_TOKEN'}), 401

    user = User.query.get(int(payload['sub']))
    if not user:
        return jsonify({'error': 'User not found', 'code': 'AUTH_REQUIRED'}), 401

    from flask import current_app
    access_token = create_access_token(user)
    return jsonify({
        'access_token': access_token,
        'token_type': 'Bearer',
        'expires_in': current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES', 3600),
    }), 200


@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({'message': 'Logged out successfully'}), 200

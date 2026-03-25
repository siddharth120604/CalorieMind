from functools import wraps
from flask import request, jsonify, g
from backend.models.user import User
from backend.services.auth_service import decode_token


def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization header required', 'code': 'AUTH_REQUIRED'}), 401

        token = auth_header[7:]
        payload = decode_token(token)
        if payload is None:
            return jsonify({'error': 'Invalid or expired token', 'code': 'TOKEN_EXPIRED'}), 401

        if payload.get('type') != 'access':
            return jsonify({'error': 'Invalid token type', 'code': 'AUTH_REQUIRED'}), 401

        user = User.query.get(int(payload['sub']))
        if not user:
            return jsonify({'error': 'User not found', 'code': 'AUTH_REQUIRED'}), 401

        if user.role == 'pending':
            return jsonify({'error': 'Account is awaiting admin approval', 'code': 'ACCOUNT_PENDING'}), 403

        g.current_user = user
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    @jwt_required
    def decorated(*args, **kwargs):
        if g.current_user.role != 'admin':
            return jsonify({'error': 'Admin access required', 'code': 'FORBIDDEN'}), 403
        return f(*args, **kwargs)
    return decorated

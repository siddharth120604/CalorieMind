import jwt
import time
from flask import current_app


def create_access_token(user):
    config = current_app.config
    now = int(time.time())
    payload = {
        'sub': str(user.id),
        'email': user.email,
        'role': user.role,
        'type': 'access',
        'iat': now,
        'exp': now + config.get('JWT_ACCESS_TOKEN_EXPIRES', 3600),
    }
    return jwt.encode(payload, config['JWT_SECRET_KEY'], algorithm='HS256')


def create_refresh_token(user):
    config = current_app.config
    now = int(time.time())
    payload = {
        'sub': str(user.id),
        'type': 'refresh',
        'iat': now,
        'exp': now + config.get('JWT_REFRESH_TOKEN_EXPIRES', 2592000),
    }
    return jwt.encode(payload, config['JWT_SECRET_KEY'], algorithm='HS256')


def decode_token(token):
    try:
        return jwt.decode(
            token,
            current_app.config['JWT_SECRET_KEY'],
            algorithms=['HS256'],
        )
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def create_token_pair(user):
    return {
        'access_token': create_access_token(user),
        'refresh_token': create_refresh_token(user),
        'token_type': 'Bearer',
        'expires_in': current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES', 3600),
    }

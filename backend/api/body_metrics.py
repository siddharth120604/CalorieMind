from datetime import datetime, timedelta, date as date_type
from flask import Blueprint, request, jsonify, g
from backend.extensions import db
from backend.middleware.auth import jwt_required
from backend.models.body_metric_log import BodyMetricLog

body_metrics_bp = Blueprint('body_metrics', __name__)


@body_metrics_bp.route('', methods=['POST'])
@jwt_required
def log_body_metrics():
    data = request.get_json() or {}
    body_fat_pct = data.get('body_fat_pct')
    muscle_mass = data.get('muscle_mass')
    waist_size = data.get('waist_size')
    date_str = data.get('date')

    if not any([body_fat_pct, muscle_mass, waist_size]):
        return jsonify({'error': 'At least one metric is required', 'code': 'VALIDATION_ERROR'}), 400

    log_date = date_type.today()
    if date_str:
        try:
            log_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            pass

    entry = BodyMetricLog(
        user_id=g.current_user.id,
        body_fat_pct=float(body_fat_pct) if body_fat_pct else None,
        muscle_mass=float(muscle_mass) if muscle_mass else None,
        waist_size=float(waist_size) if waist_size else None,
        date=log_date,
    )
    db.session.add(entry)
    db.session.commit()

    return jsonify({'message': 'Body metrics logged', 'body_metric': entry.to_dict()}), 201


@body_metrics_bp.route('', methods=['GET'])
@jwt_required
def get_body_metrics():
    days = request.args.get('days', 90, type=int)
    since = date_type.today() - timedelta(days=days)

    logs = BodyMetricLog.query.filter(
        BodyMetricLog.user_id == g.current_user.id,
        BodyMetricLog.date >= since,
    ).order_by(BodyMetricLog.date.asc()).all()

    return jsonify({
        'logs': [l.to_dict() for l in logs],
        'count': len(logs),
    }), 200

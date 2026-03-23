from datetime import datetime, timedelta, date as date_type
from flask import Blueprint, request, jsonify, g
from backend.extensions import db
from backend.middleware.auth import jwt_required
from backend.models.weight_log import WeightLog

weight_bp = Blueprint('weight', __name__)


@weight_bp.route('', methods=['POST'])
@jwt_required
def log_weight():
    data = request.get_json() or {}
    weight = data.get('weight')
    date_str = data.get('date')
    notes = (data.get('notes') or '').strip() or None

    if not weight:
        return jsonify({'error': 'Weight is required', 'code': 'VALIDATION_ERROR'}), 400

    try:
        weight = float(weight)
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid weight value', 'code': 'VALIDATION_ERROR'}), 400

    log_date = date_type.today()
    if date_str:
        try:
            log_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            pass

    # Upsert: replace if same user+date
    existing = WeightLog.query.filter_by(user_id=g.current_user.id, date=log_date).first()
    if existing:
        existing.weight = weight
        existing.notes = notes
    else:
        entry = WeightLog(user_id=g.current_user.id, weight=weight, notes=notes, date=log_date)
        db.session.add(entry)

    # Set initial_weight if first log
    if not g.current_user.initial_weight:
        g.current_user.initial_weight = weight

    # Update current weight on user profile
    g.current_user.weight = weight

    db.session.commit()

    log_entry = existing or entry
    return jsonify({'message': 'Weight logged', 'weight_log': log_entry.to_dict()}), 201


@weight_bp.route('', methods=['GET'])
@jwt_required
def get_weight_history():
    days = request.args.get('days', 30, type=int)
    since = date_type.today() - timedelta(days=days)

    logs = WeightLog.query.filter(
        WeightLog.user_id == g.current_user.id,
        WeightLog.date >= since,
    ).order_by(WeightLog.date.asc()).all()

    return jsonify({
        'logs': [l.to_dict() for l in logs],
        'count': len(logs),
    }), 200


@weight_bp.route('/trend', methods=['GET'])
@jwt_required
def get_weight_trend():
    """Get 7-day moving average trend."""
    days = request.args.get('days', 30, type=int)
    since = date_type.today() - timedelta(days=days + 7)  # extra 7 days for moving avg

    logs = WeightLog.query.filter(
        WeightLog.user_id == g.current_user.id,
        WeightLog.date >= since,
    ).order_by(WeightLog.date.asc()).all()

    # Build date→weight map
    weight_map = {l.date: l.weight for l in logs}

    # Calculate 7-day moving average
    trend = []
    target_since = date_type.today() - timedelta(days=days)
    current = target_since
    today = date_type.today()

    while current <= today:
        window = []
        for i in range(7):
            d = current - timedelta(days=i)
            if d in weight_map:
                window.append(weight_map[d])
        if window:
            trend.append({
                'date': current.isoformat(),
                'avg_weight': round(sum(window) / len(window), 2),
                'raw_weight': weight_map.get(current),
            })
        current += timedelta(days=1)

    return jsonify({'trend': trend}), 200

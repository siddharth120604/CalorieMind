from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, g
from backend.middleware.auth import jwt_required
from backend.services import report_service, summary_service, meal_service, activity_service, export_service

reports_bp = Blueprint('reports', __name__)


def _parse_date(date_str):
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else None
    except Exception:
        return None


def _serialize_summary(summary):
    """Make summary JSON-serializable (convert date objects to strings)."""
    s = dict(summary)
    if 'date' in s and hasattr(s['date'], 'isoformat'):
        s['date'] = s['date'].isoformat()
    return s


@reports_bp.route('/daily', methods=['GET'])
@jwt_required
def daily_summary():
    date = _parse_date(request.args.get('date'))
    summary = summary_service.get_daily_summary(g.current_user.id, date)
    return jsonify(_serialize_summary(summary)), 200


@reports_bp.route('/daily/view', methods=['GET'])
@jwt_required
def daily_view():
    date = _parse_date(request.args.get('date'))
    summary = summary_service.get_daily_summary(g.current_user.id, date)
    meals = meal_service.get_meals_for_date(g.current_user.id, date)
    activities = activity_service.get_activities_for_date(g.current_user.id, date)

    # Find saved report for the date
    from backend.models.daily_report import DailyReport
    from backend.utils.timezone import get_day_boundaries_utc, get_ist_today
    report_date = date or get_ist_today()
    start, end = get_day_boundaries_utc(report_date)

    report = DailyReport.query.filter(
        DailyReport.user_id == g.current_user.id,
        DailyReport.date >= start,
        DailyReport.date < end,
    ).order_by(DailyReport.created_at.desc()).first()

    return jsonify({
        'summary': _serialize_summary(summary),
        'meals': [m.to_dict() for m in meals],
        'activities': [a.to_dict() for a in activities],
        'report': report.to_dict() if report else None,
    }), 200


@reports_bp.route('/daily/generate', methods=['POST'])
@jwt_required
def generate_report():
    data = request.get_json() or {}
    date = _parse_date(data.get('date'))

    report, token_usage = report_service.generate_daily_report(g.current_user, date)
    if not report:
        return jsonify({'error': 'Failed to generate report. Try again later.', 'code': 'AI_ERROR'}), 500

    response = {'message': 'Daily report generated and saved', 'report': report.to_dict()}
    if token_usage and isinstance(token_usage, dict):
        usage = token_usage.get('usage')
        if usage:
            response['token_usage'] = usage

    return jsonify(response), 201


@reports_bp.route('/weekly', methods=['GET'])
@jwt_required
def weekly_data():
    date = _parse_date(request.args.get('end_date'))
    data = summary_service.get_weekly_data(g.current_user.id, date)

    return jsonify({
        'dates': [day['date'].strftime('%Y-%m-%d') for day in data],
        'calories_consumed': [day['calories_consumed'] for day in data],
        'calories_burned': [day['calories_burned'] for day in data],
        'net_calories': [day['net_calories'] for day in data],
    }), 200


@reports_bp.route('/monthly', methods=['GET'])
@jwt_required
def monthly_data():
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)
    data = summary_service.get_monthly_data(g.current_user.id, year, month)

    return jsonify({
        'dates': [day['date'].strftime('%Y-%m-%d') for day in data],
        'calories_consumed': [day['calories_consumed'] for day in data],
        'calories_burned': [day['calories_burned'] for day in data],
        'net_calories': [day['net_calories'] for day in data],
    }), 200


@reports_bp.route('/export', methods=['POST'])
@jwt_required
def export_data():
    data = request.get_json() or {}
    start_str = data.get('start_date')
    end_str = data.get('end_date')
    fmt = data.get('format', 'csv')

    if not start_str or not end_str:
        return jsonify({'error': 'start_date and end_date are required', 'code': 'VALIDATION_ERROR'}), 400

    start_date = _parse_date(start_str)
    end_date = _parse_date(end_str)
    if not start_date or not end_date:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD', 'code': 'VALIDATION_ERROR'}), 400

    if end_date < start_date:
        return jsonify({'error': 'end_date must be >= start_date', 'code': 'VALIDATION_ERROR'}), 400

    if (end_date - start_date).days > 90:
        return jsonify({'error': 'Maximum date range is 90 days', 'code': 'VALIDATION_ERROR'}), 400

    if fmt not in ('csv', 'txt'):
        return jsonify({'error': 'format must be csv or txt', 'code': 'VALIDATION_ERROR'}), 400

    try:
        result = export_service.export_data(g.current_user, start_date, end_date, fmt)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': f'Export failed: {str(e)}', 'code': 'EXPORT_ERROR'}), 500


@reports_bp.route('', methods=['GET'])
@jwt_required
def list_reports():
    reports = report_service.get_reports(g.current_user.id)
    return jsonify({
        'reports': [r.to_dict() for r in reports],
        'count': len(reports),
    }), 200


@reports_bp.route('/<int:report_id>', methods=['GET'])
@jwt_required
def get_report(report_id):
    report = report_service.get_report_by_id(g.current_user.id, report_id)
    if not report:
        return jsonify({'error': 'Report not found', 'code': 'NOT_FOUND'}), 404

    report_date = report.date.date()
    summary = summary_service.get_daily_summary(g.current_user.id, report_date)
    meals = meal_service.get_meals_for_date(g.current_user.id, report_date)
    activities = activity_service.get_activities_for_date(g.current_user.id, report_date)

    return jsonify({
        'report': report.to_dict(),
        'summary': _serialize_summary(summary),
        'meals': [m.to_dict() for m in meals],
        'activities': [a.to_dict() for a in activities],
    }), 200

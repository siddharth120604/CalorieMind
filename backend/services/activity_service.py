import logging
from backend.extensions import db
from backend.models.activity import Activity
from backend.services.ai_service import ai_service
from backend.utils.timezone import get_day_boundaries_utc, get_ist_today

logger = logging.getLogger(__name__)


def _log_token_usage(action, user):
    last = ai_service.pop_last_usage()
    if not last:
        return
    usage = last.get('usage')
    who = user.email if user else 'unknown'
    if usage:
        parts = []
        if usage.get('total_tokens') is not None:
            parts.append(f"total {usage['total_tokens']}")
        if usage.get('input_tokens') is not None:
            parts.append(f"in {usage['input_tokens']}")
        if usage.get('output_tokens') is not None:
            parts.append(f"out {usage['output_tokens']}")
        logger.info("AI tokens %s user=%s Tokens: %s", action, who, ", ".join(parts))
    else:
        logger.info("AI tokens %s user=%s unavailable", action, who)


def get_activities_for_date(user_id, date=None):
    if date is None:
        date = get_ist_today()
    start, end = get_day_boundaries_utc(date)
    return Activity.query.filter(
        Activity.user_id == user_id,
        Activity.timestamp >= start,
        Activity.timestamp < end,
    ).order_by(Activity.timestamp.desc()).all()


def create_activity(user, activity_text):
    parsed_data = ai_service.parse_activity(
        activity_text, user.weight, user.age, user.gender
    )
    _log_token_usage('parse_activity', user)

    activity = Activity(
        user_id=user.id,
        activity_text=activity_text,
        parsed_data=parsed_data,
        activity_type=parsed_data.get('activity_type', 'other'),
        duration=parsed_data.get('total_duration', 0),
        intensity=parsed_data.get('intensity', 'moderate'),
        calories_burned=parsed_data.get('total_calories', 0),
    )

    db.session.add(activity)
    db.session.commit()

    token_usage = ai_service.pop_last_usage()
    return activity, token_usage


def delete_activity(user_id, activity_id):
    activity = Activity.query.filter_by(id=activity_id, user_id=user_id).first()
    if not activity:
        return False
    db.session.delete(activity)
    db.session.commit()
    return True

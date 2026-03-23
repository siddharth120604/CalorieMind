import logging
from backend.extensions import db
from backend.models.meal import Meal
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


def get_meals_for_date(user_id, date=None):
    if date is None:
        date = get_ist_today()
    start, end = get_day_boundaries_utc(date)
    return Meal.query.filter(
        Meal.user_id == user_id,
        Meal.timestamp >= start,
        Meal.timestamp < end,
    ).order_by(Meal.timestamp.desc()).all()


def create_meal(user, meal_text, meal_type='meal'):
    parsed_data = ai_service.parse_meal(meal_text)
    _log_token_usage('parse_meal', user)

    meal = Meal(
        user_id=user.id,
        meal_text=meal_text,
        parsed_data=parsed_data,
        total_calories=parsed_data.get('total_calories', 0),
        protein=parsed_data.get('total_protein', 0),
        carbs=parsed_data.get('total_carbs', 0),
        fats=parsed_data.get('total_fats', 0),
        fiber=parsed_data.get('total_fiber', 0),
        sugar=parsed_data.get('total_sugar', 0),
        sodium=parsed_data.get('total_sodium', 0),
        meal_type=parsed_data.get('meal_type', meal_type),
    )

    db.session.add(meal)
    db.session.commit()

    token_usage = ai_service.pop_last_usage()
    return meal, token_usage


def delete_meal(user_id, meal_id):
    meal = Meal.query.filter_by(id=meal_id, user_id=user_id).first()
    if not meal:
        return False
    db.session.delete(meal)
    db.session.commit()
    return True


def repeat_meal(user_id, meal_id):
    orig = Meal.query.filter_by(id=meal_id, user_id=user_id).first()
    if not orig:
        return None

    new_meal = Meal(
        user_id=orig.user_id,
        meal_text=orig.meal_text,
        parsed_data=orig.parsed_data,
        total_calories=orig.total_calories,
        protein=orig.protein,
        carbs=orig.carbs,
        fats=orig.fats,
        fiber=orig.fiber,
        sugar=orig.sugar,
        sodium=orig.sodium,
        meal_type=orig.meal_type,
    )
    db.session.add(new_meal)
    db.session.commit()
    return new_meal

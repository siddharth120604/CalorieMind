import logging
from datetime import date
from backend.extensions import db
from backend.models.meal_plan import MealPlan
from backend.models.inventory_item import InventoryItem
from backend.services.ai_service import ai_service

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


def generate_meal_plan(user, plan_date=None):
    if plan_date is None:
        plan_date = date.today()

    items = InventoryItem.query.filter_by(user_id=user.id).all()
    if not items:
        return None, 'NO_INVENTORY'

    inventory_list = []
    for item in items:
        inventory_list.append({
            'name': item.name,
            'quantity': item.quantity,
            'category': item.category,
            'calories': item.calories,
            'protein': item.protein,
            'carbs': item.carbs,
            'fats': item.fats,
            'fiber': item.fiber,
            'serving_size': item.serving_size,
        })

    user_profile = {
        'name': user.name,
        'weight': user.weight,
        'height': user.height,
        'age': user.age,
        'gender': user.gender,
        'goal': user.goal,
        'bmr': user.calculate_bmr(),
        'daily_calorie_target': user.daily_calorie_target,
    }

    daily_target = user.daily_calorie_target or round(user.calculate_bmr())

    plan_data = ai_service.generate_meal_plan(user_profile, inventory_list, daily_target)
    _log_token_usage('generate_meal_plan', user)

    if not plan_data:
        return None, 'AI_ERROR'

    total_calories = sum(m.get('total_calories', 0) for m in plan_data.get('meals', []))
    total_protein = sum(m.get('total_protein', 0) for m in plan_data.get('meals', []))
    total_carbs = sum(m.get('total_carbs', 0) for m in plan_data.get('meals', []))
    total_fats = sum(m.get('total_fats', 0) for m in plan_data.get('meals', []))

    existing = MealPlan.query.filter_by(user_id=user.id, date=plan_date).first()
    if existing:
        existing.plan_data = plan_data
        existing.total_calories = total_calories
        existing.total_protein = total_protein
        existing.total_carbs = total_carbs
        existing.total_fats = total_fats
        db.session.commit()
        return existing, None
    else:
        meal_plan = MealPlan(
            user_id=user.id,
            date=plan_date,
            plan_data=plan_data,
            total_calories=total_calories,
            total_protein=total_protein,
            total_carbs=total_carbs,
            total_fats=total_fats,
        )
        db.session.add(meal_plan)
        db.session.commit()
        return meal_plan, None


def get_meal_plans(user_id, plan_date=None):
    query = MealPlan.query.filter_by(user_id=user_id)
    if plan_date:
        query = query.filter_by(date=plan_date)
    return query.order_by(MealPlan.date.desc()).all()


def get_meal_plan(user_id, plan_id):
    return MealPlan.query.filter_by(id=plan_id, user_id=user_id).first()


def delete_meal_plan(user_id, plan_id):
    plan = MealPlan.query.filter_by(id=plan_id, user_id=user_id).first()
    if not plan:
        return False
    db.session.delete(plan)
    db.session.commit()
    return True

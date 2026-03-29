import logging
from backend.extensions import db
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


def get_inventory(user_id):
    return InventoryItem.query.filter_by(user_id=user_id).order_by(InventoryItem.created_at.desc()).all()


def add_item(user, name, quantity):
    parsed = ai_service.parse_inventory_item(name, quantity)
    _log_token_usage('parse_inventory_item', user)

    item = InventoryItem(
        user_id=user.id,
        name=name,
        quantity=quantity,
        category=parsed.get('category', 'other'),
        calories=parsed.get('calories'),
        protein=parsed.get('protein'),
        carbs=parsed.get('carbs'),
        fats=parsed.get('fats'),
        fiber=parsed.get('fiber'),
        serving_size=parsed.get('serving_size'),
    )

    db.session.add(item)
    db.session.commit()

    token_usage = ai_service.pop_last_usage()
    return item, token_usage


def delete_item(user_id, item_id):
    item = InventoryItem.query.filter_by(id=item_id, user_id=user_id).first()
    if not item:
        return False
    db.session.delete(item)
    db.session.commit()
    return True

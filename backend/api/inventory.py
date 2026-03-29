from flask import Blueprint, request, jsonify, g
from backend.middleware.auth import jwt_required
from backend.services import inventory_service

inventory_bp = Blueprint('inventory', __name__)


@inventory_bp.route('', methods=['GET'])
@jwt_required
def list_items():
    items = inventory_service.get_inventory(g.current_user.id)
    return jsonify({'items': [i.to_dict() for i in items], 'count': len(items)}), 200


@inventory_bp.route('', methods=['POST'])
@jwt_required
def add_item():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    quantity = (data.get('quantity') or '').strip()

    if not name:
        return jsonify({'error': 'Item name is required', 'code': 'VALIDATION_ERROR'}), 400
    if not quantity:
        return jsonify({'error': 'Quantity is required', 'code': 'VALIDATION_ERROR'}), 400

    item, token_usage = inventory_service.add_item(g.current_user, name, quantity)

    response = {'message': 'Item added successfully', 'item': item.to_dict()}
    if token_usage and isinstance(token_usage, dict):
        usage = token_usage.get('usage')
        if usage:
            response['token_usage'] = usage

    return jsonify(response), 201


@inventory_bp.route('/<int:item_id>', methods=['DELETE'])
@jwt_required
def delete_item(item_id):
    if not inventory_service.delete_item(g.current_user.id, item_id):
        return jsonify({'error': 'Item not found', 'code': 'NOT_FOUND'}), 404
    return jsonify({'message': 'Item deleted successfully'}), 200

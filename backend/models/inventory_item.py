from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from backend.extensions import db


class InventoryItem(db.Model):
    __tablename__ = 'inventory_items'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, db.ForeignKey('users.id'), nullable=False)
    name = Column(String(200), nullable=False)
    quantity = Column(String(100), nullable=False)
    category = Column(String(50), default='other')
    calories = Column(Float, nullable=True)
    protein = Column(Float, nullable=True)
    carbs = Column(Float, nullable=True)
    fats = Column(Float, nullable=True)
    fiber = Column(Float, nullable=True)
    serving_size = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'quantity': self.quantity,
            'category': self.category,
            'calories': self.calories,
            'protein': self.protein,
            'carbs': self.carbs,
            'fats': self.fats,
            'fiber': self.fiber,
            'serving_size': self.serving_size,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

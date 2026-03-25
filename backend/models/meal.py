from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
from backend.extensions import db


class Meal(db.Model):
    __tablename__ = 'meals'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, db.ForeignKey('users.id'), nullable=False)
    meal_text = Column(Text, nullable=False)
    parsed_data = Column(JSON)
    total_calories = Column(Float, default=0)
    protein = Column(Float, default=0)
    carbs = Column(Float, default=0)
    fats = Column(Float, default=0)
    fiber = Column(Float, default=0)
    sugar = Column(Float, default=0)
    sodium = Column(Float, default=0)
    meal_type = Column(String(20), default='meal')
    timestamp = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'meal_text': self.meal_text,
            'parsed_data': self.parsed_data,
            'total_calories': self.total_calories,
            'protein': self.protein,
            'carbs': self.carbs,
            'fats': self.fats,
            'fiber': self.fiber,
            'sugar': self.sugar,
            'sodium': self.sodium,
            'meal_type': self.meal_type,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
        }

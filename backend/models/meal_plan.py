from datetime import datetime
from sqlalchemy import Column, Integer, Float, Date, DateTime, Text, JSON
from backend.extensions import db


class MealPlan(db.Model):
    __tablename__ = 'meal_plans'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, db.ForeignKey('users.id'), nullable=False)
    date = Column(Date, nullable=False)
    plan_data = Column(JSON, nullable=False)
    total_calories = Column(Float, default=0)
    total_protein = Column(Float, default=0)
    total_carbs = Column(Float, default=0)
    total_fats = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'date': self.date.isoformat() if self.date else None,
            'plan_data': self.plan_data,
            'total_calories': self.total_calories,
            'total_protein': self.total_protein,
            'total_carbs': self.total_carbs,
            'total_fats': self.total_fats,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

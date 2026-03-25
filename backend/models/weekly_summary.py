from datetime import datetime
from sqlalchemy import Column, Integer, Float, Date, DateTime
from backend.extensions import db


class WeeklySummary(db.Model):
    __tablename__ = 'weekly_summaries'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, db.ForeignKey('users.id'), nullable=False)
    week_start = Column(Date, nullable=False)
    week_end = Column(Date, nullable=False)
    avg_weight = Column(Float, nullable=True)
    calories_consumed = Column(Float, default=0)
    calories_target = Column(Float, default=0)
    calories_burned = Column(Float, default=0)
    predicted_weight_change = Column(Float, nullable=True)
    actual_weight_change = Column(Float, nullable=True)
    correction_factor = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('weekly_summaries', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'week_start': self.week_start.isoformat() if self.week_start else None,
            'week_end': self.week_end.isoformat() if self.week_end else None,
            'avg_weight': self.avg_weight,
            'calories_consumed': self.calories_consumed,
            'calories_target': self.calories_target,
            'calories_burned': self.calories_burned,
            'predicted_weight_change': self.predicted_weight_change,
            'actual_weight_change': self.actual_weight_change,
            'correction_factor': self.correction_factor,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

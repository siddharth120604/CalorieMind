from datetime import datetime, date as date_type
from sqlalchemy import Column, Integer, Float, Date, DateTime, Text
from backend.extensions import db


class WeightLog(db.Model):
    __tablename__ = 'weight_logs'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, db.ForeignKey('users.id'), nullable=False)
    weight = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    date = Column(Date, nullable=False, default=date_type.today)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('weight_logs', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'weight': self.weight,
            'notes': self.notes,
            'date': self.date.isoformat() if self.date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

from datetime import datetime, date as date_type
from sqlalchemy import Column, Integer, Float, Date, DateTime
from backend.extensions import db


class BodyMetricLog(db.Model):
    __tablename__ = 'body_metric_logs'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, db.ForeignKey('users.id'), nullable=False)
    body_fat_pct = Column(Float, nullable=True)
    muscle_mass = Column(Float, nullable=True)
    waist_size = Column(Float, nullable=True)
    date = Column(Date, nullable=False, default=date_type.today)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('body_metric_logs', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'body_fat_pct': self.body_fat_pct,
            'muscle_mass': self.muscle_mass,
            'waist_size': self.waist_size,
            'date': self.date.isoformat() if self.date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, Text
from backend.extensions import db


class DailyReport(db.Model):
    __tablename__ = 'daily_reports'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, db.ForeignKey('users.id'), nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    overview = Column(Text)
    advice = Column(Text)
    concerns = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'date': self.date.isoformat() if self.date else None,
            'overview': self.overview,
            'advice': self.advice,
            'concerns': self.concerns,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
from backend.extensions import db


class Activity(db.Model):
    __tablename__ = 'activities'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, db.ForeignKey('users.id'), nullable=False)
    activity_text = Column(Text, nullable=False)
    parsed_data = Column(JSON)
    activity_type = Column(String(50))
    duration = Column(Float)
    intensity = Column(String(20))
    calories_burned = Column(Float, default=0)
    timestamp = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'activity_text': self.activity_text,
            'parsed_data': self.parsed_data,
            'activity_type': self.activity_type,
            'duration': self.duration,
            'intensity': self.intensity,
            'calories_burned': self.calories_burned,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
        }

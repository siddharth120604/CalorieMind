from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, Text
from backend.extensions import db


class Notification(db.Model):
    __tablename__ = 'notifications'

    id = Column(Integer, primary_key=True)
    recipient_id = Column(Integer, db.ForeignKey('users.id'), nullable=False)
    sender_id = Column(Integer, db.ForeignKey('users.id'), nullable=True)
    message = Column(Text, nullable=False)
    is_read = Column(db.Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    recipient = db.relationship('User', foreign_keys=[recipient_id], backref='notifications')
    sender = db.relationship('User', foreign_keys=[sender_id])

    def to_dict(self):
        return {
            'id': self.id,
            'recipient_id': self.recipient_id,
            'sender_id': self.sender_id,
            'message': self.message,
            'is_read': self.is_read,
            'sender_email': self.sender.email if self.sender else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from werkzeug.security import generate_password_hash, check_password_hash
from backend.extensions import db


class User(db.Model):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String(10), nullable=True)
    weight = Column(Float, nullable=True)
    height = Column(Float, nullable=True)
    goal = Column(String(200), default='maintain')
    daily_calorie_target = Column(Integer, nullable=True)
    correction_factor = Column(Float, default=1.0)
    initial_weight = Column(Float, nullable=True)
    target_weight = Column(Float, nullable=True)
    target_body_fat_pct = Column(Float, nullable=True)
    target_muscle_mass = Column(Float, nullable=True)
    target_waist_size = Column(Float, nullable=True)
    profile_completed = Column(db.Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    role = Column(String(20), default='pending')

    meals = db.relationship('Meal', backref='user', lazy=True, cascade='all, delete-orphan')
    activities = db.relationship('Activity', backref='user', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def calculate_bmr(self):
        if not all([self.weight, self.height, self.age, self.gender]):
            return 0
        if self.gender.lower() == 'male':
            return 10 * self.weight + 6.25 * self.height - 5 * self.age + 5
        else:
            return 10 * self.weight + 6.25 * self.height - 5 * self.age - 161

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'age': self.age,
            'gender': self.gender,
            'weight': self.weight,
            'height': self.height,
            'goal': self.goal,
            'profile_completed': self.profile_completed,
            'role': self.role,
            'bmr': self.calculate_bmr(),
            'daily_calorie_target': self.daily_calorie_target,
            'correction_factor': self.correction_factor,
            'initial_weight': self.initial_weight,
            'target_weight': self.target_weight,
            'target_body_fat_pct': self.target_body_fat_pct,
            'target_muscle_mass': self.target_muscle_mass,
            'target_waist_size': self.target_waist_size,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

from app import db
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String(10), nullable=True)  # 'male' or 'female'
    weight = Column(Float, nullable=True)  # in kg
    height = Column(Float, nullable=True)  # in cm
    activity_level = Column(String(20), default='moderate')  # sedentary, light, moderate, active, very_active
    goal = Column(String(200), default='maintain')  # free-text goal
    profile_completed = Column(db.Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    role = Column(String(20), default='pending')
    
    # Relationships
    meals = db.relationship('Meal', backref='user', lazy=True, cascade='all, delete-orphan')
    activities = db.relationship('Activity', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        return check_password_hash(self.password_hash, password)
    
    def calculate_bmr(self):
        """Calculate Basal Metabolic Rate using Mifflin-St Jeor Equation"""
        if not all([self.weight, self.height, self.age, self.gender]):
            return 0
        if self.gender.lower() == 'male':
            return 10 * self.weight + 6.25 * self.height - 5 * self.age + 5
        else:
            return 10 * self.weight + 6.25 * self.height - 5 * self.age - 161
    
    def calculate_tdee(self):
        """Calculate Total Daily Energy Expenditure"""
        bmr = self.calculate_bmr()
        if bmr == 0:
            return 0
        activity_multipliers = {
            'sedentary': 1.2,
            'light': 1.375,
            'moderate': 1.55,
            'active': 1.725,
            'very_active': 1.9
        }
        return bmr * activity_multipliers.get(self.activity_level, 1.55)

class Meal(db.Model):
    __tablename__ = 'meals'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, db.ForeignKey('users.id'), nullable=False)
    meal_text = Column(Text, nullable=False)  # Original user input
    parsed_data = Column(JSON)  # AI parsed meal data
    total_calories = Column(Float, default=0)
    protein = Column(Float, default=0)  # in grams
    carbs = Column(Float, default=0)  # in grams
    fats = Column(Float, default=0)  # in grams
    fiber = Column(Float, default=0)  # in grams
    sugar = Column(Float, default=0)  # in grams
    sodium = Column(Float, default=0)  # in mg
    meal_type = Column(String(20), default='meal')  # breakfast, lunch, dinner, snack, meal
    timestamp = Column(DateTime, default=datetime.utcnow)

class Activity(db.Model):
    __tablename__ = 'activities'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, db.ForeignKey('users.id'), nullable=False)
    activity_text = Column(Text, nullable=False)  # Original user input
    parsed_data = Column(JSON)  # AI parsed activity data
    activity_type = Column(String(50))  # swimming, running, weightlifting, etc.
    duration = Column(Float)  # in minutes
    intensity = Column(String(20))  # low, moderate, high
    calories_burned = Column(Float, default=0)
    timestamp = Column(DateTime, default=datetime.utcnow)


class DailyReport(db.Model):
    __tablename__ = 'daily_reports'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, db.ForeignKey('users.id'), nullable=False)
    date = Column(DateTime, default=datetime.utcnow)  # store date of report (UTC)
    overview = Column(Text)
    advice = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


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

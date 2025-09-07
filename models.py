from app import db
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON

class User(db.Model):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(10), nullable=False)  # 'male' or 'female'
    weight = Column(Float, nullable=False)  # in kg
    height = Column(Float, nullable=False)  # in cm
    activity_level = Column(String(20), default='moderate')  # sedentary, light, moderate, active, very_active
    goal = Column(String(200), default='maintain')  # free-text goal
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    meals = db.relationship('Meal', backref='user', lazy=True, cascade='all, delete-orphan')
    activities = db.relationship('Activity', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def calculate_bmr(self):
        """Calculate Basal Metabolic Rate using Mifflin-St Jeor Equation"""
        if self.gender.lower() == 'male':
            return 10 * self.weight + 6.25 * self.height - 5 * self.age + 5
        else:
            return 10 * self.weight + 6.25 * self.height - 5 * self.age - 161
    
    def calculate_tdee(self):
        """Calculate Total Daily Energy Expenditure"""
        bmr = self.calculate_bmr()
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

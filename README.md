# Calorie Tracker - AI-Powered Nutrition & Fitness App

A comprehensive web-based calorie tracking and activity management application built with Flask, PostgreSQL, and AI-powered meal/activity parsing using ChatGroq.

## Features

### 🍎 Intelligent Meal Tracking
- **Natural Language Input**: Describe meals in plain English (e.g., "2 boiled eggs, 1 slice whole wheat toast")
- **AI-Powered Analysis**: ChatGroq automatically extracts nutrition information
- **Comprehensive Nutrition Data**: Track calories, macros (protein, carbs, fats), and micronutrients
- **Meal History**: View detailed logs with timestamps and nutrition breakdowns

### 🏃 Smart Activity Logging
- **Flexible Activity Input**: Log workouts using natural descriptions
- **Personalized Calorie Burn**: Calculations based on your age, weight, and gender
- **Activity Analysis**: AI extracts exercise type, duration, and intensity
- **Progress Tracking**: Monitor calories burned and workout consistency

### 📊 Interactive Dashboards
- **Real-time Charts**: Weekly trends and daily progress visualization
- **Macro Distribution**: Pie charts showing protein/carb/fat ratios
- **Progress Tracking**: Visual progress bars and goal monitoring
- **Summary Cards**: Quick overview of daily calories and activities

### 👤 Personal Profile Management
- **Comprehensive Profile**: Age, gender, weight, height, activity level
- **Metabolic Calculations**: Automatic BMR and TDEE calculations
- **BMI Tracking**: Body Mass Index monitoring
- **Personalized Goals**: Tailored calorie recommendations

## Technology Stack

### Backend
- **Flask**: Python web framework
- **PostgreSQL**: Robust database for data persistence
- **SQLAlchemy**: Object-relational mapping
- **ChatGroq**: AI-powered natural language processing
- **LangChain**: Framework for LLM integration

### Frontend
- **Bootstrap 5**: Responsive UI framework with dark theme
- **Chart.js**: Interactive data visualization
- **Vanilla JavaScript**: Client-side functionality
- **Font Awesome**: Icon library

## Installation & Setup

### Prerequisites
- Python 3.8+
- PostgreSQL 12+
- Git

### 1. Clone the Repository
```bash
git clone <repository-url>
cd calorie-tracker

# Overview

A comprehensive web-based calorie tracking and activity management application that leverages AI to intelligently parse meal descriptions and activity logs into structured nutrition and fitness data. The app provides users with detailed dashboards, progress tracking, and personalized metabolic calculations to help them manage their health and fitness goals.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Application Framework
The application follows a traditional Flask MVC architecture with clear separation of concerns:
- **Flask**: Serves as the main web framework providing routing, templating, and request handling
- **SQLAlchemy**: Handles database operations with ORM patterns for clean data modeling
- **Blueprint-based routing**: Organizes endpoints logically with a main blueprint handling all primary routes

## Database Design
**PostgreSQL** serves as the primary data store with three core entities:
- **Users**: Stores profile information (age, gender, weight, height, activity level) used for metabolic calculations
- **Meals**: Records meal descriptions, AI-parsed nutrition data, and timestamps
- **Activities**: Logs activity descriptions, parsed exercise data, and calculated calorie burns

The schema supports JSON storage for flexible AI-parsed data while maintaining structured fields for key metrics like calories, macros, and micronutrients.

## AI Integration Architecture
**ChatGroq via LangChain** powers the natural language processing:
- **Meal Parsing**: Converts free-text meal descriptions into structured nutrition data (calories, protein, carbs, fats, micronutrients)
- **Activity Analysis**: Extracts exercise types, durations, intensities from natural language descriptions
- **Fallback Strategy**: Implements graceful degradation when AI services are unavailable
- **Prompt Engineering**: Uses structured prompts to ensure consistent JSON output for reliable data parsing

## Frontend Architecture
**Server-side rendered templates** with progressive enhancement:
- **Bootstrap 5**: Provides responsive UI framework with dark theme support
- **Chart.js**: Handles interactive data visualizations for progress tracking
- **Vanilla JavaScript**: Manages client-side interactions and chart rendering
- **Template inheritance**: Uses Jinja2 base templates for consistent UI structure

## Calculation Engine
**Metabolic calculations** are handled server-side:
- **BMR Calculation**: Uses Mifflin-St Jeor equation based on user profile
- **TDEE Estimation**: Applies activity level multipliers to BMR for daily calorie needs
- **Personalized Burn Rates**: Factors user demographics into activity calorie calculations

## Data Processing Pipeline
**Structured data flow** for user inputs:
1. Natural language input captured via web forms
2. AI service processes text and returns structured JSON
3. Parsed data validated and stored in PostgreSQL
4. Dashboard aggregates data for visualization
5. Charts and summaries generated from processed data

# External Dependencies

## AI Services
- **ChatGroq**: Mixtral-8x7b-32768 model for natural language processing
- **LangChain**: Framework for LLM integration and prompt management

## Database
- **PostgreSQL**: Primary data persistence layer

## Frontend Libraries
- **Bootstrap 5**: UI framework with dark theme
- **Chart.js**: Data visualization library
- **Font Awesome**: Icon library

## Environment Configuration
- **GROQ_API_KEY**: Authentication for ChatGroq AI service
- **DATABASE_URL**: PostgreSQL connection string
- **SESSION_SECRET**: Flask session security key
- **GROQ_MODEL**: AI model specification (defaults to mixtral-8x7b-32768)

## Python Dependencies
- **Flask**: Web framework
- **Flask-SQLAlchemy**: Database ORM
- **langchain-groq**: AI service integration
- **Werkzeug**: WSGI utilities and middleware
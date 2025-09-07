import os
import json
import logging
from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY", "your_api_key_here")
        self.model = os.getenv("GROQ_MODEL", "mixtral-8x7b-32768")
        
        try:
            self.llm = ChatGroq(
                api_key=self.api_key,
                model=self.model,
                temperature=0.1
            )
        except Exception as e:
            logger.error(f"Failed to initialize ChatGroq: {e}")
            self.llm = None
    
    def parse_meal(self, meal_text):
        """Parse meal description into structured nutrition data"""
        if not self.llm:
            return self._fallback_meal_data(meal_text)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a nutrition expert. Parse the meal description into structured JSON data.
            Return ONLY valid JSON with this exact structure:
            {
                "foods": [
                    {
                        "name": "food name",
                        "quantity": "amount with unit",
                        "calories": 0,
                        "protein": 0,
                        "carbs": 0,
                        "fats": 0,
                        "fiber": 0,
                        "sugar": 0,
                        "sodium": 0
                    }
                ],
                "total_calories": 0,
                "total_protein": 0,
                "total_carbs": 0,
                "total_fats": 0,
                "total_fiber": 0,
                "total_sugar": 0,
                "total_sodium": 0,
                "meal_type": "breakfast/lunch/dinner/snack"
            }
            
            All nutritional values should be realistic estimates based on standard food databases.
            Protein, carbs, fats, fiber, sugar in grams. Sodium in milligrams.
            """),
            ("user", "{meal_text}")
        ])
        
        try:
            chain = prompt | self.llm
            response = chain.invoke({"meal_text": meal_text})
            
            # Extract JSON from response
            content = response.content.strip()
            if content.startswith('```json'):
                content = content[7:-3]
            elif content.startswith('```'):
                content = content[3:-3]
            
            parsed_data = json.loads(content)
            return parsed_data
        
        except Exception as e:
            logger.error(f"Error parsing meal with AI: {e}")
            return self._fallback_meal_data(meal_text)
    
    def parse_activity(self, activity_text, user_weight, user_age, user_gender):
        """Parse activity description and calculate calories burned"""
        if not self.llm:
            return self._fallback_activity_data(activity_text, user_weight)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""You are a fitness expert. Parse the activity description and calculate calories burned.
            User profile: Weight: {user_weight}kg, Age: {user_age}, Gender: {user_gender}
            
            Return ONLY valid JSON with this exact structure:
            {{
                "activities": [
                    {{
                        "name": "activity name",
                        "duration": 0,
                        "intensity": "low/moderate/high",
                        "calories_per_minute": 0,
                        "total_calories": 0
                    }}
                ],
                "total_duration": 0,
                "total_calories": 0,
                "activity_type": "cardio/strength/sports/other"
            }}
            
            Calculate realistic calories burned based on:
            - Activity type and intensity
            - Duration in minutes
            - User's weight (heavier people burn more calories)
            - Standard MET (Metabolic Equivalent) values
            """),
            ("user", "{activity_text}")
        ])
        
        try:
            chain = prompt | self.llm
            response = chain.invoke({"activity_text": activity_text})
            
            # Extract JSON from response
            content = response.content.strip()
            if content.startswith('```json'):
                content = content[7:-3]
            elif content.startswith('```'):
                content = content[3:-3]
            
            parsed_data = json.loads(content)
            return parsed_data
        
        except Exception as e:
            logger.error(f"Error parsing activity with AI: {e}")
            return self._fallback_activity_data(activity_text, user_weight)
    
    def _fallback_meal_data(self, meal_text):
        """Fallback meal data when AI is unavailable"""
        return {
            "foods": [{"name": meal_text, "quantity": "1 serving", "calories": 200, "protein": 10, "carbs": 25, "fats": 8, "fiber": 3, "sugar": 5, "sodium": 300}],
            "total_calories": 200,
            "total_protein": 10,
            "total_carbs": 25,
            "total_fats": 8,
            "total_fiber": 3,
            "total_sugar": 5,
            "total_sodium": 300,
            "meal_type": "meal"
        }
    
    def _fallback_activity_data(self, activity_text, user_weight):
        """Fallback activity data when AI is unavailable"""
        # Basic calorie estimation: ~5 calories per minute for moderate activity
        estimated_calories = 5 * 30  # Assume 30 minutes
        return {
            "activities": [{"name": activity_text, "duration": 30, "intensity": "moderate", "calories_per_minute": 5, "total_calories": estimated_calories}],
            "total_duration": 30,
            "total_calories": estimated_calories,
            "activity_type": "other"
        }

ai_service = AIService()

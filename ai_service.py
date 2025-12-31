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

        # Token metrics (best-effort; depends on provider returning usage metadata)
        self._last_usage = None
        self._usage_totals = {}
        
        try:
            self.llm = ChatGroq(
                api_key=self.api_key,
                model=self.model,
                temperature=0.1
            )
        except Exception as e:
            logger.error(f"Failed to initialize ChatGroq: {e}")
            self.llm = None

    def _extract_token_usage(self, response):
        """Best-effort extraction of token usage from LangChain message metadata."""
        if response is None:
            return None

        meta = {}
        try:
            rm = getattr(response, 'response_metadata', None)
            if isinstance(rm, dict):
                meta.update(rm)
        except Exception:
            pass

        try:
            um = getattr(response, 'usage_metadata', None)
            if isinstance(um, dict):
                meta.setdefault('token_usage', um)
        except Exception:
            pass

        usage = None
        for key in ('token_usage', 'usage', 'usage_metadata'):
            val = meta.get(key)
            if isinstance(val, dict):
                usage = val
                break

        # Some providers nest usage deeper
        if usage is None:
            for key in ('response', 'metadata'):
                val = meta.get(key)
                if isinstance(val, dict):
                    nested = val.get('token_usage') or val.get('usage')
                    if isinstance(nested, dict):
                        usage = nested
                        break

        if not isinstance(usage, dict):
            return None

        input_tokens = usage.get('input_tokens')
        if input_tokens is None:
            input_tokens = usage.get('prompt_tokens')
        output_tokens = usage.get('output_tokens')
        if output_tokens is None:
            output_tokens = usage.get('completion_tokens')
        total_tokens = usage.get('total_tokens')

        try:
            input_tokens = int(input_tokens) if input_tokens is not None else None
        except Exception:
            input_tokens = None
        try:
            output_tokens = int(output_tokens) if output_tokens is not None else None
        except Exception:
            output_tokens = None
        try:
            total_tokens = int(total_tokens) if total_tokens is not None else None
        except Exception:
            total_tokens = None

        if total_tokens is None and input_tokens is not None and output_tokens is not None:
            total_tokens = input_tokens + output_tokens

        # If we still got nothing useful, consider it unavailable
        if input_tokens is None and output_tokens is None and total_tokens is None:
            return None

        return {
            'input_tokens': input_tokens,
            'output_tokens': output_tokens,
            'total_tokens': total_tokens,
        }

    def _record_usage(self, action, response):
        usage = self._extract_token_usage(response)
        self._last_usage = {'action': action, 'usage': usage}
        if usage and isinstance(usage, dict):
            cur = self._usage_totals.get(action, {'input_tokens': 0, 'output_tokens': 0, 'total_tokens': 0})
            cur['input_tokens'] += int(usage.get('input_tokens') or 0)
            cur['output_tokens'] += int(usage.get('output_tokens') or 0)
            cur['total_tokens'] += int(usage.get('total_tokens') or 0)
            self._usage_totals[action] = cur

    def pop_last_usage(self):
        """Return and clear last recorded usage."""
        last = self._last_usage
        self._last_usage = None
        return last

    def get_usage_totals(self):
        """Return cumulative totals per action (in-memory)."""
        return dict(self._usage_totals)
    
    def parse_meal(self, meal_text):
        """Parse meal description into structured nutrition data"""
        if not self.llm:
            self._last_usage = {'action': 'parse_meal', 'usage': None}
            return self._fallback_meal_data(meal_text)
        
        prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a nutrition expert. Parse the meal description into structured JSON data.
        Return ONLY valid JSON with this exact structure:
        {{
            "foods": [
                {{
                    "name": "food name",
                    "quantity": "amount with unit",
                    "calories": 0,
                    "protein": 0,
                    "carbs": 0,
                    "fats": 0,
                    "fiber": 0,
                    "sugar": 0,
                    "sodium": 0
                }}
            ],
            "total_calories": 0,
            "total_protein": 0,
            "total_carbs": 0,
            "total_fats": 0,
            "total_fiber": 0,
            "total_sugar": 0,
            "total_sodium": 0,
            "meal_type": "breakfast/lunch/dinner/snack"
        }}
    
        All nutritional values should be realistic estimates based on standard food databases.
        Calories,Protein, carbs, fats, fiber, sugar in grams. Sodium in milligrams.
        """),
        ("user", "{meal_text}")
    ])

        
        try:
            chain = prompt | self.llm
            response = chain.invoke({"meal_text": meal_text})

            self._record_usage('parse_meal', response)
            
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
            self._last_usage = {'action': 'parse_meal', 'usage': None}
            return self._fallback_meal_data(meal_text)
    
    def parse_activity(self, activity_text, user_weight, user_age, user_gender):
        """Parse activity description and calculate calories burned"""
        if not self.llm:
            self._last_usage = {'action': 'parse_activity', 'usage': None}
            return self._fallback_activity_data(activity_text, user_weight)
        
        prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a fitness expert. Parse the activity description and calculate calories burned.

            User profile:
            - Weight: {user_weight} kg
            - Age: {user_age}
            - Gender: {user_gender}

            Rules:
            1. Extract the duration in minutes from the activity text if provided (e.g. "10 min walk" = 10 minutes). If no duration is given, make a reasonable estimate.
            2. Choose intensity (low/moderate/high) based on the activity.
            3. Use a reasonable MET reference table for estimation.
            4. Formula: calories_per_minute = (MET × 3.5 × user_weight) / 200; total_calories = calories_per_minute × duration.

            5. Always return valid JSON in this structure:
            {{
                "activities": [
                    {{
                        "name": "activity name",
                        "duration": (minutes),
                        "intensity": "low/moderate/high",
                        "calories_per_minute": (float),
                        "total_calories": (float)
                    }}
                ],
                "total_duration": (minutes),
                "total_calories": (float),
                "activity_type": "cardio/strength/sports/other"
            }}

            Output only JSON. Do not include explanations.
            """),
                ("user", "{activity_text}")
            ])


        try:
            chain = prompt | self.llm
            response = chain.invoke({
                "activity_text": activity_text,
                "user_weight": user_weight,
                "user_age": user_age,
                "user_gender": user_gender
            })

            self._record_usage('parse_activity', response)
            
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
            self._last_usage = {'action': 'parse_activity', 'usage': None}
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
    
    def generate_daily_report(self, user_obj, summary):
        """Use the LLM to generate a human-readable daily report.

        user_obj: dict-like with keys name, age, gender, weight, height, goal
        summary: dict with calories_consumed, calories_burned, net_calories, meals_count, activities_count
        Returns: dict {overview, advice} or None on failure.
        """
        if not self.llm:
            return None

        # Prepare JSON strings to pass into the prompt
        user_json = json.dumps(user_obj)
        summary_json = json.dumps(summary)

        # Build prompt - ask for JSON output with overview and advice
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert health coach and nutritionist. Given the exact user profile and today's summary, produce a concise human-friendly daily report.

Return ONLY valid JSON with the following structure:
{{
  "overview": "a short paragraph summarizing how the user did today",
  "advice": "two or three concrete actionable tips tailored to the user's goal",
  "concerns": "what user is doing wrong based on his goal"
}}

Use the user's goal text exactly when relevant to personalize the advice. Keep total output under 3 short paragraphs. Do NOT include any extra fields or commentary outside the JSON.
"""),
            ("user", "User profile (JSON): {user_json}\n\nToday's summary (JSON): {summary_json}")
        ])

        try:
            chain = prompt | self.llm
            response = chain.invoke({
                "user_json": user_json,
                "summary_json": summary_json
            })

            self._record_usage('generate_daily_report', response)

            content = response.content.strip()
            if content.startswith('```json'):
                content = content[7:-3]
            elif content.startswith('```'):
                content = content[3:-3]

            # Try to load JSON
            try:
                parsed = json.loads(content)
                # Expect parsed to be a dict with overview/advice; concerns is optional
                if isinstance(parsed, dict) and 'overview' in parsed and 'advice' in parsed:
                    return {
                        'overview': parsed.get('overview'),
                        'advice': parsed.get('advice'),
                        'concerns': parsed.get('concerns'),
                    }
            except Exception:
                # Not JSON or parse failed - fall through to return None
                logger.debug('LLM returned non-JSON for daily report')
                return None

        except Exception as e:
            logger.error(f"Error generating daily report with AI: {e}")
            self._last_usage = {'action': 'generate_daily_report', 'usage': None}
            return None

ai_service = AIService()

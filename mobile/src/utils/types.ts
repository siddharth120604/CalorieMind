export interface User {
  id: number;
  email: string;
  name: string | null;
  age: number | null;
  gender: string | null;
  weight: number | null;
  height: number | null;
  goal: string;
  profile_completed: boolean;
  role: string;
  bmr: number;
  daily_calorie_target: number | null;
  correction_factor: number;
  initial_weight: number | null;
  target_weight: number | null;
  target_body_fat_pct: number | null;
  target_muscle_mass: number | null;
  target_waist_size: number | null;
  created_at: string | null;
}

export interface Meal {
  id: number;
  user_id: number;
  meal_text: string;
  parsed_data: Record<string, unknown> | null;
  total_calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  sugar: number;
  sodium: number;
  meal_type: string;
  timestamp: string;
}

export interface Activity {
  id: number;
  user_id: number;
  activity_text: string;
  parsed_data: Record<string, unknown> | null;
  activity_type: string;
  duration: number;
  intensity: string;
  calories_burned: number;
  timestamp: string;
}

export interface DailyReport {
  id: number;
  user_id: number;
  date: string;
  overview: string | null;
  advice: string | null;
  concerns: string | null;
  created_at: string | null;
}

export interface Notification {
  id: number;
  recipient_id: number;
  sender_id: number | null;
  message: string;
  is_read: boolean;
  sender_email: string | null;
  created_at: string | null;
}

export interface DailySummary {
  date: string;
  calories_consumed: number;
  calories_burned: number;
  net_calories: number;
  meals_count: number;
  activities_count: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export interface WeeklyData {
  dates: string[];
  calories_consumed: number[];
  calories_burned: number[];
  net_calories: number[];
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface ApiError {
  error: string;
  code: string;
}

export interface WeightLog {
  id: number;
  weight: number;
  notes: string | null;
  date: string;
}

export interface WeightTrendPoint {
  date: string;
  avg_weight: number;
  raw_weight: number | null;
}

export interface GoalStatus {
  metric: string;
  target: number;
  current: number;
  initial?: number;
  progress_pct?: number;
  achieved: boolean;
  remaining: number;
}

export interface WeeklyProgress {
  week_start: string;
  week_end: string;
  days_tracked: number;
  calories_consumed: number;
  calories_burned: number;
  calories_target: number;
  calories_remaining: number;
  on_track: boolean;
}

export interface Projection {
  weeks: number;
  projected_weight: number;
  projected_change: number;
}

export interface AdjustmentSuggestion {
  has_suggestion: boolean;
  current_target?: number;
  suggested_target?: number;
  correction_factor?: number;
  weeks_of_data?: number;
  reasoning?: string;
  message?: string;
}

export interface ExportResponse {
  download_url: string;
  filename: string;
  format: 'csv' | 'txt';
}

export interface InventoryItem {
  id: number;
  user_id: number;
  name: string;
  quantity: string;
  category: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  fiber: number | null;
  serving_size: string | null;
  created_at: string | null;
}

export interface MealPlanItem {
  inventory_item: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface MealPlanMeal {
  type: string;
  name: string;
  items: MealPlanItem[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fats: number;
  preparation: string;
}

export interface MealPlanData {
  meals: MealPlanMeal[];
  summary: string;
}

export interface MealPlan {
  id: number;
  user_id: number;
  date: string;
  plan_data: MealPlanData;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fats: number;
  created_at: string | null;
}

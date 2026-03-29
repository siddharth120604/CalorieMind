# Plan 07: Inventory Management & AI Meal Planning

**Status:** Implemented
**Date:** 2026-03-27

## Goal

Let users maintain a food & supplement inventory (what they have at home), and use AI to generate full-day meal plans that hit their calorie/macro targets using only items from their inventory.

## Problem

Users know their calorie targets but don't know *what to eat*. They have food at home but no plan. Currently the app only tracks what was already eaten — it doesn't help users decide what to eat next.

## Solution

Two connected features:
1. **Inventory** — User adds food items and supplements one at a time (name + quantity). AI estimates macros per item on add. Stored in DB. User manually manages (add/delete).
2. **Meal Plan** — On demand, AI generates a full-day meal plan (breakfast/lunch/dinner/snacks) using only the user's inventory items, optimized for their calorie target, macro goals, and body metrics.

---

## Data Model

### New Model: InventoryItem

```
id              Integer, PK
user_id         Integer, FK → users
name            String(200)          — "chicken breast", "whey protein", "brown rice"
quantity         String(100)          — "2 kg", "500g", "1 bottle (30 servings)"
category        String(50)           — "protein", "carb", "fat", "supplement", "vegetable", "fruit", "dairy", "other"
calories        Float, nullable      — per standard serving (AI-estimated)
protein         Float, nullable      — grams
carbs           Float, nullable      — grams
fats            Float, nullable      — grams
fiber           Float, nullable      — grams
serving_size    String(100), nullable — "100g", "1 scoop (30g)", "1 cup"
created_at      DateTime
```

### New Model: MealPlan

```
id              Integer, PK
user_id         Integer, FK → users
date            Date                 — the day this plan is for
plan_data       Text (JSON)          — full structured meal plan (see format below)
total_calories  Float
total_protein   Float
total_carbs     Float
total_fats      Float
created_at      DateTime
```

No changes to User model — relies on existing `daily_calorie_target`, `goal`, `weight`, `height`, `age`, `gender`.

## MealPlan JSON Structure (`plan_data`)

```json
{
  "meals": [
    {
      "type": "breakfast",
      "name": "Oatmeal with Whey Protein & Banana",
      "items": [
        {"inventory_item": "oats", "quantity": "80g", "calories": 300, "protein": 10, "carbs": 54, "fats": 5},
        {"inventory_item": "whey protein", "quantity": "1 scoop (30g)", "calories": 120, "protein": 24, "carbs": 3, "fats": 1},
        {"inventory_item": "banana", "quantity": "1 medium", "calories": 105, "protein": 1.3, "carbs": 27, "fats": 0.4}
      ],
      "total_calories": 525,
      "total_protein": 35.3,
      "total_carbs": 84,
      "total_fats": 6.4,
      "preparation": "Cook oats with water, mix in protein powder, top with sliced banana"
    },
    {
      "type": "lunch",
      "name": "Chicken Rice Bowl",
      "items": [...],
      "total_calories": 620,
      "total_protein": 45,
      "total_carbs": 65,
      "total_fats": 15,
      "preparation": "..."
    },
    {
      "type": "snack",
      "name": "...",
      "items": [...],
      ...
    },
    {
      "type": "dinner",
      "name": "...",
      "items": [...],
      ...
    }
  ],
  "summary": "This plan provides 2000 kcal with 150g protein, optimized for your weight loss goal."
}
```

## API Endpoints

### Inventory (`/api/v1/inventory`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | jwt_required | List all inventory items for user |
| POST | `/` | jwt_required | Add item (name + quantity) → AI estimates macros → save |
| DELETE | `/<id>` | jwt_required | Delete an inventory item |

**POST `/` Request:**
```json
{
  "name": "chicken breast",
  "quantity": "2 kg"
}
```

**POST `/` Response:**
```json
{
  "id": 1,
  "name": "chicken breast",
  "quantity": "2 kg",
  "category": "protein",
  "calories": 165,
  "protein": 31,
  "carbs": 0,
  "fats": 3.6,
  "fiber": 0,
  "serving_size": "100g",
  "created_at": "2026-03-27T10:00:00"
}
```

### Meal Plans (`/api/v1/meal-plans`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/generate` | jwt_required | Generate a full-day meal plan from inventory |
| GET | `/` | jwt_required | List saved meal plans (?date=YYYY-MM-DD) |
| GET | `/<id>` | jwt_required | Get a specific meal plan |
| DELETE | `/<id>` | jwt_required | Delete a meal plan |

**POST `/generate` Request:**
```json
{
  "date": "2026-03-27"
}
```
Date is optional, defaults to today. No other input needed — the AI uses the user's inventory, profile, and targets.

**POST `/generate` Response:**
Returns the full MealPlan object with nested `plan_data`.

## AI Integration

### 1. Parse Inventory Item Macros

New method in `AIService`: `parse_inventory_item(name, quantity)`

**Prompt strategy:**
- Input: item name + quantity
- Output: JSON with `category`, `calories`, `protein`, `carbs`, `fats`, `fiber`, `serving_size`
- Macros are per standard serving size (e.g. per 100g for food, per scoop for supplements)
- Same pattern as existing `parse_meal()` — prompt → LLM → parse JSON → fallback

### 2. Generate Meal Plan

New method in `AIService`: `generate_meal_plan(user_profile, inventory_items, daily_target)`

**Prompt strategy:**
- Input: user profile (weight, height, age, gender, goal, daily_calorie_target, BMR), full inventory list with macros
- Output: structured JSON meal plan (breakfast/lunch/dinner/snacks)
- Constraints passed to AI:
  - Total calories must be within ±50 of daily_calorie_target
  - Use ONLY items from the inventory
  - Prioritize protein if goal is muscle gain
  - Include supplements at appropriate times (e.g. whey post-workout, creatine with breakfast)
  - Include simple preparation instructions
- Fallback: return error message if AI fails (no fallback plan — inventory is too user-specific)

## Backend Changes

### New Files

| File | Purpose |
|------|---------|
| `backend/models/inventory_item.py` | InventoryItem model |
| `backend/models/meal_plan.py` | MealPlan model |
| `backend/services/inventory_service.py` | Add/list/delete inventory items, AI macro parsing |
| `backend/services/meal_plan_service.py` | Generate/list/get/delete meal plans |
| `backend/api/inventory.py` | Inventory blueprint (`/api/v1/inventory`) |
| `backend/api/meal_plans.py` | Meal plan blueprint (`/api/v1/meal-plans`) |

### Modified Files

| File | Change |
|------|--------|
| `backend/models/__init__.py` | Add `InventoryItem`, `MealPlan` exports |
| `backend/api/__init__.py` | Add `inventory_bp`, `meal_plans_bp` exports |
| `backend/app.py` | Register new blueprints |
| `backend/services/ai_service.py` | Add `parse_inventory_item()` and `generate_meal_plan()` methods |

## Frontend Changes (`frontend/`)

### New Files

| File | Purpose |
|------|---------|
| `src/api/inventory.ts` | API client for inventory endpoints |
| `src/api/mealPlans.ts` | API client for meal plan endpoints |
| `src/pages/Inventory.tsx` | Inventory management page |
| `src/pages/MealPlan.tsx` | Meal plan view page |

### Modified Files

| File | Change |
|------|--------|
| `src/utils/types.ts` | Add `InventoryItem`, `MealPlan`, `MealPlanMeal` interfaces |
| `src/App.tsx` | Add `/inventory` and `/meal-plan` routes |
| `src/components/Layout/Sidebar.tsx` | Add Inventory and Meal Plan nav links |
| `src/components/Layout/MobileNav.tsx` | Add nav items |

### Inventory Page UI (`/inventory`)

```
┌─────────────────────────────────────────────────┐
│  Food & Supplement Inventory                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  Add Item                                        │
│  ┌──────────────────┐  ┌──────────────┐  [Add]  │
│  │ Item name...     │  │ Quantity...   │         │
│  └──────────────────┘  └──────────────┘         │
│                                                  │
│  Your Inventory (12 items)                       │
│  ┌──────────────────────────────────────────┐   │
│  │ 🍗 Chicken Breast          2 kg          │   │
│  │ Per 100g: 165 cal | 31g P | 0g C | 3.6g F│   │
│  │                                    [Delete]│   │
│  ├──────────────────────────────────────────┤   │
│  │ 🥤 Whey Protein            1 tub (30 srv)│   │
│  │ Per scoop: 120 cal | 24g P | 3g C | 1g F │   │
│  │                                    [Delete]│   │
│  ├──────────────────────────────────────────┤   │
│  │ 🍚 Brown Rice              5 kg          │   │
│  │ Per 100g: 112 cal | 2.6g P | 23g C | 0.9gF│   │
│  │                                    [Delete]│   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  [Generate Today's Meal Plan]              │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Meal Plan Page UI (`/meal-plan`)

```
┌─────────────────────────────────────────────────┐
│  Today's Meal Plan          2026-03-27           │
│  Target: 2000 kcal | Plan: 1985 kcal            │
├─────────────────────────────────────────────────┤
│                                                  │
│  🌅 Breakfast — Oatmeal with Whey & Banana      │
│  ┌──────────────────────────────────────────┐   │
│  │ • Oats 80g — 300 cal                      │   │
│  │ • Whey Protein 1 scoop — 120 cal          │   │
│  │ • Banana 1 medium — 105 cal               │   │
│  │ Total: 525 cal | 35g P | 84g C | 6g F    │   │
│  │ Cook oats, mix in protein, top banana     │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  🌞 Lunch — Chicken Rice Bowl                   │
│  ┌──────────────────────────────────────────┐   │
│  │ • Chicken Breast 150g — 248 cal           │   │
│  │ • Brown Rice 120g — 134 cal               │   │
│  │ • Olive Oil 1 tbsp — 119 cal              │   │
│  │ Total: 620 cal | 45g P | 65g C | 15g F   │   │
│  │ Grill chicken, serve over rice            │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  🍎 Snack — ...                                  │
│  🌙 Dinner — ...                                 │
│                                                  │
│  Summary: 1985 kcal | 150g P | 220g C | 55g F   │
│  "Optimized for weight loss with high protein"   │
│                                                  │
│  [Regenerate Plan]                               │
└─────────────────────────────────────────────────┘
```

## Mobile Changes (`mobile/`)

### New Files

| File | Purpose |
|------|---------|
| `src/api/inventory.ts` | Same API client as frontend |
| `src/api/mealPlans.ts` | Same API client as frontend |
| `src/screens/InventoryScreen.tsx` | Inventory management screen |
| `src/screens/MealPlanScreen.tsx` | Meal plan view screen |

### Modified Files

| File | Change |
|------|--------|
| `src/utils/types.ts` | Add same interfaces as frontend |
| `src/navigation/AppNavigator.tsx` | Add Inventory and Meal Plan to navigation |

Mobile screens mirror the web layout exactly (same as Plan 05 pattern — View/Text instead of divs, same theme colors).

## Implementation Order

1. **`backend/models/inventory_item.py`** — InventoryItem model
2. **`backend/models/meal_plan.py`** — MealPlan model
3. **`backend/models/__init__.py`** — Export new models
4. **`backend/services/ai_service.py`** — Add `parse_inventory_item()` and `generate_meal_plan()` methods
5. **`backend/services/inventory_service.py`** — Inventory CRUD + AI macro parsing
6. **`backend/services/meal_plan_service.py`** — Meal plan generation + CRUD
7. **`backend/api/inventory.py`** — Inventory blueprint
8. **`backend/api/meal_plans.py`** — Meal plan blueprint
9. **`backend/api/__init__.py`** — Export new blueprints
10. **`backend/app.py`** — Register new blueprints
11. **`frontend/src/utils/types.ts`** — Add TypeScript interfaces
12. **`frontend/src/api/inventory.ts`** — Inventory API client
13. **`frontend/src/api/mealPlans.ts`** — Meal plan API client
14. **`frontend/src/pages/Inventory.tsx`** — Inventory page
15. **`frontend/src/pages/MealPlan.tsx`** — Meal plan page
16. **`frontend/src/App.tsx`** — Add routes
17. **`frontend/src/components/Layout/Sidebar.tsx`** — Add nav links
18. **`frontend/src/components/Layout/MobileNav.tsx`** — Add nav items
19. **`mobile/src/utils/types.ts`** — Add interfaces
20. **`mobile/src/api/inventory.ts`** — Inventory API client
21. **`mobile/src/api/mealPlans.ts`** — Meal plan API client
22. **`mobile/src/screens/InventoryScreen.tsx`** — Inventory screen
23. **`mobile/src/screens/MealPlanScreen.tsx`** — Meal plan screen
24. **`mobile/src/navigation/AppNavigator.tsx`** — Add to navigation

## Key Design Decisions

1. **AI estimates macros on add, not on plan generation** — Macro estimation happens once when the item is added. The meal plan AI gets pre-computed macros, making plan generation faster and more consistent.

2. **Static inventory, manual management** — No auto-depletion. Users add and delete items themselves. Keeps it simple and avoids wrong assumptions about portion usage.

3. **One meal plan per day** — Generating a new plan for the same date replaces the old one. Users can regenerate if they don't like the plan.

4. **plan_data is JSON in a Text column** — The meal plan structure is read-heavy, write-once. Storing as JSON avoids complex relational modeling for nested meals/items. Queried as a whole, never partially.

5. **Supplements treated as inventory items** — No separate supplement model. Category field distinguishes them. AI knows to place supplements at appropriate times in the meal plan.

6. **Macros per serving size, not per total quantity** — "2 kg chicken breast" stores macros per 100g. The AI uses serving-based portions in the meal plan. Total quantity is just for the user to know what they have.

7. **No new pages in navigation for mobile "More" menu** — Inventory and Meal Plan are added as tabs or under the More menu, consistent with Plan 05 navigation structure.

8. **Reuses existing AI service pattern** — Same prompt → LLM → JSON parse → fallback pattern as `parse_meal()` and `generate_daily_report()`.

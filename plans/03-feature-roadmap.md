# Plan 03: Feature Roadmap

**Status:** Draft
**Date:** 2026-03-22

## Overview

Feature improvements for CalorieMind, prioritized by impact on calorie tracking accuracy, user retention, and health insights.

---

## Priority 1: High Impact — Accuracy

### 1.1 USDA Food Database Integration
- Integrate USDA FoodData Central API (free) for verified nutritional data
- Use LLM for food name/quantity parsing, then look up actual values from USDA
- Fallback to LLM estimates when food not found in database
- **Impact:** Significantly improves calorie accuracy
- **Effort:** Medium

### 1.2 Portion Size Calibration
- One-time setup where users define their serving sizes (bowl, plate, cup)
- Visual references for small/medium/large portions
- Pass calibrated sizes to AI for better estimates
- **Impact:** Fixes "1 bowl of rice = ???" ambiguity
- **Effort:** Medium

---

## Priority 2: High Impact — User Retention

### 2.1 Meal Templates / Favorites
- Save frequently eaten meals as templates
- One-tap logging for saved meals
- People eat the same 10-15 meals repeatedly — removes friction
- **Impact:** Users log more consistently
- **Effort:** Low

### 2.2 Goal-Based Daily Targets with Visual Feedback
- Configurable calorie + macro targets
- Traffic-light system (green/yellow/red) throughout the day
- Progress bars per meal type
- **Impact:** Turns passive tracking into active behavior change
- **Effort:** Low-Medium

### 2.3 Streak Tracking & Reminders
- Track consecutive logging days
- Email/push notifications for missed logging
- **Impact:** Proven for habit formation
- **Effort:** Low

---

## Priority 3: Medium Impact — Better Insights

### 3.1 Weight Tracking with Trend Line
- Periodic weight logging
- 7-day moving average trend line
- Correlate intake with actual weight results
- **Effort:** Low

### 3.2 Weekly/Monthly AI Trend Reports
- Pattern detection: "You consistently overeat on weekends"
- Macro trends: "Your protein is low on Mondays"
- More actionable than single-day reports
- **Effort:** Medium

### 3.3 Macro Targets (Not Just Calories)
- Configurable protein/carb/fat targets
- Per-meal and daily tracking
- Critical for muscle gain / fat loss goals
- **Effort:** Low

### 3.4 Meal Timing Analysis
- Track when users eat
- Late-night eating detection
- Intermittent fasting window support
- **Effort:** Low

### 3.5 Water Intake Tracking
- Basic hydration logging
- Daily target with visual progress
- **Effort:** Low

---

## Priority 4: Nice to Have

### 4.1 Meal Photo Logging
- Snap photo of meal → vision model identifies foods
- Use GPT-4o or similar multimodal model
- **Effort:** High

### 4.2 Barcode Scanner
- Scan packaged food for instant nutrition data
- Use Open Food Facts API (free)
- **Effort:** Medium

### 4.3 Recipe Builder
- Enter ingredients for home-cooked recipes
- Calculate per-serving nutrition
- Save for reuse
- **Effort:** Medium

### 4.4 Data Export
- CSV/PDF export of meal logs and reports
- Share with nutritionist or doctor
- **Effort:** Low

### 4.5 Social / Accountability
- Share progress with friend or coach
- Optional leaderboards
- **Effort:** High

---

## Implementation Order (Suggested)

| Phase | Features | Depends On |
|-------|----------|------------|
| **Phase 1** | Frontend SPA (Plan 02) | Backend API (Plan 01) |
| **Phase 2** | Meal templates, Goal targets, Streak tracking | Frontend |
| **Phase 3** | USDA integration, Weight tracking | Backend |
| **Phase 4** | Weekly AI reports, Macro targets, Water tracking | Backend + Frontend |
| **Phase 5** | Photo logging, Barcode scanner, Recipes | Frontend + new APIs |

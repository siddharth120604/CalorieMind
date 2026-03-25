# Plan 04: Goal Tracking & Adaptive Calorie Targets

**Status:** Pending
**Date:** 2026-03-22

## Goal

Help users effectively manage weight by tracking progress against their calorie targets, projecting results, and auto-adjusting targets based on real outcomes.

## Problem

Currently the app sets a daily calorie target but gives no visibility into:
- Whether the user is hitting their target consistently over time
- What results they should expect if they stick to their target
- Whether their target is actually correct for their body

Every person's metabolism is different. The standard "3500 cal deficit = 0.5kg loss" is a rough estimate. Real results vary based on water retention, sleep, stress, hormones, genetics, etc.

## Solution: Feedback Loop

```
Set Target → Track Intake → Log Actual Weight → Compare Predicted vs Actual → Adjust Target
     ^                                                                              |
     |______________________________________________________________________________|
```

## Features

### 4.1 Body Metrics Logging

**Weight Logging:**
- User can log weight daily (optional, not forced)
- At the end of each week, if user has logged multiple weights, we take the weekly average
- If user hasn't logged that week, we prompt them to log their latest weight before calculating the adjustment factor
- First weight log sets `initial_weight` for baseline comparison

**Body Composition Targets (optional):**
Users can set targets beyond just weight:
- Target weight (kg)
- Target body fat percentage (%)
- Target muscle mass (kg)
- Target waist size (cm/inches)

These are goal posts — the app tracks progress toward each one the user sets.

### 4.2 Weekly & Monthly Calorie Summary
- "This week: consumed 13,800 / target 14,000 — on track"
- "This month: consumed 58,000 / target 60,000 — 2,000 cal under"
- Shows how individual days contribute (green = under target, red = over)
- Available on dashboard and reports page

### 4.3 Projected Results
On profile save or target change, show projections:
- "At 1800 cal/day, you can expect to lose ~0.4kg/week"
- "In 2 weeks: ~0.8kg lost, In 1 month: ~1.7kg lost"

**Calculation (initial standard estimate):**
```
weekly_deficit = (daily_target - BMR) × 7
projected_weekly_change_kg = weekly_deficit / 7700  (7700 cal ≈ 1kg fat)
```

This is the initial estimate — gets refined by real data (see 4.4).

### 4.4 Actual vs Predicted Comparison

When user logs weight over time:
- Compare predicted weight change vs actual weight change
- Calculate a **personal correction factor**

**Example:**
```
Week 1: predicted -1.0kg, actual -0.5kg → factor = 0.50
Week 2: predicted -0.5kg, actual -0.45kg → factor = 0.90
Week 3: predicted -0.45kg, actual -0.5kg → factor = 1.11
Week 4: predicted -0.48kg, actual -0.47kg → factor = 0.98
```

The correction factor is NOT static — it recalculates every week as new weight data comes in. Over time it converges toward the user's real metabolic rate.

**Rolling average (last 4 weeks):**
```
correction_factor = avg(week1_factor, week2_factor, week3_factor, week4_factor)
```

Using a rolling average of the last 3-4 weeks instead of just the latest week smooths out anomalies (sick week, vacation, water retention, hormonal cycles). The more weeks of data, the more accurate the factor becomes.

```
After week 1: factor = 0.50 (only 1 data point, rough)
After week 2: factor = avg(0.50, 0.90) = 0.70
After week 3: factor = avg(0.50, 0.90, 1.11) = 0.84
After week 4: factor = avg(0.50, 0.90, 1.11, 0.98) = 0.87
After week 5: factor = avg(0.90, 1.11, 0.98, ...) = drops week 1, sliding window
```

**Weekly weight input flow:**
1. User logs weight daily (optional) — stored as individual entries
2. At end of week, system calculates weekly average from all logs that week
3. If no logs exist for the week, prompt user: "Log your latest weight to update your progress"
4. Weekly average is used for the predicted vs actual comparison
5. Correction factor is recalculated using rolling 4-week window

Store the correction factor on the User model. Use it to adjust future projections and recalculate the daily calorie target.

### 4.5 Auto-Adjusted Targets

After enough data (2+ weeks of weight logs):
- System calculates a suggested new daily calorie target based on correction factor
- Shows suggestion to user: "Based on your actual results, we suggest adjusting your target from 2000 to 1800 cal"
- Show reasoning: "You've been consuming 2000 cal/day but losing less than expected. Your body burns approximately 200 fewer calories than the standard estimate."
- **User can accept or reject**
  - **Accept:** `daily_calorie_target` is updated to the new value
  - **Reject:** target stays the same, suggestion is dismissed until next week's data

**Important:** This is math-based (correction factor), NOT LLM-based. More reliable, no hallucination. LLM is only used for presenting insights in a human-friendly way.

### 4.6 Goal Achievement

When user reaches any of their targets (weight, fat %, muscle mass, waist size):
- Celebration UI on dashboard (congratulations banner/animation)
- Summary of the journey: "You lost 5kg in 8 weeks! Your average weekly deficit was 650 cal."
- Prompt to set next goal: "What's your next target?" — links to profile/goals page
- If user set multiple targets, celebrate each one individually as they're hit

## Data Model Changes

### New Model: WeightLog
```
id              Integer, PK
user_id         Integer, FK → users
weight          Float (kg)
date            Date
created_at      DateTime
```

### New Model: BodyMetricLog (optional body composition tracking)
```
id              Integer, PK
user_id         Integer, FK → users
body_fat_pct    Float, nullable (%)
muscle_mass     Float, nullable (kg)
waist_size      Float, nullable (cm)
date            Date
created_at      DateTime
```

### New Model: WeeklySummary (computed and cached each week)
```
id                      Integer, PK
user_id                 Integer, FK → users
week_start              Date
week_end                Date
avg_weight              Float, nullable
calories_consumed       Float
calories_target         Float (daily_target × 7)
calories_burned         Float
predicted_weight_change Float
actual_weight_change    Float, nullable
correction_factor       Float, nullable
created_at              DateTime
```

### User Model Additions
```
correction_factor    Float, default 1.0
initial_weight       Float, nullable        (set on first weight log)
target_weight        Float, nullable
target_body_fat_pct  Float, nullable
target_muscle_mass   Float, nullable
target_waist_size    Float, nullable
```

## API Endpoints

### Weight & Body Metrics
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/weight` | Log weight for a date |
| GET | `/api/v1/weight` | Get weight history (?days=30) |
| GET | `/api/v1/weight/trend` | Get 7-day moving average |
| POST | `/api/v1/body-metrics` | Log body fat %, muscle mass, waist |
| GET | `/api/v1/body-metrics` | Get body metrics history |

### Goals & Targets
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/goals` | Get current targets (weight, fat%, muscle, waist) |
| PUT | `/api/v1/goals` | Update targets |
| GET | `/api/v1/goals/status` | Progress toward each target |

### Progress & Projections
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/progress/weekly` | This week's intake vs target + projected result |
| GET | `/api/v1/progress/monthly` | This month's intake vs target |
| GET | `/api/v1/progress/projection` | Projected weight at 1/2/4 weeks |
| GET | `/api/v1/progress/adjustment` | Suggested target adjustment (if enough data) |
| POST | `/api/v1/progress/adjustment/accept` | Accept adjusted target → updates daily_calorie_target |
| POST | `/api/v1/progress/adjustment/reject` | Reject adjustment → dismissed until next week |

## Frontend Changes

### Dashboard Additions
- "Remaining today" card (already done)
- Weekly summary bar: "12,400 / 14,000 cal this week"
- Weight trend mini-chart (if weight logs exist)
- Projection card: "At this pace: -0.5kg by next week"
- Goal achievement celebration banner

### New Body Metrics Page
- Weight input form (quick log, date defaults to today)
- Optional body fat %, muscle mass, waist size inputs
- Weight history chart (actual weight dots + 7-day moving average line)
- Predicted vs actual comparison chart
- Progress toward each target with progress bars

### Profile Page Additions
- Target fields: weight, body fat %, muscle mass, waist size (all optional)
- Show projections after saving
- Show correction factor insight once available: "Your metabolism runs ~15% slower than average estimates"

### Goal Achievement UI
- Confetti/celebration animation when target is reached
- Journey summary card
- "Set Next Goal" CTA button

## Implementation Order

1. **WeightLog + BodyMetricLog models + API + migration** — foundation
2. **Weight logging UI** — input form + history chart
3. **User model: target fields + correction_factor** — store goals
4. **Goals API + UI** — set/view targets
5. **Weekly/monthly calorie summary** — aggregate existing data
6. **WeeklySummary model + computation** — cached weekly data
7. **Projected results** — math-based projection on profile/dashboard
8. **Actual vs predicted comparison** — after 2+ weeks of weight data
9. **Auto-adjusted targets** — suggestion + accept/reject flow
10. **Goal achievement celebration** — detection + UI

## Key Design Decisions

1. **Correction factor is math, not LLM** — `actual_change / predicted_change`. Reliable, deterministic, no hallucination. Improves with more data.

2. **LLM only for presentation** — the AI writes the human-friendly insight text ("You're burning fewer calories than average, here's why that's normal..."), not the actual calculation.

3. **Minimum 2 weeks of weight data** before suggesting adjustments — avoids reacting to water weight fluctuations.

4. **Rolling 4-week average** for correction factor — smooths anomalies. Drops oldest week as new data arrives (sliding window).

5. **Weekly weight = average of daily logs** — user can log daily (encouraged), system averages for the week. If no logs that week, prompt before computing adjustment.

6. **User controls adjustments** — never auto-change the target without user consent. Show suggestion, user accepts or rejects. On accept: `daily_calorie_target` updates. On reject: dismissed until next week.

7. **Multiple body targets** — weight, fat %, muscle mass, waist size. All optional. Each tracked independently. Celebrate each achievement separately.

8. **Goal completion → next goal** — don't leave user without a target. Celebrate, then prompt for next goal immediately.

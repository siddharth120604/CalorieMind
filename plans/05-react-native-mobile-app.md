# Plan 05: React Native Mobile App (Android)

**Status:** Pending
**Date:** 2026-03-22

## Goal

Build a production-grade Android app using React Native that provides the same functionality as the web frontend, optimized for mobile usage patterns (quick meal logging, weight logging, notifications).

## Why React Native

- Already know React + TypeScript
- Share types, API client, Redux store with web frontend
- Production grade — used by Instagram, Shopify, Discord
- Full access to native Android APIs (camera, notifications, etc.)
- Can add iOS later with same codebase

## Project Structure

```
mobile/
├── src/
│   ├── api/                    # SHARED — copy from frontend/src/api/
│   │   ├── client.ts           # Axios instance (swap localStorage → AsyncStorage)
│   │   ├── auth.ts
│   │   ├── meals.ts
│   │   ├── activities.ts
│   │   ├── reports.ts
│   │   ├── profile.ts
│   │   ├── weight.ts
│   │   ├── bodyMetrics.ts
│   │   ├── goals.ts
│   │   ├── progress.ts
│   │   ├── admin.ts
│   │   └── notifications.ts
│   ├── store/                  # SHARED — copy from frontend/src/store/
│   │   ├── index.ts
│   │   └── authSlice.ts        # Swap localStorage → AsyncStorage
│   ├── utils/
│   │   └── types.ts            # SHARED — identical copy
│   ├── screens/                # Mobile equivalent of pages/
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── MealsScreen.tsx
│   │   ├── ActivitiesScreen.tsx
│   │   ├── BodyMetricsScreen.tsx
│   │   ├── ReportsScreen.tsx
│   │   ├── ReportDetailScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── AdminScreen.tsx
│   ├── components/
│   │   ├── KPICard.tsx
│   │   ├── WeeklyChart.tsx     # react-native-chart-kit instead of chart.js
│   │   ├── MacroChart.tsx
│   │   ├── MealCard.tsx
│   │   ├── ActivityCard.tsx
│   │   ├── GoalProgressBar.tsx
│   │   ├── WeightTrendChart.tsx
│   │   ├── AdjustmentBanner.tsx
│   │   └── Alert.tsx
│   ├── navigation/
│   │   ├── AppNavigator.tsx    # Bottom tab navigator
│   │   ├── AuthNavigator.tsx   # Login/Register stack
│   │   └── RootNavigator.tsx   # Auth check → App or Auth
│   └── App.tsx
├── android/                    # Auto-generated Android project
├── package.json
├── tsconfig.json
├── babel.config.js
└── metro.config.js
```

## What's Shared vs What Changes

### Shared (copy directly)
| Code | Notes |
|------|-------|
| `utils/types.ts` | 100% identical |
| `api/*.ts` (all endpoints) | Same, only `client.ts` changes |
| `store/authSlice.ts` | Logic same, swap storage |

### Changes Needed
| Web | Mobile | Why |
|-----|--------|-----|
| `localStorage` | `AsyncStorage` | React Native has no localStorage |
| `react-router-dom` | `@react-navigation/native` | Different navigation paradigm |
| Tailwind CSS classes | `StyleSheet.create()` | React Native doesn't use CSS |
| `chart.js` / `react-chartjs-2` | `react-native-chart-kit` | chart.js needs DOM |
| `<div>`, `<p>`, `<input>` | `<View>`, `<Text>`, `<TextInput>` | Native components |
| `window.location` | `navigation.navigate()` | No browser |

## Dependencies

```json
{
  "react-native": "latest",
  "typescript": "^5.0",
  "@react-navigation/native": "^6.x",
  "@react-navigation/bottom-tabs": "^6.x",
  "@react-navigation/native-stack": "^6.x",
  "@reduxjs/toolkit": "^2.x",
  "react-redux": "^9.x",
  "axios": "^1.x",
  "@react-native-async-storage/async-storage": "^1.x",
  "react-native-chart-kit": "^6.x",
  "react-native-svg": "^15.x",
  "react-native-push-notification": "^8.x"
}
```

## Navigation Structure

```
RootNavigator
├── AuthNavigator (not logged in)
│   ├── LoginScreen
│   └── RegisterScreen
└── AppNavigator (logged in)
    └── BottomTabNavigator
        ├── Dashboard (home icon)
        ├── Meals (food icon)
        ├── Activities (running icon)
        ├── Body Metrics (scale icon)
        └── More (menu icon)
            ├── Reports
            ├── Profile
            └── Admin (if admin role)
```

## Mobile-Specific Features

### 1. Push Notifications
- Meal reminders at breakfast/lunch/dinner times
- "You haven't logged today" nudge
- Weekly summary notification
- Goal achievement celebration

### 2. Quick Actions
- Quick weight log from dashboard (no page navigation)
- Quick meal log with voice input (future)
- Repeat last meal with one tap

### 3. Offline Support
- Cache recent meals/activities locally
- Queue API calls when offline, sync when back online
- Show cached dashboard data

## API Configuration

The mobile app hits the same backend API. The base URL changes:
- Dev: `http://10.0.2.2:8080/api/v1` (Android emulator → host machine)
- Prod: `https://caloriemind.duckdns.org/api/v1`

```typescript
// mobile/src/api/client.ts
const API_BASE = __DEV__
  ? 'http://10.0.2.2:8080/api/v1'
  : 'https://caloriemind.duckdns.org/api/v1';
```

## AsyncStorage Token Flow

```typescript
// Instead of localStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store
await AsyncStorage.setItem('access_token', token);

// Read
const token = await AsyncStorage.getItem('access_token');

// Clear
await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
```

Note: `AsyncStorage` is async unlike `localStorage`. The axios interceptor and auth slice need to handle this with `await`.

## Implementation Order

1. **Scaffold** — `npx react-native init CalorieMindMobile --template react-native-template-typescript`
2. **Copy shared code** — types, API clients, Redux store
3. **Adapt client.ts** — AsyncStorage for tokens, API base URL config
4. **Navigation setup** — React Navigation with auth flow
5. **Auth screens** — Login, Register
6. **Dashboard screen** — KPI cards, charts, weekly progress
7. **Meals screen** — Add/list/delete/repeat meals
8. **Activities screen** — Add/list/delete activities
9. **Body Metrics screen** — Weight logging, trend chart, goals
10. **Profile screen** — View/edit profile
11. **Reports screen** — List and detail views
12. **Push notifications** — Meal reminders, daily nudge
13. **Build APK** — Release build for Android

## Design — Match Web UI Exactly

The mobile app should look and feel identical to the web frontend. Same dark theme, same card layouts, same component hierarchy. A user switching between web and mobile should feel no difference.

### Theme Constants
```typescript
export const theme = {
  bg: '#030712',        // gray-950
  card: '#111827',      // gray-900
  border: '#1f2937',    // gray-800
  input: '#1f2937',     // gray-800
  primary: '#34d399',   // emerald-400
  primaryDark: '#059669', // emerald-600
  danger: '#f87171',    // red-400
  blue: '#60a5fa',      // blue-400
  amber: '#fbbf24',     // amber-400
  text: '#f3f4f6',      // gray-100
  textMuted: '#9ca3af',  // gray-400
  textDim: '#6b7280',   // gray-500
  fontFamily: 'System',
};
```

### Screen-to-Web Page Mapping

Every screen should replicate the exact web layout:

| Web Page | Mobile Screen | Layout Match |
|----------|--------------|--------------|
| Dashboard | DashboardScreen | Same 4 KPI cards (2x2 grid), same progress bar, same weekly chart, same macro chart, same report section |
| Meals | MealsScreen | Same summary stats row, same add form (textarea), same meal cards with repeat/delete |
| Activities | ActivitiesScreen | Same summary stats, same add form, same activity cards |
| Body Metrics | BodyMetricsScreen | Same weight form + notes, same body composition form, same trend chart, same goal progress bars, same projections, same adjustment banner |
| Profile | ProfileScreen | Same form fields, same read-only weight after setup, same target fields, same BMR/target display |
| Reports | ReportsScreen | Same report list cards, same detail view |
| Login/Register | Auth screens | Same centered card layout, same form fields |

### Component Reuse
Web components map 1:1 to mobile components:

| Web Component | Mobile Component | Changes |
|---------------|-----------------|---------|
| `<KPICard>` | `<KPICard>` | `View` + `Text` instead of divs |
| `<WeeklyChart>` | `<WeeklyChart>` | `react-native-chart-kit` instead of chart.js |
| `<MacroChart>` | `<MacroChart>` | Same library swap |
| `<Alert>` | `<Alert>` | `View` + `Text`, same colors |
| `<LoadingSpinner>` | `<LoadingSpinner>` | `ActivityIndicator` native component |
| Meal card | `<MealCard>` | Same layout, native buttons |
| Activity card | `<ActivityCard>` | Same layout |
| Goal progress bar | `<GoalProgressBar>` | Same bar, `View` based |

### Spacing & Sizing
- Card padding: 16px (same as `p-4`)
- Card border radius: 12px (same as `rounded-xl`)
- Gap between cards: 16px (same as `gap-4`)
- Font sizes: title 24px, body 14px, caption 12px (match web)
- Bottom tab bar replaces sidebar (mobile pattern)

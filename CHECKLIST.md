# Orexis — build checklist

Each phase ends with a commit. Phases 2 and 3 have no UI and are fully unit tested before any screen exists.

## 1. Scaffold

- [x] `npx create-expo-app` with the TypeScript blank template, expo-router enabled
- [x] App name Orexis, Android package `com.shakil.orexis`, `userInterfaceStyle: "light"`, portrait only
- [x] Install expo-sqlite, expo-notifications, expo-font, @expo-google-fonts/inter
- [x] Add `.gitattributes` (LF) and confirm `.gitignore` covers node_modules, .expo, android build output
- [x] Jest with jest-expo configured, one placeholder test passing
- [x] App bundles for Android (`expo export`); phone boot to be confirmed at phase 8
- [x] Commit

## 2. Constants, theme, domain

- [x] `src/constants.ts`: X, C, decay, notification hour
- [x] `src/theme.ts`: Notion light palette, Inter type scale, spacing, radii
- [x] `src/domain/dates.ts`: local date helpers, YYYY-MM-DD parse and format, add days, day-of-week, days since 1970-01-05
- [x] `src/domain/periods.ts`: cadence list, period for a cadence and date, next period start, max repeats per cadence
- [x] Tests for periods: every cadence, week and fortnight boundaries around New Year, month and quarter edges, leap day
- [x] `src/domain/availability.ts`: available dishes for a date given dishes and completions, progress count
- [x] Tests for availability: repeats exhausted, done today, weekdays on a Saturday, deleted dish
- [x] `src/domain/deficiency.ts`: score per dish from orders, order items, completions, rule history
- [x] Tests for deficiency: never ordered, ordered and skipped, mixed shortfall, decay after completion, cadence change mid-history, dish created mid-period
- [x] `src/domain/ordering.ts`: can order today, lock, can complete, sort dishes by deficiency within category, suggested set
- [x] Commit

## 3. Storage

- [ ] `src/db/schema.ts`: the six tables from SPEC.md, versioned migration runner
- [ ] `src/db/repo.ts`: list categories, list dishes, insert and update dish, delete dish with cascade, auto-delete empty category, rename and reorder category, snapshot rule history on cadence or repeats change
- [ ] `src/db/repo.ts`: get order for day, place order, list order items, insert completion, list completions since date
- [ ] Integration test against an in-memory SQLite with the full order, complete, delete flow
- [ ] Commit

## 4. Components

- [ ] Row with hairline divider
- [ ] Checkbox with check animation
- [ ] Chip, selectable
- [ ] Stepper with min and max
- [ ] Primary and secondary Button
- [ ] IconButton, round, top right
- [ ] Tag
- [ ] BottomSheet for confirmations and the category menu
- [ ] TextInput and numeric input styled to the theme
- [ ] Commit

## 5. Screens

- [ ] Router layout: `/` decides between order and today based on whether an order exists for today
- [ ] Order today: grouped list, checkboxes, Suggested tags, progress, running total, Place order, empty state
- [ ] Today: locked list, tick to complete, summary tiles, All done state
- [ ] Menu: categories with dishes and deficiency number, dots menu with Rename, Move up, Move down, Add dish row
- [ ] Dish form, add mode: name, category chips with New, duration, cadence chips, repeat stepper with cap, preview sentence, validation
- [ ] Dish form, edit mode: prefilled, Save, Delete dish with bottom sheet confirmation
- [ ] Reload data on screen focus
- [ ] Commit

## 6. Notifications and day rollover

- [ ] Request notification permission on first launch, Android 13 and later
- [ ] Notification channel, daily trigger at 07:00 local, re-register on every launch
- [ ] Tap opens the app at `/`, which routes to order or today
- [ ] Detect date change while the app is open or resumed and refresh the current screen
- [ ] Commit

## 7. Developer aids

- [ ] Dev-only seed script that inserts three categories and a dozen dishes
- [ ] Dev-only date override so period boundaries and deficiency can be exercised without waiting
- [ ] Commit

## 8. Build and install

- [ ] EAS preview profile producing an APK, or local `expo run:android` with the Android SDK installed
- [ ] Install on the phone, confirm notification arrives at 07:00 the next morning
- [ ] Commit

## 9. Manual verification

- [ ] Add dishes across several cadences, confirm caps on the stepper
- [ ] Place an order, confirm it locks and today's list matches
- [ ] Tick items, confirm progress and remaining minutes
- [ ] Advance the date, confirm the order screen reappears and completed repeats drop off
- [ ] Confirm deficiency rises for a skipped ordered dish more than for an unordered one
- [ ] Confirm Suggested tags follow the highest scores
- [ ] Edit a dish's cadence, confirm it applies from the next period
- [ ] Delete the last dish in a category, confirm the category disappears
- [ ] Rename and reorder a category

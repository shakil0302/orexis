# Orexis — design notes

Personal Android app. Each morning you order the day's activities from a menu of habits you maintain. The order is final. Neglected activities accumulate a deficiency score that quietly pushes them up the menu.

Decided 2026-09-27.

## 1. Concept and rules

**Name.** Orexis, Greek for appetite or desire, the root of orexin. Chosen over restaurant-flavoured and generic names. No French, no direct food reference.

**Personality.** Energy without judgement. The app presents options and records decisions. It never comments on what was not done. No streaks, badges, praise, history views, or end-of-day summaries.

**Menu.** A list of dishes grouped into categories. No caps on how much can be ordered. The only guard against over-ordering is a running total of estimated minutes shown while ordering.

**Dish.** Name, category, duration in minutes, cadence, repeat count.

**Cadences.** Fixed list, each defining a calendar period:

| Cadence | Period | Max repeats |
|---|---|---|
| Daily | one day | 1 |
| Weekdays | Monday to Friday | 5 |
| Weekends | Saturday and Sunday | 2 |
| Weekly | Monday to Sunday | 7 |
| Bi-weekly | 14 days from a Monday | 14 |
| Monthly | calendar month | 28 |
| Quarterly | calendar quarter | 90 |
| Half-yearly | calendar half | 180 |
| Yearly | calendar year | 365 |

Weeks start Monday. Weekly and bi-weekly periods are counted from 1970-01-05, the first Monday after the Unix epoch, so all devices share the same boundaries with no configuration. All date arithmetic runs on local calendar dates, never UTC timestamps.

**Repeats.** How many times per period a dish should be completed. Capped at the number of days in the period because a dish can be ordered at most once per day. Daily dishes hide the repeat control.

**Availability.** A dish appears on the order screen when it is not deleted, today falls inside its period, and its completions in the current period are fewer than its repeats. Once done today it drops off until tomorrow. Dishes with repeats show progress, for example "1 of 3".

**New dishes.** Available immediately. The first period is whatever remains of the current one, so a monthly dish created on the 28th has a short first window. Accepted; it self-corrects after one period.

**Ordering.** One order per day. Opened by the 07:00 notification or by launching the app. Submitting locks it. Nothing can be added or removed afterwards. No ad hoc items. No cutoff time is shown; the order screen stays open until an order is placed or the day ends. A day with no order is an unplanned day and counts as "not ordered" for every available dish.

**Completion.** Only ordered dishes can be ticked. At most one completion per dish per day. Unticked items simply remain unticked and vanish with the day.

**Deficiency.** A per-dish score computed from history, never stored.

- Constants: X = 1.0, C = 0.5, decay = 0.8. Hard-coded, no settings screen.
- Evaluated once per closed period, never per day, so cadences are comparable.
- Shortfall = repeats minus completions in the period.
- Failed-order days = days in the period where the dish was ordered and not completed.
- If the period had at least one completion, multiply the score by decay first.
- Each unit of shortfall adds X while failed-order days remain, then C times X for the rest.
- Ordering and not doing costs more than not ordering, on purpose. Honest skipping is cheaper than false commitment.
- Recomputed from raw rows on app open and after each completion. No cache.

**Presentation of deficiency.** Never shown as a warning. Dishes sort by score within their category. The top-scoring dish in each category carries a "Suggested" tag on the order screen when its score is above zero. The raw number appears only on the menu editor, in muted grey.

**Categories.** Created inline from the dish form via a "New" chip. Deleted automatically when their last dish is removed or moved. Can be renamed and reordered. No caps.

**Editing a dish.** Name, category, and duration apply immediately, including on today's list. Cadence and repeats apply from the next period; the current period keeps the old values via a snapshot so its tick stays honest.

**Deleting a dish.** Confirmed once via a bottom sheet. Physically deletes the dish row together with its order items, completions, and rule snapshots. Today's order row is kept so the day stays locked; older order rows left with no items are removed.

**Purging.** None. Data volume is a few megabytes per decade. Purging would require a frozen baseline score per dish, a second source of truth. If ever needed, a per-dish settled-through date can be added later.

## 2. Screens and appearance

**Order today.** Available dishes grouped by category, sorted by deficiency. Checkbox, Suggested tag where applicable, duration, progress for repeated dishes. Footer shows item count and total minutes. Primary button "Place order". Edit-menu icon top right.

**Today.** The locked order. Tick to complete. Two summary tiles: done count and remaining minutes. Nothing else. Edit-menu icon top right.

**Menu.** Categories with dishes, each showing cadence, repeats, duration, and the deficiency number. Dots menu per category: Rename, Move up, Move down. "Add dish" row per category. Close icon top right.

**Dish form.** Shared by add and edit. Name, category chips plus New, duration, cadence chips, repeat stepper with cap shown, plain-language preview sentence. "Add to menu" or "Save". Edit variant has a red "Delete dish" link at the very bottom.

**Notification.** Repeating local notification at 07:00, re-registered on every app launch. Deep links to the order screen, or to today if an order already exists.

**Theme.** Light only. Notion's published light palette, unchanged:

| Role | Hex |
|---|---|
| Page | #FFFFFF |
| Gray background | #F1F1EF |
| Text | #373530 |
| Gray text | #787774 |
| Divider | #E9E9E7 |
| Blue | #487CA5 |
| Blue background | #E9F3F7 |
| Red text | #C4554D |

Blue is the only accent: primary button, checked state, Suggested tag. Red is used only for the delete link.

**Type.** Inter, two weights. Title 20 medium, body 16 regular, meta 13 regular with tabular figures, category header 12 medium in gray text, button 16 medium, tag 11 medium. Sentence case everywhere. Durations read "60 min".

**Components.** Hairline-separated rows, one primary button per screen, pill chips, a stepper, bottom sheets for confirmation, round icon button top right. No tabs, no floating action button. 8px spacing grid, 16px screen margins, 6px radius on controls, 12px on sheets.

**Copy.**

| Moment | Line |
|---|---|
| Notification | Your menu is ready. Plan today. |
| Order screen title | Order today |
| Submit | Place order |
| After submit | Order placed |
| Recommendation tag | Suggested |
| All ticked | All done |
| Nothing available | Nothing on the menu today |
| Empty menu | Add your first dish |

No exclamation marks, no first person, no ellipses.

## 3. Technical

**Stack.** Expo with TypeScript, expo-router, expo-sqlite, expo-notifications, expo-font. Android only. No server, no accounts, no sync. No state library; data reloads from SQLite on screen focus.

**Architecture.** Three layers with one-way dependency. Screens are thin React Native components. Domain is pure TypeScript with no React or SQLite imports: periods, availability, deficiency, ordering. Storage is a small repository over SQLite.

**Schema.**

```sql
CREATE TABLE categories (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  position  INTEGER NOT NULL
);

CREATE TABLE dishes (
  id            TEXT PRIMARY KEY,
  category_id   TEXT NOT NULL REFERENCES categories(id),
  name          TEXT NOT NULL,
  duration_min  INTEGER NOT NULL,
  cadence       TEXT NOT NULL,
  repeats       INTEGER NOT NULL DEFAULT 1,
  created_on    TEXT NOT NULL
);

CREATE TABLE dish_rule_history (
  dish_id       TEXT NOT NULL REFERENCES dishes(id),
  period_start  TEXT NOT NULL,
  cadence       TEXT NOT NULL,
  repeats       INTEGER NOT NULL,
  PRIMARY KEY (dish_id, period_start)
);

CREATE TABLE orders (
  day        TEXT PRIMARY KEY,
  placed_at  TEXT NOT NULL
);

CREATE TABLE order_items (
  day      TEXT NOT NULL REFERENCES orders(day),
  dish_id  TEXT NOT NULL REFERENCES dishes(id),
  PRIMARY KEY (day, dish_id)
);

CREATE TABLE completions (
  day      TEXT NOT NULL,
  dish_id  TEXT NOT NULL REFERENCES dishes(id),
  done_at  TEXT NOT NULL,
  PRIMARY KEY (day, dish_id)
);
```

Dates are YYYY-MM-DD local. Timestamps are ISO. Everything the UI shows is derived from these tables.

**Constants file.** X, C, decay, week start, notification time.

## Rejected along the way

- Weekly review screen. The deficiency sort carries the same signal.
- Ad hoc specials. Everything on today's list comes from the menu.
- Adding or removing after ordering. Planning is once per day.
- Configurable not-before and not-after windows. Replaced by fixed cadences.
- Settings screen for X, C, decay, cutoff. Constants in code.
- Visible cutoff or opening times.
- Amber and coral deficiency colours. Judgement by another name.
- Serif display type, cream palette, restaurant copy. Not professional enough.
- Dark mode.
- Names: Carte, Du Jour, Course, Ordered, Docket, Slate, Intent, Orexin, Appetite, Verve, Zest.

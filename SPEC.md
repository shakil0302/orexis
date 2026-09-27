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

**Ordering.** One order per day. Opened by launching the app. Submitting locks it. Nothing can be added or removed afterwards. No ad hoc items. No cutoff time is shown; the order screen stays open until an order is placed or the day ends. A day with no order is an unplanned day and counts as "not ordered" for every available dish.

**Completion.** Only ordered dishes can be ticked. At most one completion per dish per day. Unticked items simply remain unticked and vanish with the day.

**Deficiency.** A per-dish score computed from history, never stored.

- Constants: X = 1.0, C = 0.5, decay = 0.8. Hard-coded, no settings screen.
- Accrues day by day, so the score rises with every day a dish waits. A weekly dish left undone through Thursday is higher on Friday than it was on Thursday.
- A day counts when it is in the past, the dish's period has started, and its repeats for that period are not yet met. Today never counts.
- Each such day adds a slice of X: the full slice if the dish was ordered and not done, C times the slice if it was not ordered.
- The slice is repeats divided by days in the period, so a weekly dish untouched all week reaches the same total as a daily dish skipped once. Cadences stay comparable.
- Each completion multiplies the score by decay.
- Ordering and not doing costs more than not ordering, on purpose. Honest skipping is cheaper than false commitment.
- Recomputed from raw rows on app open and after each completion. No cache.

**Presentation of deficiency.** Never shown as a warning. Dishes sort by score within their category. The top-scoring dish in each category carries a "Chef's pick" tag on the order screen when its score is above zero. The raw number appears only on the menu editor, in muted grey.

**Categories.** Created inline from the dish form via a "New" chip. Deleted automatically when their last dish is removed or moved. Can be renamed and reordered. No caps.

**Editing a dish.** Name, category, and duration apply immediately, including on today's list. Cadence and repeats apply from the next period; the current period keeps the old values via a snapshot so its tick stays honest.

**Deleting a dish.** Confirmed once via a bottom sheet. Physically deletes the dish row together with its order items, completions, and rule snapshots. Today's order row is kept so the day stays locked; older order rows left with no items are removed.

**Purging.** None. Data volume is a few megabytes per decade. Purging would require a frozen baseline score per dish, a second source of truth. If ever needed, a per-dish settled-through date can be added later.

## 2. Screens and appearance

**Order today.** Available dishes grouped by category, sorted by deficiency. Checkbox, Chef's pick tag where applicable, duration, progress for repeated dishes. Footer shows item count and total minutes. Primary button "Place order". Edit-menu icon top right.

**Today.** The locked order. Tick to complete. Two summary tiles: done count and remaining minutes. Nothing else. Edit-menu icon top right.

**Menu.** Categories with dishes, each showing cadence, repeats, duration, and the deficiency number. Dots menu per category: Rename, Move up, Move down. "Add dish" row per category. Close icon top right.

**Dish form.** Shared by add and edit. Name, category chips plus New, duration, cadence chips, repeat stepper with cap shown, plain-language preview sentence. "Add to menu" or "Save". Edit variant has a red "Delete dish" link at the very bottom.

**Notification.** None. You open the app. A morning prompt was in the original design but was dropped when the app moved to the web; a scheduled web push sender could bring it back later.

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

Blue is the only accent: primary button, checked state, Chef's pick tag. Red is used only for the delete link.

**Type.** Inter, two weights. Title 20 medium, body 16 regular, meta 13 regular with tabular figures, category header 12 medium in gray text, button 16 medium, tag 11 medium. Sentence case everywhere. Durations read "60 min".

**Components.** Hairline-separated rows, one primary button per screen, pill chips, a stepper, bottom sheets for confirmation, round icon button top right. No tabs, no floating action button. 8px spacing grid, 16px screen margins, 6px radius on controls, 12px on sheets.

**Copy.**

| Moment | Line |
|---|---|
| Order screen title | Order today |
| Submit | Place order |
| After submit | Order's in (brief toast) |
| Recommendation tag | Chef's pick |
| All ticked | Kitchen's clean |
| Nothing available | Kitchen's closed today |
| Empty menu | Add your first dish |

Restaurant voice in the words, neutral palette on the screen. No exclamation marks, no first person, no ellipses, and never a comment on what was not done.

## 3. Technical

**Stack.** Expo with TypeScript, expo-router, expo-font, react-native-web. Web first, installed to the phone's home screen from Chrome and hosted on GitHub Pages; Android native stays buildable. No server, no accounts, no sync. No state library; data reloads from storage on screen focus.

**Architecture.** Three layers with one-way dependency. Screens are thin React Native components. Domain is pure TypeScript with no React or storage imports: periods, availability, deficiency, ordering. Storage is a repository over one in-memory JSON document that is written back after every change.

**Document.** One JSON object holding everything, versioned so older files can be upgraded on load:

```ts
interface Document {
  version: number;
  categories:  { id, name, position }[];
  dishes:      { id, categoryId, name, durationMin, cadence, repeats, createdOn, deletedOn }[];
  snapshots:   { dishId, periodStart, cadence, repeats }[];   // rule in force for a period edited mid-way
  orders:      { day, placedAt }[];                            // one per planned day
  orderItems:  { day, dishId }[];
  completions: { day, dishId, doneAt }[];                      // at most one per dish per day
}
```

The repository keeps the document in memory, returns copies from reads, and writes the whole document back after every change. Stores: `localStorage` on web, a file in the app's documents directory on Android, memory in tests. `exportJson` and `importJson` back the backup and restore feature.

Dates are YYYY-MM-DD local. Timestamps are ISO. Everything the UI shows is derived from this document.

**Constants file.** X, C, decay, week start.

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

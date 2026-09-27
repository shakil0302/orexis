# Orexis

Personal Android app. Each morning you order the day's activities from a menu of habits you maintain. The order is final, and dishes you keep putting off drift to the top of the menu as their deficiency grows.

[SPEC.md](SPEC.md) records every design decision. [CHECKLIST.md](CHECKLIST.md) tracks build progress.

## Requirements

- Node 22 or newer and npm.
- The Expo Go app on the phone for development.
- A free Expo account for building the installable APK.

Expo Go cannot show notifications on Android, so the 07:00 prompt only works in the EAS build. Everything else runs in Expo Go.

## Getting started

```bash
npm install
npm start
```

Scan the QR code with Expo Go. The app opens on the order screen; the menu is empty until you add a dish or seed the sample menu from the development panel.

## Commands

| Command | What it does |
|---|---|
| `npm start` | Metro dev server for Expo Go |
| `npm test` | Jest: domain, storage, and screen tests |
| `npm run lint` | ESLint via `expo lint` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run bundlecheck` | Bundles the Android app once to catch import errors |
| `npm run verify` | All of the above, in order. Run before committing |

## Building the APK

No Android SDK or JDK is needed locally. EAS builds in the cloud:

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

The build page gives a download link. Install the APK on the phone and open it once so the 07:00 notification is scheduled.

## Development panel

In Expo Go and development builds the menu screen ends with a development section that is compiled out of release builds:

- Seed sample menu: fills an empty menu with three categories and a dozen dishes.
- Day +1 and Real date: pretend today is a later date, to exercise period boundaries and deficiency without waiting. Cleared on restart.
- Notify in 5 s: schedules the morning notification a few seconds out. Only works outside Expo Go.

## Layout

| Path | Contents |
|---|---|
| `src/app` | Routes. `index` redirects to `order` or `today`; `menu`, `dish/new`, `dish/[id]` |
| `src/screens` | The shared dish form and the screen tests |
| `src/components` | Themed primitives |
| `src/domain` | Pure logic: dates, periods, rules, availability, deficiency, ordering, format |
| `src/db` | SQLite schema, migrations, repository. `testDb.ts` adapts Node's built-in SQLite for Jest only |
| `src/state` | Per-day data loading for screens |
| `src/notifications.ts` | Daily trigger and the development test notification |
| `src/dev/seed.ts` | Sample menu |
| `src/constants.ts` | Deficiency constants and notification time |
| `src/theme.ts` | Palette, type scale, spacing |

Test files must not live under `src/app`, because Expo Router treats every file there as a route.

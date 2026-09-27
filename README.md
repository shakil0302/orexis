# Orexis

Personal Android app. Each morning you order the day's activities from a menu of habits you maintain. The order is final. See [SPEC.md](SPEC.md) for every design decision and [CHECKLIST.md](CHECKLIST.md) for build progress.

## Requirements

- Node 22. The system Node on this machine is older than Expo SDK 57 needs, so a project-local copy lives in `.tools/node` (gitignored). Prefix commands with it:

```bash
export PATH="$PWD/.tools/node:$PATH"
```

- The Expo Go app on the phone for development, or an APK built with EAS for daily use.

## Commands

```bash
npm start            # Metro dev server; scan the QR code with Expo Go
npm test             # Jest: domain, storage, and screen tests
npm run typecheck    # tsc --noEmit
```

## Building the APK

Local native builds need Android Studio and a JDK, which are not installed here. EAS builds in the cloud instead and only needs a free Expo account:

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

The build page gives a download link for the APK. Install it on the phone, open it once so the 07:00 notification is scheduled, and you're done.

## Layout

- `src/app` routes: `index` redirects to `order` or `today`, plus `menu` and `dish/new`, `dish/[id]`
- `src/domain` pure logic: dates, periods, rules, availability, deficiency, ordering, format
- `src/db` SQLite schema, migrations, repository; `testDb.ts` is a node:sqlite adapter for Jest only
- `src/components` themed primitives
- `src/state` per-day data loading
- `src/notifications.ts` daily trigger
- `src/dev/seed.ts` sample menu, reachable from the menu screen in development builds

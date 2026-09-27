# Orexis

Personal habit app for the phone, installed from the browser. Each morning you order the day's activities from a menu of habits you maintain. The order is final, and dishes you keep putting off drift to the top of the menu as their deficiency grows.

[SPEC.md](SPEC.md) records every design decision. [CHECKLIST.md](CHECKLIST.md) tracks build progress.

## Requirements

- Node 22 or newer and npm.
- A browser. The Expo Go app on the phone is optional for the Android build.

## Getting started

```bash
npm install
npm run web
```

The app opens in the browser on the order screen; the menu is empty until you add a dish or seed the sample menu from the development panel. `npm start` serves it to Expo Go instead.

## Commands

| Command | What it does |
|---|---|
| `npm run web` | Dev server for the browser |
| `npm start` | Dev server for Expo Go |
| `npm test` | Jest: domain, repository, and screen tests |
| `npm run lint` | ESLint via `expo lint` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run bundlecheck` | Bundles the Android and web apps once to catch import errors |
| `npm run verify` | All of the above, in order. Run before committing |
| `npm run build:web` | Exports the web app to `dist/` with manifest, icons, and a precaching service worker |
| `npm run serve:dist` | Serves `dist/` locally the way a static host would |
| `npm run icons` | Regenerates `public/icons` from `assets/icon.png` |

## Backup

Browser storage can be cleared by you or evicted by the system, and there is no server, so the menu screen has Back up, which downloads everything as a JSON file, and Restore, which replaces everything with a chosen file after confirmation. Do it now and then.

## Development panel

In Expo Go and development builds the menu screen ends with a development section that is compiled out of release builds:

- Seed sample menu: fills an empty menu with three categories and a dozen dishes.
- Day +1 and Real date: pretend today is a later date, to exercise period boundaries and deficiency without waiting. Cleared on restart.

## Layout

| Path | Contents |
|---|---|
| `src/app` | Routes. `index` redirects to `order` or `today`; `menu`, `dish/new`, `dish/[id]` |
| `src/screens` | The shared dish form and the screen tests |
| `src/components` | Themed primitives |
| `src/domain` | Pure logic: dates, periods, rules, availability, deficiency, ordering, format |
| `src/db` | The JSON document model, the repository over it, and the stores: `localStorage` on web, a file on Android, memory in tests |
| `src/state` | Per-day data loading for screens |
| `src/dev/seed.ts` | Sample menu |
| `public/` | Web manifest and icons, copied into the build as-is |
| `scripts/` | Icon generation, the web build with service worker injection, and the local static server |
| `src/constants.ts` | Deficiency constants |
| `src/theme.ts` | Palette, type scale, spacing |

Test files must not live under `src/app`, because Expo Router treats every file there as a route.

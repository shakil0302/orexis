# Orexis — web migration checklist

Goal: run Orexis as an installable web app on the phone, added to the home screen from Chrome, with no store and no sideloading. The notification track is dropped. Android native stays buildable but is no longer the primary target.

Each phase ends with `npm run verify` green and a commit. Phases 1 and 2 have no visible change and are covered by tests before any web work starts.

## 1. Drop notifications and record the decisions

- [x] Remove `src/notifications.ts`, the launch hook in `src/app/_layout.tsx`, and the "Notify in 5 s" development button
- [x] Uninstall expo-notifications and remove its plugin entry from `app.json`
- [x] Remove the notification constants from `src/constants.ts`
- [x] SPEC.md: notification section becomes "none; you open the app", platform becomes web first, storage becomes a JSON document
- [x] CHECKLIST.md: mark phases 8 and 9 superseded by this file
- [x] README: remove the notification and EAS sections for now
- [x] Commit

## 2. Replace SQLite with a JSON document store

Keeps the repository synchronous, so screens and the domain layer do not change.

- [x] `src/db/store.ts`: `DocumentStore` interface with `load(): string | null` and `save(json: string): void`
- [x] `src/db/model.ts`: the document shape (categories, dishes, snapshots, orders, orderItems, completions) with a version field
- [x] `src/db/repo.ts`: same public methods as today, operating on the in-memory document and calling `save` after every write
- [x] Web store over `localStorage`; native store over expo-file-system (check the SDK 57 docs for the synchronous File API before writing it)
- [x] `src/db/open.ts`: pick the store by platform, load once, migrate the document version
- [x] In-memory store for Jest; port `repo.test.ts` unchanged apart from setup
- [x] Delete `schema.ts`, `sql.ts`, `testDb.ts`, and uninstall expo-sqlite and its plugin entry
- [x] Screen tests keep passing against the in-memory store
- [x] Commit

## 3. Enable the web platform

- [x] `app.json`: add `"web"` to platforms, set `web.bundler` to metro and `web.output` to single
- [x] `npx expo install react-native-web react-dom`
- [x] `npm run web` starts and the four screens render in a desktop browser
- [x] Replace the Android-only toast with a small cross-platform `Toast` component and use it for "Order's in"
- [x] Check on web: Inter loads, the bottom sheet modal opens and closes, hairline dividers show, numeric keyboard on the duration field, safe-area padding is harmless
- [x] Date rollover: confirm the foreground check fires on tab visibility change
- [x] Commit

## 4. Installable shell

- [x] `public/manifest.json`: name, short name, start URL, standalone display, background and theme colours, 192 and 512 px icons plus a maskable icon
- [x] `src/app/+html.tsx`: link the manifest, set theme colour and viewport, register the service worker
- [x] Service worker via Workbox `generateSW` over the exported `dist/`, precaching the app shell so it launches offline
- [x] `npm run build:web` script: `expo export -p web` then the Workbox step
- [x] Request persistent storage on first launch so the browser does not evict the data
- [x] Commit

## 5. Backup and restore (deferred)

Browser storage can be cleared by the user or the system. Deferred for now; the repository keeps `exportJson` and `importJson` so the menu rows can be added back later.

- [ ] Menu screen: "Back up" row that exports the document as a JSON download, and a "Restore" row that reads a chosen file and replaces the document after confirmation

## 6. Hosting on GitHub Pages

The site lives at `https://shakil0302.github.io/orexis/`, so everything must work under the `/orexis/` sub-path.

- [x] Create the GitHub repository and push `main` (public, or private on a paid plan; Pages needs one or the other)
- [x] `app.config.js` sets `experiments.baseUrl` from `WEB_BASE_URL`, so local builds stay at the root and the workflow builds under `/orexis`
- [x] Manifest: `start_url` and `scope` set to `/orexis/`; icon paths relative to it
- [x] Service worker registered at `/orexis/sw.js` with precache paths under the sub-path
- [x] Copy `index.html` to `404.html` in `dist/` so a refresh on `/orexis/menu` still loads the app
- [x] `.github/workflows/pages.yml`: on push to `main`, install, run `npm run verify`, build web, upload `dist/`, deploy with the official Pages actions
- [x] Repository settings: Pages source set to GitHub Actions
- [x] First deploy: confirm the manifest and service worker are served and the install prompt appears
- [x] README: the URL and how deploys happen
- [x] Commit

## 7. Verification on the phone

- [ ] Open the URL in Chrome, confirm the install prompt, add to home screen
- [ ] Launch from the icon: full screen, no browser chrome
- [ ] Add dishes across cadences, place an order, tick items, reopen: data persists
- [ ] Turn on flight mode, launch from the icon: the app opens
- [ ] Development panel: seed, Day +1, confirm deficiency and Chef's pick move as expected
- [ ] Back up, clear site data, restore

## Out of scope for now

- Any morning prompt. Revisit with a scheduled web push sender if wanted later.
- Sync between devices.
- Migrating data out of the old SQLite database on Android; it only ever held test data.

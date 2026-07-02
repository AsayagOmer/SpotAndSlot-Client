# Spot&Slot — Smart Parking clients

The client side of the Smart Parking system (course: *Ambient Invisible
Intelligence*), split into **two apps that share one codebase**:

| App | Audience | Where it runs | Dev | Build output |
|---|---|---|---|---|
| **Mobile** (`mobile/`, `src/apps/mobile`) | Drivers (END_USER) | **Android app** (Capacitor) or mobile browser | `npm run dev:mobile` → :8080 | `dist/mobile` → `android/` |
| **Admin** (`admin/`, `src/apps/admin`) | Lot administrators | Desktop browser | `npm run dev:admin` → :8090 | `dist/admin` |

Both are Vite + React + TypeScript + shadcn/ui + Tailwind + TanStack Query and
share `src/` (API client, auth, hooks, UI components). Every number shown comes
from the Smart Parking REST API — no mock data.

## Mobile app (drivers)

- Sign-in / sign-up (public sign-up creates `END_USER` accounts), Hebrew RTL.
- **Lot selector** — pick which parking lot to view.
- **Live map** — sections and slots in real time (~5 s polling), handicap spots,
  occupancy %, "notify me when a spot frees up".
- **Predictions** — full-day ML forecast with a P10–P90 confidence band.
- **Server address** — on a phone, `localhost` is the phone; the login screen has
  a collapsible "כתובת שרת" field to point at the API
  (e.g. `http://192.168.1.20:8084/ambient-invisible-intelligence`). Persisted.

### Build the Android app (APK)

Prerequisites: Android Studio (bundled JDK is used) + Android SDK.

```sh
npm install                # first time only
npm run cap:sync           # builds dist/mobile and syncs it into android/
cd android
JAVA_HOME="C:/Program Files/Android/Android Studio/jbr" ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

Install `app-debug.apk` on a device/emulator (`adb install`), or open `android/`
in Android Studio and run. If Gradle can't find the SDK, create
`android/local.properties` with `sdk.dir=C:/Users/<you>/AppData/Local/Android/Sdk`
(forward slashes).

## Admin app (desktop)

- **ADMIN-only**: sign-in rejects non-admin accounts; all routes are guarded.
- Sidebar navigation: **Dashboard** (stats + per-lot occupancy), **My Lots**
  (create/rename/delete lots, manage sections & slots, run health checks),
  **Users** (list + create users incl. other admins), **Activity** (command
  history).
- Scoped by ownership: each admin sees and manages only the lots they created.

## How the apps talk to the backend

| Concern | File |
|---|---|
| API base URL, system id | `.env` (see `.env.example`) + runtime override (`getServerBase`) |
| Typed API client (objects, commands, users, admin, auth) | `src/lib/api.ts` |
| Signed-in user state | `src/lib/auth.tsx` |
| Selected lot state (mobile) | `src/lib/selectedLot.tsx` |
| Data fetching, polling, slot mapping | `src/hooks/useParkingData.ts` |
| Admin data/stat scoping + mutations | `src/apps/admin/hooks.ts` |

- **API calls** go to the Spring server (`/ambient-invisible-intelligence`,
  default `http://localhost:8084`).
- **The ML forecast**: in web dev the Vite proxy forwards `/ml` → `:5000`
  (`vite.config.mobile.ts`); the native Android app calls the ML service
  directly on the API server's host (`mlUrl()` in `src/lib/api.ts`).

Seeded demo users (server `initDemos` profile):

| Email | Password | Role | Owns |
|---|---|---|---|
| `admin@demo.org` | `Admin@1` | ADMIN | North TLV Lot, Central Lot |
| `admin2@demo.org` | `Admin@2` | ADMIN | South Beach Lot |
| `operator@demo.org` | `Oper@1` | OPERATOR | — |
| `user@demo.org` | `User@1` | END_USER | — |

## Run (web dev)

```sh
npm install          # first time only
npm run dev:mobile   # driver app  → http://localhost:8080
npm run dev:admin    # admin app   → http://localhost:8090
```

Prerequisites for full functionality:

- the **Smart Parking API** on `http://localhost:8084`
- the **ML prediction service** on `http://localhost:5000` (Predictions tab;
  everything else works without it)

Other scripts: `npm run build` (both apps), `npm run build:mobile`,
`npm run build:admin`, `npm run cap:sync`, `npm run lint`.

## Notes

- If the API is unreachable, both apps show a clear "no connection" state.
- The slot grid maps API data as: `REGULAR/FREE → available`,
  `REGULAR/OCCUPIED → occupied`, `HANDICAP/FREE → disabled-available`,
  `HANDICAP/OCCUPIED → disabled-occupied`.
- The Android WebView allows cleartext HTTP (demo convenience —
  `capacitor.config.ts`); the API's CORS config accepts the Capacitor origins
  and LAN addresses.

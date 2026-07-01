# Spot&Slot — Smart Parking client

The web client for the Smart Parking system (course: *Ambient Invisible
Intelligence*). It is a **thin client** over the Smart Parking REST API — every
number it shows comes from the server, not from mock data.

Built with **Vite + React + TypeScript + shadcn/ui + Tailwind CSS** and
**TanStack Query**.

## Views

| Route | View | What it shows |
|---|---|---|
| `/login`, `/signup` | **Auth** | Real sign-in for all roles; public sign-up creates `END_USER` accounts. Admins land on `/admin`, everyone else on `/`. |
| `/` | **Live** (default tab) | The selected parking lot in real time — sections and slots, occupancy %, handicap spots. A **lot selector** switches between lots. Polls the API every ~5 s. |
| `/` | **Predictions** tab | A full-day availability forecast from the ML model, drawn as a median curve with a **P10–P90 confidence band**, plus holiday awareness. Varies by the selected date and lot. |
| `/admin` | **Admin console** (ADMIN only) | Stats and management for **the lots this admin created**: create/rename/delete lots, add/rename/delete sections, add/edit/delete slots (status, kind, health), run health checks, create users (incl. other admins), and view the users list + command-history feed. |

## Auth & ownership model

- Sign-in uses the server's stateless `GET /users/login` endpoint; the
  signed-in identity is kept in `localStorage` and stamped onto every
  `invokedBy`/`createdBy` and ownership (`userEmail`) parameter.
- **Each admin manages only the lots they created** (`createdBy`); the server
  enforces this on create/update/delete (HTTP 403 otherwise).
- Public sign-up always creates an `END_USER`; only an existing admin can
  create `ADMIN`/`OPERATOR` accounts (from the Users tab in `/admin`).

Seeded demo users (when the server runs with the `initDemos` profile):

| Email | Password | Role | Owns |
|---|---|---|---|
| `admin@demo.org` | `Admin@1` | ADMIN | North TLV Lot, Central Lot |
| `admin2@demo.org` | `Admin@2` | ADMIN | South Beach Lot |
| `operator@demo.org` | `Oper@1` | OPERATOR | — |
| `user@demo.org` | `User@1` | END_USER | — |

## How it talks to the backend

| Concern | File |
|---|---|
| API base URL, system id | `.env` (see `.env.example`) |
| Typed API client (objects, commands, users, admin, auth) | `src/lib/api.ts` |
| Signed-in user state | `src/lib/auth.tsx` |
| Selected lot state | `src/lib/selectedLot.tsx` |
| Data fetching, polling, slot mapping | `src/hooks/useParkingData.ts` |
| Live lot map | `src/components/ParkingLotMap.tsx` |
| Predictions (forecast + band) | `src/components/PredictionsView.tsx` |
| Admin dashboard | `src/pages/Admin.tsx` |

- **API calls** go to `VITE_API_BASE_URL` (the Spring server,
  `/ambient-invisible-intelligence`).
- **The forecast** is fetched from the ML service's `/forecast` endpoint through
  a Vite dev proxy: the browser calls `/ml/forecast` (same-origin) and Vite
  forwards it to `http://localhost:5000` (see `vite.config.ts`).

### Configuration (`.env`)

Copy `.env.example` to `.env` to override the defaults:

```
VITE_API_BASE_URL=http://localhost:8084/ambient-invisible-intelligence
VITE_SYSTEM_ID=2026b.Omer.Asayag
VITE_API_VERSION=1.3
```

The same values are also the built-in fallbacks in `src/lib/api.ts`, so the app
runs against a local server even without a `.env`. The app's identity comes
from the signed-in user, not from env.

## Run

```sh
npm install      # first time only
npm run dev      # http://localhost:8080
```

Prerequisites for full functionality:

- the **Smart Parking API** on `http://localhost:8084` (see the API repo README)
- the **ML prediction service** on `http://localhost:5000` for the Predictions tab
  (the Live and Admin views work without it)

Other scripts: `npm run build` (production build), `npm run lint`.

## Notes

- If the API is unreachable, the Live and Admin views show a clear
  "no connection" state with a retry, instead of crashing.
- The slot grid maps API data as: `REGULAR/FREE → available`,
  `REGULAR/OCCUPIED → occupied`, `HANDICAP/FREE → disabled-available`,
  `HANDICAP/OCCUPIED → disabled-occupied`.

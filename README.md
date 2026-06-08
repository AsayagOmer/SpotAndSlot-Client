# Spot&Slot — Smart Parking client

The web client for the Smart Parking system (course: *Ambient Invisible
Intelligence*). It is a **thin client** over the Smart Parking REST API — every
number it shows comes from the server, not from mock data.

Built with **Vite + React + TypeScript + shadcn/ui + Tailwind CSS** and
**TanStack Query**.

## Views

| Route | View | What it shows |
|---|---|---|
| `/` | **Live** (default tab) | The parking lot in real time — sections and slots, occupancy %, handicap spots. Polls the API every ~5 s. |
| `/` | **Predictions** tab | A full-day availability forecast from the ML model, drawn as a median curve with a **P10–P90 confidence band**, plus holiday awareness. Varies by the selected date. |
| `/admin` | **Admin console** | System overview (lots / sections / slots / free / faulty), per-lot health with a **Run health check** action, the **users** list, and the **command-history** activity feed. Reached via the shield icon in the header. |

## How it talks to the backend

| Concern | File |
|---|---|
| API base URL, system id, identity | `.env` (see `.env.example`) |
| Typed API client (objects, commands, users, admin) | `src/lib/api.ts` |
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
VITE_USER_EMAIL=admin@demo.org
```

The same values are also the built-in fallbacks in `src/lib/api.ts`, so the app
runs against a local server even without a `.env`.

## Run

```sh
npm install      # first time only
npm run dev      # http://localhost:8080
```

Prerequisites for full functionality:

- the **Smart Parking API** on `http://localhost:8084` (see the repo root README)
- the **ML prediction service** on `http://localhost:5000` for the Predictions tab
  (the Live and Admin views work without it)

Other scripts: `npm run build` (production build), `npm run lint`.

## Notes

- If the API is unreachable, the Live and Admin views show a clear
  "no connection" state with a retry, instead of crashing.
- The slot grid maps API data as: `REGULAR/FREE → available`,
  `REGULAR/OCCUPIED → occupied`, `HANDICAP/FREE → disabled-available`,
  `HANDICAP/OCCUPIED → disabled-occupied`.

# AntonLiner System — Backend (Deno + Oak)

API for the AntonLiner / Smart Drilling marketplace: connects customers with
water-service providers (borehole drilling, test pumping, hydrogeological
surveys, pump installation, …), handles M-Pesa STK/C2B payments and bulk SMS.

## Layout

```
config/        env-driven configuration (no secrets in code)
db/            MySQL pool + schema.sql + seed.sql
deps.ts        single place for all remote dependencies
interfaces/    shared domain types
middlewares/   logger, error handler, 404, JWT auth guard
repositories/  data access — every query is parameterised
services/      token (JWT), SMS (Onfon), M-Pesa (Daraja), booking reconciliation
controllers/   thin HTTP handlers
routes/        route → controller wiring
server.ts      entrypoint
```

## Setup

1. **Install Deno** (≥ 1.40 / 2.x).
2. **Configure env** — copy and fill in:
   ```bash
   cp .env.example .env
   ```
   `.env` is gitignored; never commit real secrets.
3. **Create the database** (one-time):
   ```bash
   mysql -h 127.0.0.1 -P 3344 -u root -p < db/schema.sql   # tables
   mysql -h 127.0.0.1 -P 3344 -u root -p waterdril < db/seed.sql   # optional sample data
   ```
4. **Run:**
   ```bash
   deno task dev      # watch mode
   deno task start    # production
   deno task check    # type-check
   ```
   Server listens on `PORT` (default 5002).

## Database

`db/schema.sql` creates the `waterdril` database and all tables the code uses.
It corrects gaps in the legacy dump:

- `users` gains `email`, `customer_type`, `booking_status`.
- New `sms_logs` table (outbound SMS audit).
- New `complaints` table (the legacy code referenced a non-existent table).
- `role` enum uses `owner` (legacy data had the typo `onwer`).
- utf8mb4 across all tables; foreign keys + indexes matching query patterns.

## Security notes (changed from the legacy code)

- All secrets moved to environment variables.
- **All SQL is parameterised** — the legacy string-interpolated date/id/location
  values (SQL-injection holes) are gone.
- Real JWT auth guard in `middlewares/auth.ts`. It is **not** globally applied,
  because the existing mobile app / portal call the API without strict tokens;
  apply it per-route (`router.post("/x", auth, handler)`) when clients are ready.

## API

Routes/verbs are unchanged from the legacy API so existing clients keep working
(`routes/user.route.ts`). Health check: `GET /`.

### Real-time tracking — `GET /ws` (WebSocket)

Live driver→passenger location streaming (raw WebSocket, replaces the old
Firebase Realtime DB channel). In-memory hub in `controllers/trackController.ts`:

- Driver client sends `{ "role": "driver", "driverId": "<users.id>", "lat": <n>, "lng": <n> }`
  on every GPS fix.
- Passenger client sends `{ "role": "passenger", "driverId": "<users.id>" }` once to
  subscribe, then receives `{ "type": "location", "driverId", "lat", "lng" }` for each
  driver fix (the last known point is replayed on subscribe). When the driver socket
  drops, subscribers get `{ "type": "offline", "driverId" }`.

`driverId` is the provider's `users.id`. Durable coordinates are still persisted via
the REST `POST /update_location` endpoint; the socket is the live channel only.

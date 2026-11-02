# SmartDrill

A booking platform for borehole drilling and related services. A customer asks for a service, SmartDrill quotes and invoices it, the customer pays by M-Pesa, a provider is assigned and scheduled, the customer follows the provider live on a map, and the job is signed off and paid out.

Side project, 2023 to date. One developer.

## What's in here

| Folder | What it is | Stack |
|---|---|---|
| `DriverApp/` | Android app for service providers: incoming requests, job detail and status, live location sharing, payment requests, earnings | Kotlin, Jetpack Compose, Maps Compose, Retrofit, Firebase Messaging, foreground location service |
| `PassengerApp/` | Android app for customers: book a service, see bookings, track the provider live | Kotlin, Jetpack Compose, Maps Compose, Retrofit |
| `waterdril_back/` | The API: bookings and their lifecycle, quotes, invoices, M-Pesa STK push and C2B callbacks, payouts, provider verification, ratings, complaints, SMS and push notifications, audit log, role-based access, WebSocket live tracking | Deno, TypeScript, MySQL |
| `portal/` | Admin portal: requests, providers, customers, payments, payouts, complaints, reviews, SMS logs, analytics | React, TypeScript, Vite |
| `customer-web/` | Customer web app with map-based booking | React, TypeScript, Vite, Leaflet |
| `waterdril/` | Older React portal, kept for reference | React |
| `deploy/` | Docker Compose, nginx reverse proxy, systemd units and a provisioning script. See `DEPLOY.md` | |

Services covered: drilling, test pumping, pump installation, geologist, tank installation, hydrogeological surveys and consultancy.

## Running it

**API**

```sh
cd waterdril_back
cp .env.example .env   # database and M-Pesa credentials
deno task dev
```

**Admin portal or customer web**

```sh
cd portal        # or customer-web
npm install
npm run dev
```

**Android apps**

Open `DriverApp` or `PassengerApp` in Android Studio and run. Each app needs its own `google-services.json` from Firebase and a Google Maps key in `app/src/main/res/values/google_maps_api.xml` (DriverApp) or `google_api.xml` (PassengerApp).

Production deployment is described in `DEPLOY.md`.

## Design notes

`SMARTDRILL_WEB_DESIGN.md` is the design for the current customer journey (request, invoice, pay, assign, schedule, track, complete, report, confirm, release) on top of the existing `/api/v1` backend.

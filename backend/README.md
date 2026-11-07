# Vows API

The server for the wedding planner: accounts and sign-in, the invitation template store, orders
and payments. The Angular app in `../frontend` calls it under `/api`.

## Run it locally

No database to install: without `DATABASE_URL`, the API uses PGlite (PostgreSQL in WebAssembly)
and keeps its data in `backend/.data/`.

```sh
cd backend
npm install
npm run seed     # creates the tables and the demo wedding, accounts and guest links
npm run dev      # API on http://localhost:3000, restarts when files change
```

In a second terminal, start the app; `ng serve` forwards `/api` to port 3000 (`proxy.conf.json`):

```sh
cd frontend
npm start        # http://localhost:4200, sign in with admin@vows.local / vows-admin
```

Payments run in **sandbox** mode: the checkout shows a test QR and a "Simulate payment" button.
No real money moves until a real provider is added (step 3).

## Tests

```sh
npm test         # every test gets a fresh in-memory database
npm run typecheck
```

## Settings (environment variables)

| Variable | Default | What it does |
| --- | --- | --- |
| `PORT` | `3000` | Port the API listens on. |
| `DATABASE_URL` | – | PostgreSQL connection string. When set, PGlite is not used. |
| `PGLITE_DIR` | `.data/pglite` | Where the local PGlite database is kept. |
| `SECURE_COOKIES` | `true` when `NODE_ENV=production` | Sign-in cookie only over HTTPS. |
| `ORDER_TTL_MINUTES` | `15` | How long a checkout QR stays valid. |

## Production

1. Create a PostgreSQL database and set `DATABASE_URL`. Run `npm run migrate` on each release.
2. Run the API with `NODE_ENV=production npm start` (HTTPS in front of it). The demo seed and
   the sandbox payment provider refuse to run in production.
3. Build the app and run its server with `API_URL` pointing at the API, and `NG_ALLOWED_HOSTS`
   set to your domain (Angular only renders pages on the server for allowed hosts):

   ```sh
   API_URL=http://localhost:3000 NG_ALLOWED_HOSTS=example.com node dist/wedding-event-management/server/server.mjs
   ```

## How purchases work

- Prices live in the `templates` table; the browser only sends which template it wants.
- `POST /api/orders` reserves a reference (`VW-…`) and asks the payment provider for a QR with
  the amount built in. The QR expires after `ORDER_TTL_MINUTES`.
- The checkout polls `GET /api/orders/:id`; the server asks the provider and, once the payment
  matches the order's amount and currency, marks it paid and grants the template, once.
- A payment that does not match goes to `review` for a person to check. A payment that arrives
  up to 24 hours after the QR expired still counts. A timer re-checks open orders every 30 s.
- Everything the provider reports is kept in `payment_events`.

Payment providers implement `src/payments/provider.ts`; Bakong KHQR or ABA PayWay plugs in there.

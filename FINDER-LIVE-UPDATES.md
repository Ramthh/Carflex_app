# Finder individual-car delivery — September 19, 2026

Finder now receives one live update for each newly committed public car. Mileage,
descriptions and both estimates update on the existing card as their results are
saved. The browser no longer reloads the entire page every second.

- Authenticated `/api/finder/stream` keeps the integration key on the server.
- Account/session authorization is rechecked every five seconds; connections
  reconnect with a durable event cursor.
- Snapshots reconcile every 30 seconds, with three-second fallback polling when
  the stream is interrupted. Replay and a small event journal protect newer
  cards/estimates from stale snapshot responses.
- Pagination, seller scope, public-field filtering, colors and sorting retain
  their existing behavior.
- Authentication options moved unchanged into `lib/auth-options.ts` so the
  Next.js auth route exports only its supported GET/POST handlers.

The matching backend requires migrations 0031 and 0032 and the public integration
stream endpoint. Deploy that backend before this frontend. Collection continues
to enforce its seven-day source posting cutoff. Facebook detail availability
still determines when missing mileage or descriptions can be collected.

Validation: 13 focused Finder tests, TypeScript checking and production webpack
build passed. The local dependency junction requires webpack for local build
verification; deployment installs its own dependencies normally.

# PulseDock

PulseDock is a self-hosted uptime monitoring platform for websites and APIs.

Version 1 is focused on a single self-hosted installation. It includes a NestJS API, PostgreSQL and Prisma persistence, a Next.js operations console, and a Docker Compose deployment.

## Current Status

- Monorepo workspace initialized.
- NestJS API exists in `apps/api`.
- Next.js web console exists in `apps/web`.
- API runs on port `4000`.
- `GET /` returns basic API status.
- `GET /health` returns service health.
- Docker Compose runs PostgreSQL, database migrations, the API, and the web console.
- The web console provides dashboard, monitor, incident, settings, and public status views.
- Monitor detail supports editing, manual checks, and reversible enable/disable controls.
- Scheduled checks create incidents after two consecutive failures and resolve them on recovery.
- Public status includes a simple 30-day uptime percentage when check history exists.
- Live monitoring views refresh automatically while their browser tab is visible.

The core Version 1 workflow has been validated locally against PostgreSQL: monitors
can be created and updated, checks are stored, consecutive failures create one
incident, and recovery resolves it automatically. SMTP delivery remains optional
environment configuration. All 11 Version 1 development phases are implemented.

## Security Warning

PulseDock Version 1 does not include built-in authentication. Do not expose it
publicly without reverse proxy auth, VPN, firewall rules, or private network
protection.

## Development

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Start the API:

```bash
npm run dev:api
```

Start the web app in a second terminal:

```bash
npm run dev:web
```

`API_PORT` is the preferred API port setting. `PORT` remains supported as a
fallback, and the API defaults to `4000`. The web app runs on
`http://localhost:3000` by default and expects the API at `http://localhost:4000`.
On machines where port `3000` is unavailable, use port `3100`; the default
`WEB_ORIGIN` allows both local origins. Set `NEXT_PUBLIC_API_URL` to use another
API address.

SMTP is configured only through environment variables. The Settings page manages
public status-page metadata only and never exposes SMTP credentials. Alerts are
disabled when `ALERT_PROVIDER` is unset or set to `none`; set it to `smtp` only
after configuring the SMTP variables in `.env`. Check history is retained for 30 days by default; set
`CHECK_HISTORY_RETENTION_DAYS` to change that value.

## Docker Deployment

Install Docker Desktop (or Docker Engine with Compose), then create the local
environment file:

```bash
cp .env.example .env
```

For any shared or deployed installation, change `POSTGRES_PASSWORD` in `.env`
before starting. Then build and run the complete stack:

```bash
npm run docker:up
```

Compose starts PostgreSQL, applies production migrations, and starts the API and
web console in dependency order. Open:

- Web console: `http://localhost:3000`
- API health: `http://localhost:4000/health`

Useful commands:

```bash
docker compose ps
npm run docker:logs
npm run docker:down
```

Database data is stored in the `pulsedock_postgres_data` volume. Running
`docker compose down -v` also deletes that database volume and its data.

`NEXT_PUBLIC_API_URL` is embedded into the web build. After changing it, rebuild
the web image with `docker compose up -d --build web`. The root `DATABASE_URL`
is used by local, non-Docker commands; Compose constructs its own internal
database URL from `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`.
PostgreSQL is available to local development tools only through the configured
`POSTGRES_PORT` on `127.0.0.1`. To monitor the containerized API from inside the
stack, use `http://api:4000/health` as the monitor URL.

Run API tests:

```bash
npm run test:api
```

Run API end-to-end tests:

```bash
npm run test:e2e:api
```

Generate Prisma Client:

```bash
npm run prisma:generate:api
```

Run Prisma migrations:

```bash
npm run prisma:migrate:api
```

## Roadmap

See [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for the branch-by-branch development plan.

# PulseDock

PulseDock is a self-hosted uptime monitoring platform for websites and APIs.

Version 1 is focused on a single self-hosted installation. It includes a NestJS API, PostgreSQL and Prisma persistence, and a Next.js operations console. Docker deployment is Phase 11 and is the next development phase.

## Current Status

- Monorepo workspace initialized.
- NestJS API exists in `apps/api`.
- Next.js web console exists in `apps/web`.
- API runs on port `4000`.
- `GET /` returns basic API status.
- `GET /health` returns service health.
- PostgreSQL is defined in `docker-compose.yml`.
- The web console provides dashboard, monitor, incident, settings, and public status views.
- Monitor detail supports editing, manual checks, and reversible enable/disable controls.
- Scheduled checks create incidents after two consecutive failures and resolve them on recovery.
- Public status includes a simple 30-day uptime percentage when check history exists.
- Live monitoring views refresh automatically while their browser tab is visible.

The core Version 1 workflow has been validated locally against PostgreSQL: monitors
can be created and updated, checks are stored, consecutive failures create one
incident, and recovery resolves it automatically. SMTP delivery remains optional
environment configuration. Docker deployment is the remaining Phase 11 work.

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

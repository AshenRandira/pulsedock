# PulseDock API

This is the NestJS backend for PulseDock.

The API owns the monitoring logic, database access, scheduled health checks, incident detection, and alerting. The frontend should call this API instead of duplicating monitoring behavior.

## Setup

```bash
npm install
```

From the repository root, create a local environment file:

```bash
cp .env.example .env
```

## Run

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

The API uses `API_PORT` first, `PORT` as a fallback, and `4000` by default.

## Prisma

From the repository root:

```bash
npm run prisma:generate:api
npm run prisma:migrate:api
```

From `apps/api`:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Production and Docker deployments apply existing migrations without creating
new ones:

```bash
npm run prisma:deploy
```

## Endpoints

```text
GET    /             API status
GET    /health       Service health
POST   /monitors     Create a monitor
GET    /monitors     List monitors
GET    /monitors/:id Get one monitor
PATCH  /monitors/:id Update a monitor
DELETE /monitors/:id Disable a monitor
POST   /monitors/:id/check Run a health check
GET    /monitors/:id/check-results Get monitor check history
GET    /monitors/:id/incidents Get monitor incident history
GET    /dashboard/summary Dashboard summary
GET    /incidents        List incidents
GET    /status           Public status data
GET    /settings         Read public status page settings
PATCH  /settings         Update public status page settings
```

Monitor URLs must use HTTP or HTTPS. `intervalMinutes` accepts values from 1 to
1440, and `expectedStatusCode` accepts values from 100 to 599. Deleting a
monitor disables it; its monitoring history remains available. Each manual
health check records a result. Two consecutive failures open one incident, and
the next successful check resolves it.

The scheduler runs every minute and checks active monitors whose `nextCheckAt`
time has passed. After a check, it advances that monitor by its configured
interval.

The settings endpoints manage public status-page metadata only. SMTP credentials
are configured through environment variables and are never returned by the API.
Alerts are disabled when `ALERT_PROVIDER` is unset or set to `none`. To enable
incident emails, set `ALERT_PROVIDER=smtp` and configure
`ALERT_EMAIL`, `SMTP_HOST`, and `SMTP_FROM_EMAIL`, along with any required SMTP
credentials, in `.env`.
Missing SMTP configuration and send failures are logged without interrupting
health checks. PulseDock does not send test emails automatically.

History and incident list endpoints accept an optional `limit` from 1 to 100.
Public monitor responses include `uptimePercentage`, calculated from check
results within the last 30 days when history exists. A daily cleanup removes
check results older than `CHECK_HISTORY_RETENTION_DAYS`, which defaults to 30.

## Security Warning

PulseDock Version 1 does not include built-in authentication. Do not expose it
publicly without reverse proxy auth, VPN, firewall rules, or private network
protection.

## Tests

From `apps/api`:

```bash
npm run test
npm run test:e2e
```

From the repo root:

```bash
npm run test:api
npm run test:e2e:api
```

## Frontend

The Next.js operations console in `apps/web` consumes these endpoints. By
default it runs at `http://localhost:3000`; the default `WEB_ORIGIN` also allows
`http://localhost:3100` for local development.

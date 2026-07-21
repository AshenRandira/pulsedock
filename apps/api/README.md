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

By default, the API listens on port `4000`.

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
```

Monitor URLs must use HTTP or HTTPS. `intervalMinutes` accepts values from 1 to
1440, and `expectedStatusCode` accepts values from 100 to 599. Deleting a
monitor disables it; its monitoring history remains available. Each manual
health check records a result. Two consecutive failures open one incident, and
the next successful check resolves it.

The scheduler runs every minute and checks active monitors whose `nextCheckAt`
time has passed. After a check, it advances that monitor by its configured
interval.

To enable incident emails, configure `ALERT_EMAIL`, `SMTP_HOST`, and
`SMTP_FROM_EMAIL`, along with any required SMTP credentials, in your local
`.env` file. Set `ALERT_PROVIDER=none` to disable alerts while SMTP is being
finalized. Email send failures are logged and do not interrupt health checks.

History and incident list endpoints accept an optional `limit` from 1 to 100.

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

## Next Backend Milestones

- Next.js frontend integration.

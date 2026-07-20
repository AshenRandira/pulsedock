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
GET /        API status
GET /health  Service health
```

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

- Prisma and PostgreSQL connection.
- Core database models.
- Monitor CRUD API.
- Manual health checks.
- Incident detection.
- Scheduler.
- Email alerts.

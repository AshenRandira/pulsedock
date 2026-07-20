# PulseDock

PulseDock is a Docker-first, self-hosted uptime monitoring platform for websites and APIs.

Version 1 is focused on a single self-hosted installation that can run with Docker Compose. The backend is being built first with NestJS, PostgreSQL, and Prisma. The Next.js frontend will be added after the backend monitoring workflow is stable.

## Current Status

- Monorepo workspace initialized.
- NestJS API exists in `apps/api`.
- API runs on port `4000`.
- `GET /` returns basic API status.
- `GET /health` returns service health.
- PostgreSQL is defined in `docker-compose.yml`.

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

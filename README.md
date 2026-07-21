# PulseDock

PulseDock is a Docker-first, self-hosted uptime monitoring platform for websites and APIs.

Version 1 is focused on a single self-hosted installation that can run with Docker Compose. It includes a NestJS API, PostgreSQL and Prisma persistence, and a Next.js operations console.

## Current Status

- Monorepo workspace initialized.
- NestJS API exists in `apps/api`.
- Next.js web console exists in `apps/web`.
- API runs on port `4000`.
- `GET /` returns basic API status.
- `GET /health` returns service health.
- PostgreSQL is defined in `docker-compose.yml`.
- The web console provides dashboard, monitor, incident, settings, and public status views.

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

The web app runs on `http://localhost:3000` and expects the API at
`http://localhost:4000` by default. Set `NEXT_PUBLIC_API_URL` to use another
API address.

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

# PulseDock Development Plan

PulseDock is a Docker-first, self-hosted uptime monitoring platform. Version 1 is focused on a single self-hosted installation that can monitor websites and APIs, store uptime history, detect incidents, send email alerts, and expose a public status page.

This plan keeps development backend-first. Each phase should happen on its own branch, end with a working increment, and be committed only when the phase is complete or when there is a useful checkpoint worth preserving.

## Current Status

- Phases 1 through 10 are implemented: NestJS, PostgreSQL/Prisma, monitor CRUD,
  checks, incidents, scheduler, alert-provider architecture, dashboard/status
  APIs, and the Next.js web console.
- API endpoints include `GET /status`, `GET /monitors/:id/check-results`, and
  `GET /monitors/:id/incidents`.
- Local CORS supports `http://localhost:3000` and `http://localhost:3100`.
- The web console supports monitor creation, editing, manual checks, and reversible
  enable/disable controls.
- The complete incident lifecycle has been validated: two consecutive failures
  create an incident and a successful recovery check resolves it.
- Live dashboard, monitor, incident, detail, and public status data refreshes
  automatically while the browser tab is visible.
- Phase 11 adds production API/web images and a health-gated Docker Compose stack
  with PostgreSQL, automatic migrations, and persistent database storage.
- All 11 Version 1 phases are implemented and validated.
- Version 1 intentionally has no built-in authentication or SaaS features.

## Development Rules

- Keep Docker deployment work scoped to Phase 11.
- Build the backend first.
- Keep monitoring logic in the backend.
- Keep the frontend as a display and control layer only.
- Do not add SaaS features in Version 1.
- Do not add authentication yet.
- Do not add Redis, BullMQ, queues, or workers yet.
- Use DTO validation for API inputs.
- Use proper error handling.
- Keep environment variables secure.
- Commit `.env.example`, never commit real `.env` files.
- Prefer small, reviewable branches.
- After each commit, report the branch name, commit hash, and summary of what changed.

## Git Workflow

Stable branch:

```bash
main
```

Feature branches:

```bash
chore/project-foundation
chore/setup-prisma-postgres
chore/database-models
feat/monitor-crud-api
feat/manual-health-check
feat/incident-system
feat/scheduler
feat/email-alerts
feat/dashboard-api
feat/frontend
chore/docker-compose
```

Branch workflow for each phase:

```bash
git checkout main
git pull
git checkout -b <phase-branch>
```

Commit workflow:

```bash
git status
git add <changed-files>
git commit -m "<type>: <short summary>"
```

After committing, report:

```text
Committed on <branch-name>
Commit: <short-sha>
Summary: <what changed>
```

## Phase 1: Project Foundation

Branch:

```bash
chore/project-foundation
```

Goal:

Create a clean baseline for the monorepo and API.

Tasks:

- Confirm root workspace setup.
- Confirm API starts correctly.
- Confirm API uses port `4000`.
- Confirm `/health` endpoint returns a healthy response.
- Clean up starter code that conflicts with current API behavior.
- Update root README with PulseDock-specific setup notes.

Definition of done:

- `npm run dev:api` starts the API.
- `GET /health` returns an OK response.
- Starter NestJS tests are updated or removed if stale.
- README no longer looks like a generic starter project.

Suggested commit:

```bash
git commit -m "chore: establish project foundation"
```

## Phase 2: Prisma and PostgreSQL Setup

Branch:

```bash
chore/setup-prisma-postgres
```

Goal:

Connect the NestJS backend to PostgreSQL using Prisma.

Tasks:

- Install Prisma and Prisma Client.
- Add Prisma schema.
- Add `.env.example`.
- Add `DATABASE_URL` configuration.
- Create a reusable Prisma service in NestJS.
- Confirm database connection works against Docker Postgres.
- Add initial migration.

Definition of done:

- Docker Postgres starts successfully.
- Prisma migration runs successfully.
- NestJS can use Prisma Client.
- Real `.env` remains uncommitted.

Suggested commit:

```bash
git commit -m "chore: configure prisma and postgres"
```

## Phase 3: Database Models

Branch:

```bash
chore/database-models
```

Goal:

Define the core PulseDock data model.

Models:

- `Monitor`
- `CheckResult`
- `Incident`
- `AppSetting`

Recommended enums:

- `MonitorStatus`: `UP`, `DOWN`, `UNKNOWN`
- `IncidentStatus`: `OPEN`, `RESOLVED`

Recommended monitor fields:

- `id`
- `name`
- `url`
- `intervalMinutes`
- `expectedStatusCode`
- `currentStatus`
- `consecutiveFailures`
- `lastCheckedAt`
- `nextCheckAt`
- `isActive`
- `isPublic`
- `createdAt`
- `updatedAt`

Recommended check result fields:

- `id`
- `monitorId`
- `statusCode`
- `responseTimeMs`
- `success`
- `errorMessage`
- `checkedAt`

Recommended incident fields:

- `id`
- `monitorId`
- `status`
- `reason`
- `startedAt`
- `resolvedAt`
- `createdAt`
- `updatedAt`

Recommended app setting fields:

- `id`
- `alertEmail`
- `smtpHost`
- `smtpPort`
- `smtpUser`
- `smtpPassword`
- `smtpFromEmail`
- `statusPageTitle`
- `statusPageDescription`
- `createdAt`
- `updatedAt`

Definition of done:

- Prisma schema includes all core models.
- Relations are correctly defined.
- Migration runs successfully.
- Prisma Client is regenerated.

Suggested commit:

```bash
git commit -m "chore: add core database models"
```

## Phase 4: Monitor CRUD API

Branch:

```bash
feat/monitor-crud-api
```

Goal:

Allow users to manage monitors through REST API endpoints before any frontend exists.

Endpoints:

```text
POST   /monitors
GET    /monitors
GET    /monitors/:id
PATCH  /monitors/:id
DELETE /monitors/:id
```

Tasks:

- Create `MonitorsModule`.
- Create `MonitorsController`.
- Create `MonitorsService`.
- Create DTOs for create and update requests.
- Validate URL, interval, expected status code, active flag, and public flag.
- Use Prisma for persistence.
- Decide delete behavior:
  - Preferred for Version 1: soft delete by setting `isActive = false`.
  - Hard delete only if explicitly chosen later.

Definition of done:

- Monitors can be created.
- Monitors can be listed.
- A single monitor can be retrieved.
- Monitors can be updated.
- Monitors can be disabled/deleted.
- Invalid input returns clear validation errors.

Suggested commit:

```bash
git commit -m "feat: add monitor crud api"
```

## Phase 5: Manual Health Check Engine

Branch:

```bash
feat/manual-health-check
```

Goal:

Build the core health-checking logic and expose a manual check endpoint for development.

Endpoint:

```text
POST /monitors/:id/check
```

Health check rules:

- Send an HTTP request to the monitor URL.
- Use a 10 second request timeout.
- Measure response time.
- Compare actual status code with `expectedStatusCode`.
- Save a `CheckResult`.
- Treat timeout as failure.
- Treat network error as failure.
- Treat invalid response as failure.
- Treat unexpected status code as failure.

Tasks:

- Create `HealthChecksModule`.
- Create service for checking a single monitor.
- Use a clear HTTP client.
- Store success and failure results consistently.
- Update `lastCheckedAt`.
- Prepare logic so scheduler can reuse the same service later.

Definition of done:

- Manual check creates a `CheckResult`.
- Successful checks record status code and response time.
- Failed checks record an error message.
- The same service can later be called by the scheduler.

Suggested commit:

```bash
git commit -m "feat: add manual health checks"
```

## Phase 6: Incident System

Branch:

```bash
feat/incident-system
```

Goal:

Add production-style downtime detection without creating false incidents after one failed check.

Incident rules:

- First failed check increases `consecutiveFailures`.
- First failed check does not mark the monitor `DOWN`.
- Second consecutive failed check marks the monitor `DOWN`.
- When a monitor transitions to `DOWN`, create one open incident.
- Do not create duplicate open incidents.
- A successful check resets `consecutiveFailures`.
- If a monitor was `DOWN`, a successful check marks it `UP`.
- Recovery resolves the open incident.

Tasks:

- Add incident transition logic to the health check flow.
- Add helper methods for opening and resolving incidents.
- Ensure duplicate incidents are avoided.
- Add incident query support if needed for testing.

Definition of done:

- One failure does not create an incident.
- Two consecutive failures create one incident.
- Additional failures do not create duplicate incidents.
- Recovery resolves the open incident.

Suggested commit:

```bash
git commit -m "feat: add incident detection"
```

## Phase 7: Scheduler

Branch:

```bash
feat/scheduler
```

Goal:

Automatically run due health checks.

Scheduler rules:

- Scheduler runs every minute.
- It finds active monitors where `nextCheckAt <= now`.
- It checks only monitors that are due.
- It does not check every monitor every minute.
- It updates `nextCheckAt` after each check.

Tasks:

- Install and configure NestJS scheduler.
- Create scheduled job service.
- Query due monitors.
- Execute checks through the health check service.
- Update `nextCheckAt` using `intervalMinutes`.
- Handle check failures without crashing the scheduler.

Definition of done:

- Due monitors are checked automatically.
- Inactive monitors are ignored.
- Future-dated monitors are ignored until due.
- Scheduler can continue after one monitor fails.

Suggested commit:

```bash
git commit -m "feat: add scheduled health checks"
```

## Phase 8: Email Alerts

Branch:

```bash
feat/email-alerts
```

Goal:

Send SMTP email alerts only when incident state changes.

Email rules:

- Send downtime email when an incident is created.
- Send recovery email when an incident is resolved.
- Do not send emails on every failed check.
- Do not hardcode SMTP secrets.

Tasks:

- Install Nodemailer.
- Add mail service.
- Add SMTP configuration.
- Add alert email configuration.
- Send incident-created email.
- Send incident-resolved email.
- Make email failures visible in logs without breaking monitor checks.

Definition of done:

- Downtime email sends once per incident.
- Recovery email sends once per resolved incident.
- SMTP settings come from environment variables only.
- Health checks still complete even if email sending fails.

Suggested commit:

```bash
git commit -m "feat: add email alerts"
```

## Phase 9: Dashboard and Status APIs

Branch:

```bash
feat/dashboard-api
```

Goal:

Provide backend data for the future dashboard, monitor detail pages, incident list, and public status page.

Suggested endpoints:

```text
GET /dashboard/summary
GET /monitors/:id/check-results
GET /monitors/:id/incidents
GET /incidents
GET /status
```

Dashboard summary data:

- Total monitors
- Up monitors
- Down monitors
- Unknown monitors
- Active incidents
- Average response time
- Recent checks

Public status data:

- Public monitors only.
- Current monitor status.
- Active incidents for public monitors.
- Recent uptime summary if available.

Tasks:

- Create dashboard API module.
- Create incident listing endpoint.
- Create public status endpoint.
- Add pagination or limits for history endpoints.
- Keep response shapes frontend-friendly.

Definition of done:

- Dashboard summary returns useful aggregate data.
- Monitor detail APIs return check history and incident history.
- Public status endpoint excludes private monitors.

Suggested commit:

```bash
git commit -m "feat: add dashboard and status APIs"
```

## Phase 10: Frontend

Branch:

```bash
feat/frontend
```

Goal:

Build the PulseDock web interface after the backend is stable.

Frontend stack:

- Next.js
- TypeScript
- React
- Tailwind CSS
- Recharts

Pages:

```text
/dashboard
/monitors
/monitors/new
/monitors/[id]
/incidents
/status
/settings
```

Tasks:

- Create Next.js app at `apps/web`.
- Add API client helpers.
- Build dashboard page.
- Build monitor list page.
- Build add monitor form.
- Build monitor detail page.
- Add response time graph.
- Add check history.
- Add incident history.
- Build incident list page.
- Build public status page.
- Build settings page for public status-page settings; keep SMTP configuration in environment variables.

Definition of done:

- User can manage monitors from the UI.
- User can inspect monitor health history.
- User can view incidents.
- Public status page is available.
- Dashboard reflects backend state.

Suggested commit:

```bash
git commit -m "feat: add web frontend"
```

## Phase 11: Docker Deployment

Branch:

```bash
chore/docker-compose
```

Goal:

Make PulseDock runnable as a self-hosted Docker Compose app.

Tasks:

- Add API Dockerfile.
- Add web Dockerfile.
- Update `docker-compose.yml`.
- Include Postgres service.
- Include API service.
- Include web service.
- Add environment variable examples.
- Add persistent database volume.
- Add production startup commands.
- Update README with Docker setup.

Definition of done:

```bash
docker compose up
```

starts the full app.

Status: Complete. The full stack has been built and validated with PostgreSQL,
automatic production migrations, API and web health checks, persistent storage,
and an end-to-end monitor check.

Suggested commit:

```bash
git commit -m "chore: add docker compose deployment"
```

## Recommended Development Order

1. `chore/project-foundation`
2. `chore/setup-prisma-postgres`
3. `chore/database-models`
4. `feat/monitor-crud-api`
5. `feat/manual-health-check`
6. `feat/incident-system`
7. `feat/scheduler`
8. `feat/email-alerts`
9. `feat/dashboard-api`
10. `feat/frontend`
11. `chore/docker-compose`

## Immediate Next Step

Version 1 implementation is complete. Future work should begin with deployment
hardening and user feedback while preserving the current self-hosted scope. Do
not expose PulseDock publicly without an external authentication layer or
private network protection.

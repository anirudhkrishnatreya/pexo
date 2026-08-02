# Developer Guide

## Prerequisites

- Node.js 20+, Docker Desktop, and (for the app) Expo Go on a physical device.

## Day-1 setup

```bash
git init pexo && cd pexo   # if starting from the zip, unzip then cd
docker compose up -d db redis
cd apps/api
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run seed
npm run start:dev           # http://localhost:3000/docs
```

In a second terminal:

```bash
cd apps/mobile
npm install
EXPO_PUBLIC_API_URL=http://<LAN-IP>:3000/api/v1 npx expo start
```

## Project conventions

- **DTO-first**: every request body/query is a class-validator DTO — validation failures return 400 automatically.
- **Services own logic, controllers stay thin.** Cross-module calls go through exported services (e.g. `ActivitiesService` → `TerritoriesService.attemptCapture`).
- **Never trust the client**: any stat that affects XP, capture, or leaderboards is recomputed server-side from raw track points.
- **Pure engine**: everything in `modules/territories/engine/` must remain dependency-free (no Nest, no Prisma) so it stays unit-testable and portable to a queue worker.
- Pagination: reuse `PaginationDto` + `paginated()`; don't hand-roll envelopes.

## Testing

```bash
npm test                    # unit — includes the conquest engine specs
npm run test:e2e            # supertest against a real DB
```

Write engine tests with synthetic tracks (see `capture.spec.ts` — `circularTrack()` helper). Anti-cheat heuristics live behind named flags, so asserting on flags keeps tests stable.

## Adding a feature module

1. `src/modules/<name>/` with `<name>.module.ts`, service, controller, `dto/`.
2. Register in `app.module.ts`.
3. Add Prisma models + `npx prisma migrate dev`.
4. Swagger comes free via decorators; add `@ApiTags`.
5. Unit tests beside the service; e2e in `test/`.

## Mobile conventions

- Server state → TanStack Query (`queryKey` per resource); session → zustand.
- All HTTP goes through `src/api/client.ts` (auto token refresh on 401 with rotation).
- Theme tokens only — no hard-coded colors in screens.
- New screens: add to `src/navigation/index.tsx`, keep params typed in `RootStackParamList`.

## Admin quickstart

Login as `admin@pexo.app` / `Password123!`, grab the access token from `/auth/login`, then use Swagger's Authorize button. Dashboard: `GET /admin/dashboard`; ban: `POST /admin/users/:id/ban { "banned": true }` (revokes sessions and writes an audit log).

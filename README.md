<p align="center">
  <h1 align="center">🏰 Pexo</h1>
  <p align="center"><b>Move. Conquer. Level Up.</b></p>
  <p align="center">Strava-style GPS fitness tracking × Healthify-style nutrition × real-world territory conquest.</p>
</p>

---

## What is Pexo?

Pexo is a mobile fitness ecosystem where every workout matters twice: once for your body, once for your **kingdom**. Record runs, rides, walks, hikes and swims with GPS. Log food, water and weight. And — the flagship feature — **conquer real-world territories** by running or cycling a fully closed loop around a park, lake, campus or neighborhood. Territories can be **stolen** by athletes who complete a better conquest, all validated by a server-side geometry + anti-cheat engine.

## Monorepo layout

```
pexo/
├─ apps/
│  ├─ api/        # NestJS 10 + Prisma 5 + PostgreSQL (PostGIS) + Redis
│  │  ├─ prisma/  # schema.prisma, seed.ts
│  │  ├─ src/
│  │  │  ├─ modules/
│  │  │  │  ├─ auth/          # JWT + rotating refresh tokens (argon2)
│  │  │  │  ├─ users/         # profiles, follow graph, XP/levels
│  │  │  │  ├─ activities/    # GPS tracks, splits, calories, stats
│  │  │  │  ├─ territories/   # 🏰 conquest engine (geo + anti-cheat + capture)
│  │  │  │  ├─ nutrition/     # food DB, barcode, meals, water, weight, BMI
│  │  │  │  ├─ social/        # feed, kudos, comments, DMs
│  │  │  │  ├─ challenges/    # distance/elevation/territory challenges
│  │  │  │  ├─ leaderboards/  # global XP, kingdoms, weekly distance
│  │  │  │  ├─ notifications/ # in-app + Socket.io realtime gateway
│  │  │  │  └─ admin/         # dashboard, moderation, bans, feature flags, audit
│  │  │  └─ common/            # guards, decorators, pagination, filters
│  │  └─ test/    # e2e specs
│  └─ mobile/     # Expo (React Native + TypeScript) app for iOS & Android
├─ docs/          # architecture, API, database, deployment, developer guide
├─ docker-compose.yml
└─ .github/workflows/ci.yml
```

## Quickstart

### 1. Backend (Docker — recommended)

```bash
cd pexo
docker compose up --build
```

This starts PostgreSQL (PostGIS), Redis, runs migrations + seed, and serves the API at:

- API base: `http://localhost:3000/api/v1`
- **Swagger docs: `http://localhost:3000/docs`**

Seeded logins (password `Password123!`):

| Email | Role |
|---|---|
| `admin@pexo.app` | SUPER_ADMIN |
| `demo@pexo.app` | USER |
| `rival@pexo.app` | USER |

### 2. Backend (local dev, no Docker)

```bash
cd apps/api
cp .env.example .env          # point DATABASE_URL & REDIS_URL at local services
npm install
npx prisma migrate dev
npm run seed
npm run start:dev
```

### 3. Mobile app

```bash
cd apps/mobile
npm install
EXPO_PUBLIC_API_URL=http://<your-lan-ip>:3000/api/v1 npx expo start
```

Scan the QR code with Expo Go (Android/iOS). Use a real device for GPS recording.

### 4. Tests

```bash
cd apps/api
npm test                # unit tests incl. the territory capture engine
npm run test:e2e        # requires a migrated database
```

## The territory conquest engine

The heart of Pexo lives in `apps/api/src/modules/territories/engine/`:

1. **`geo.ts`** — pure geometry: haversine distance, closed-loop detection, shoelace polygon area, Ramer–Douglas–Peucker simplification, compactness scoring, point-in-polygon, polyline encoding.
2. **`anti-cheat.ts`** — GPS-spoof and fake-activity heuristics: teleport jumps, superhuman sustained speeds (per activity type), vehicle detection for foot activities, synthetic constant-speed (bot) tracks, sparse sampling, non-monotonic timestamps.
3. **`capture.ts`** — conquest rules: minimum area (8,000 m²), minimum compactness, loop-closure gap ≤ 75 m, capture score = f(area, compactness, pace), XP formula, rarity tiers (COMMON / RARE ≥ 0.5 km² / LEGENDARY ≥ 5 km²).

**Stealing:** a new conquest overlapping ≥ 60% of an existing territory triggers a steal attempt — it succeeds only if the new capture score beats the incumbent's by ≥ 5%. The previous owner gets a `TERRITORY_LOST` notification in real time.

The engine is dependency-free and fully unit-tested (`capture.spec.ts`).

## Feature status — honest breakdown

**✅ Implemented and runnable**: email/password auth with JWT + rotating refresh tokens, profiles & follow graph, GPS activity recording (pause/auto-pause, splits, elevation, calories), territory capture/steal engine with anti-cheat, live territory map, activity feed with kudos & comments, DMs, food/water/weight logging with daily macro summaries & BMI, challenges, XP/levels/leaderboards, notifications (REST + Socket.io), admin API (dashboard, bans, feature flags, audit logs), rate limiting, Swagger, Docker Compose, CI, seed data, unit + e2e tests.

**🚧 Scaffolded / deferred** (see `docs/ROADMAP.md`): OAuth provider wiring (Google/Apple/Facebook), phone OTP & 2FA & biometric flows, wearable SDK integrations, GPX import/export, segments & heatmaps, stories/reels/group chats/clubs, AI coach endpoints, FCM/APNs push delivery, GraphQL, ElasticSearch, Kubernetes/Terraform manifests, admin web UI.

No one can honestly hand you “100% of Strava” in one shot — this is a serious, coherent foundation engineered so each deferred feature has an obvious place to land.

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [API guide](docs/API.md)
- [Database & ER model](docs/DATABASE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Environment variables](docs/ENVIRONMENT.md)
- [Developer guide](docs/DEVELOPER_GUIDE.md)
- [Roadmap](docs/ROADMAP.md)

## License

MIT — do whatever you want, just don't fake your GPS tracks. The engine will catch you anyway. 😏

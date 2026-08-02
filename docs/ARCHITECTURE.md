# Pexo Architecture

## Overview

```
┌─────────────────┐      HTTPS/JSON       ┌────────────────────┐
│  Expo Mobile App │ ◄─────────────────► │  NestJS API (api)    │
│  (iOS/Android)   │   Socket.io /realtime │  REST /api/v1 + WS   │
└─────────────────┘                       └─────┬───────┬───────┘
                                                │       │
                                     ┌─────────▼─┐  ┌─▼────────┐
                                     │ PostgreSQL │  │  Redis   │
                                     │ (PostGIS)  │  │ (cache + │
                                     │  via Prisma│  │ ranking) │
                                     └────────────┘  └──────────┘
```

## Backend (NestJS)

- **Modular monolith, microservices-ready.** Every domain (auth, activities, territories, nutrition, social, challenges, leaderboards, notifications, admin) is an isolated Nest module with its own controller/service/DTOs. Modules communicate through exported services — the seams where you would later split services apart (each module maps 1:1 to a candidate microservice).
- **API-first**: URI-versioned REST (`/api/v1/...`), Swagger at `/docs`, global `ValidationPipe` with class-validator DTOs, consistent pagination envelope (`items` + `meta`).
- **Auth**: argon2id password hashing; short-lived JWT access tokens; rotating single-use refresh tokens stored as SHA-256 hashes; role hierarchy USER < PREMIUM < MODERATOR < ADMIN < SUPER_ADMIN enforced by `RolesGuard`.
- **Rate limiting**: global throttler (120 req/min) with stricter limits on auth endpoints.
- **Realtime**: Socket.io gateway (`/realtime` namespace) with per-user rooms, live-activity rooms, and map-region rooms.
- **Caching / rankings**: Redis sorted sets back the XP leaderboard; Redis is best-effort (the API stays functional if Redis is down).

## The conquest pipeline (CQRS-lite)

`POST /activities` runs a synchronous pipeline; each stage is a pure function that can be moved to a queue worker unchanged:

```
trackPoints ─► computeStats ─► analyzeTrack (anti-cheat) ─► evaluateCapture (geometry)
                                                                 │
                              territory transaction (new / reinforce / steal) ◄┘
                                                                 │
                                     notifications + XP + Redis ranking
```

Scaling note: at high volume, move stages 2–4 to a BullMQ worker consuming from Redis — the activity is accepted immediately and conquest results are pushed over the Socket.io gateway.

## Geospatial storage

Territory polygons are stored as JSON with centroid + bounding-box columns for fast viewport queries. The Docker image ships **PostGIS**, and `docs/DATABASE.md` documents the migration path to `GEOMETRY(Polygon, 4326)` columns with GiST indexes and `ST_Intersects` for exact overlap detection at scale.

## Mobile (Expo / React Native + TypeScript)

- **State**: zustand for auth/session, TanStack Query for all server state (caching, invalidation, infinite feed scroll).
- **Recording**: `expo-location` high-accuracy watcher with client-side auto-pause; the server independently recomputes all stats and never trusts client-computed values.
- **Maps**: `react-native-maps` (Google on Android, Apple Maps on iOS) for the live territory map and route polylines.
- **Design system**: `src/theme` — dark/light palettes, glass surfaces, spacing scale; `src/components/ui.tsx` primitives (Screen, Card, Button with haptics, Input, Stat).
- **Security note**: JWT tokens live in `expo-secure-store` (Keychain/Keystore), never AsyncStorage.

## Trust model

The client is untrusted. All distance/pace/calorie/conquest computation happens server-side from raw GPS points. Anti-cheat runs before any capture is evaluated. Flagged activities are queued for admin review (`/admin/moderation/flagged-activities`).

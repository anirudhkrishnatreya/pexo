# Roadmap — honest status

This foundation implements the core loop end-to-end (record → validate → conquer → socialize → fuel → rank). Everything below is **deliberately deferred**, with the intended landing spot noted so nothing requires re-architecture.

## Near-term (weeks)

| Feature | Landing spot |
|---|---|
| Google / Apple / Facebook OAuth | `auth` module — add passport strategies; `User` already supports null password |
| Phone OTP + 2FA (TOTP) | `auth` module; `Device` table exists |
| FCM / APNs push delivery | worker consuming `Notification` inserts; tokens already collected at `/notifications/devices` |
| GPX import/export | `activities` module; trackPoints JSON ↔ GPX is a pure transform |
| Password reset emails / email verification | `auth` module + mail provider |
| Photo uploads (activities, avatars) | S3 presigned URLs; env vars reserved |

## Mid-term (months)

| Feature | Landing spot |
|---|---|
| Segments & segment leaderboards | new `segments` module; polyline matching against stored tracks |
| Heatmaps | tile pre-aggregation job over `Activity.polyline` |
| Training load / PB records / yearly reports | `activities` analytics service; splits already stored |
| Group chats, clubs, events, stories/reels | `social` module split into `social` + `media` (S3) |
| Weekly territory battles, monthly events, seasonal resets | `Territory.seasonId` exists; add `seasons` module + cron |
| Wearables (HealthKit, Google Fit, Garmin…) | mobile-side HealthKit/Fit ingestion → existing `POST /activities` |
| AI coach / meal suggestions | new `ai` module calling an LLM with weekly stats + nutrition summaries |
| Admin web UI | separate `apps/admin` (Next.js) consuming the existing `/admin` API |

## At-scale (when metrics demand)

| Concern | Plan |
|---|---|
| Exact geospatial steals | PostGIS `geom` column + `ST_Intersects` (migration in docs/DATABASE.md) |
| Conquest throughput | move engine pipeline to BullMQ workers (engine is already pure) |
| Search | ElasticSearch for athletes/segments when SQL `ILIKE` saturates |
| GraphQL gateway | optional façade over module services for the mobile BFF |
| Multi-region | read replicas + Redis-backed Socket.io adapter (config-only) |
| K8s / Terraform | container is 12-factor; manifests per docs/DEPLOYMENT.md |

## Explicit non-goals of this drop

No mock OAuth screens, no fake wearable toggles, no stubbed AI endpoints — anything not listed as implemented in the README simply isn't there yet, by design.

# Pexo Database

PostgreSQL 16 (PostGIS image) managed by Prisma. Canonical schema: `apps/api/prisma/schema.prisma`.

## ER overview

```
User 1──* RefreshToken          User 1──* Device
User 1──* Activity 1──0..1 TerritoryCapture *──1 Territory *──1 User(owner)
User *──* User (Follow)          Activity 1──* Kudos / Comment
User 1──* FoodLog *──1 FoodItem  User 1──* WaterLog / WeightLog
User *──* Challenge (ChallengeParticipant)
User 1──* Message (sender/recipient)   User 1──* Notification
User *──* Badge (UserBadge)      User(actor) 1──* AuditLog
FeatureFlag (standalone)
```

## Key tables

| Table | Highlights |
|---|---|
| `User` | role enum, XP/level, goals (calories/protein/water), privacy, `banned` |
| `RefreshToken` | SHA-256 `tokenHash`, single-use rotation, revocation |
| `Activity` | type enum, raw `trackPoints` JSON, encoded `polyline`, splits JSON, `cheatFlags` JSON, `verified` |
| `Territory` | polygon JSON, centroid + area + perimeter, `rarity`, `captureScore` (steal threshold), `seasonId` for seasonal resets |
| `TerritoryCapture` | immutable capture history; `stolenFromId` records conquests |
| `FoodItem` / `FoodLog` | full macro profile, unique `barcode`, per-meal logging |
| `Challenge` / `ChallengeParticipant` | metric-based (`distance`, `duration`, `elevation`, `territories`) |
| `Notification` | typed enum (TERRITORY_LOST, TERRITORY_CAPTURED, KUDOS, …), `readAt` |
| `FeatureFlag`, `AuditLog` | admin controls with full audit trail |

## Indexing strategy

- Viewport queries: composite index on `Territory(centroidLat, centroidLng)` + bbox prefilter in the service layer.
- Feeds: `Activity(userId, startedAt desc)`; kudos/comments unique constraints prevent duplicates.
- Leaderboards: Redis sorted sets (primary path) with SQL group-by fallback.

## Scaling to exact geospatial queries (PostGIS)

The Docker image is PostGIS-enabled. When territory density outgrows bbox prefiltering, add a raw migration:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
ALTER TABLE "Territory" ADD COLUMN geom geometry(Polygon, 4326);
UPDATE "Territory" SET geom = ST_GeomFromGeoJSON(polygon_geojson);
CREATE INDEX territory_geom_idx ON "Territory" USING GIST (geom);

-- exact overlap detection for steals:
SELECT id FROM "Territory"
WHERE ST_Intersects(geom, ST_GeomFromGeoJSON($1))
  AND ST_Area(ST_Intersection(geom, ST_GeomFromGeoJSON($1)))
      / ST_Area(geom) >= 0.6;
```

This replaces `vertexOverlapFraction` in `territories.service.ts` with database-side exact intersection — the service already isolates that call for exactly this swap.

## Migrations & seed

```bash
npx prisma migrate dev      # create/apply migrations locally
npx prisma migrate deploy   # CI/production
npm run seed                # demo users, foods, badges, challenges
```

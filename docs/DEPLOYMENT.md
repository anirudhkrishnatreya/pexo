# Deployment Guide

## Local / single-node (Docker Compose)

```bash
docker compose up --build
```

Services: `db` (PostGIS 16), `redis` (Redis 7), `api` (migrates, seeds, serves on :3000).

## Production checklist

1. **Secrets**: set strong `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`; never ship `.env.example` values.
2. **TLS**: terminate HTTPS at a load balancer or reverse proxy (Caddy/nginx/ALB). The API trusts `X-Forwarded-*`.
3. **Database**: managed PostgreSQL (RDS/Cloud SQL/Neon) with PostGIS extension; run `npx prisma migrate deploy` as a release step, not at container boot.
4. **Redis**: managed Redis (ElastiCache/Upstash). The API degrades gracefully without it, but leaderboards get slower.
5. **Horizontal scaling**: the API is stateless — scale replicas freely. Enable the Socket.io Redis adapter when running >1 replica so realtime rooms span instances.
6. **Media**: point `S3_*` env vars at S3/R2/MinIO for avatar & photo uploads.
7. **Push**: supply `FCM_*` / APNs credentials and wire the delivery worker (see ROADMAP) — device tokens are already collected via `/notifications/devices`.

## Kubernetes (ready, manifests not included)

The container is 12-factor: config via env, stateless, single process, graceful shutdown. A minimal deployment needs: `Deployment` (api, N replicas) + `Service` + `Ingress`, `StatefulSet` or managed DB, Redis, and a migration `Job` per release. HPA on CPU works well; conquest evaluation is the hot path.

## Observability

- Structured Nest logger output — ship stdout to ELK/Loki.
- Add `prom-client` + a `/metrics` endpoint for Prometheus/Grafana (10-line change in `main.ts`; left out to keep the base image lean).
- Health: `GET /api/v1/health` (used by compose healthcheck and CI).

## CI/CD (GitHub Actions)

`.github/workflows/ci.yml` runs on every push/PR:
1. **api**: install → prisma generate → lint → unit tests → e2e tests against service containers (PostGIS + Redis) → build.
2. **mobile**: install → TypeScript typecheck.

Extend with a `docker/build-push-action` step and an EAS Build step (`eas build --platform all`) for store binaries.

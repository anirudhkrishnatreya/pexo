# Environment Variables

Canonical template: `apps/api/.env.example` (copy to `.env`).

## API — required

| Variable | Example | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://pexo:pexo@localhost:5432/pexo` | PostgreSQL (PostGIS) connection string |
| `REDIS_URL` | `redis://localhost:6379` | Optional but recommended; API degrades gracefully |
| `JWT_ACCESS_SECRET` | *(random 64+ chars)* | Access-token signing key |
| `JWT_REFRESH_SECRET` | *(random 64+ chars)* | Must differ from access secret |
| `JWT_ACCESS_TTL` | `900s` | Access token lifetime |
| `JWT_REFRESH_TTL` | `30d` | Refresh token lifetime |
| `PORT` | `3000` | HTTP port |
| `CORS_ORIGINS` | `*` | Comma-separated origins in production |

## API — optional integrations (placeholders in .env.example)

| Variable | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (wiring deferred, see ROADMAP) |
| `APPLE_CLIENT_ID` / `APPLE_TEAM_ID` / `APPLE_KEY_ID` | Sign in with Apple |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | Facebook login |
| `S3_ENDPOINT` / `S3_BUCKET` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` | Media storage (S3/R2/MinIO) |
| `FCM_PROJECT_ID` / `FCM_CLIENT_EMAIL` / `FCM_PRIVATE_KEY` | Push notification delivery |
| `MAPBOX_TOKEN` | Optional Mapbox tiles |

## Mobile

| Variable | Example | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://192.168.1.10:3000/api/v1` | Use your LAN IP, not localhost, on physical devices |

> **Never commit `.env`.** `.gitignore` already excludes it.

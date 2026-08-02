# Pexo API Guide

Base URL: `http://localhost:3000/api/v1` · Interactive docs: **`http://localhost:3000/docs`** (Swagger)

All endpoints (except auth) require `Authorization: Bearer <accessToken>`.
List endpoints support `?page=&limit=&q=&order=` and return `{ items, meta: { page, limit, total, totalPages } }`.

## Auth

| Method | Path | Description |
|---|---|---|
| POST | `/auth/signup` | Create account, returns access + refresh tokens |
| POST | `/auth/login` | Email/password login (throttled) |
| POST | `/auth/refresh` | Rotate refresh token (single-use) |
| POST | `/auth/logout` | Revoke all refresh tokens |

## Users

| Method | Path | Description |
|---|---|---|
| GET | `/users/me` | Own profile with counts |
| PATCH | `/users/me` | Update profile & goals |
| GET | `/users/search?q=` | Find athletes |
| GET | `/users/:username` | Public profile |
| POST | `/users/:id/follow` | Follow |
| DELETE | `/users/:id/follow` | Unfollow |

## Activities

| Method | Path | Description |
|---|---|---|
| POST | `/activities` | Upload recorded track → stats + anti-cheat + conquest attempt |
| GET | `/activities/:id` | Detail incl. splits & capture |
| GET | `/activities/user/:userId` | Activity history |
| GET | `/activities/stats/weekly` | Current-week totals |
| DELETE | `/activities/:id` | Delete own activity |

`POST /activities` body (simplified):
```json
{
  "type": "RUN",
  "title": "Morning loop",
  "trackPoints": [{ "lat": 12.97, "lng": 77.59, "t": 1722500000000, "ele": 910, "acc": 8 }],
  "pausedSec": 30
}
```
Response includes `capture`: `null`, `{ captured: true, stolen?: true, evaluation: { xp, score, areaSqM } }`, or rejection reasons.

## Territories

| Method | Path | Description |
|---|---|---|
| GET | `/territories?minLat=&maxLat=&minLng=&maxLng=` | Territories in map viewport |
| GET | `/territories/mine` | My kingdom |
| GET | `/territories/:id` | Detail + capture history |

## Nutrition

| Method | Path | Description |
|---|---|---|
| GET | `/nutrition/foods?q=` | Search food database |
| GET | `/nutrition/foods/barcode/:code` | Barcode lookup |
| POST | `/nutrition/foods` | Add a food item |
| POST | `/nutrition/log/food` | Log a meal entry |
| POST | `/nutrition/log/water` | Log water |
| POST | `/nutrition/log/weight` | Log weight |
| GET | `/nutrition/summary?date=` | Daily macros, water, BMI vs goals |
| GET | `/nutrition/weight/history` | Weight trend |

## Social

| Method | Path | Description |
|---|---|---|
| GET | `/social/feed` | Home feed (own + followed + public) |
| POST/DELETE | `/social/activities/:id/kudos` | Give / remove kudos |
| GET/POST | `/social/activities/:id/comments` | Comments |
| POST | `/social/messages/:userId` | Send DM |
| GET | `/social/messages/:userId` | Conversation (marks read) |

## Challenges & Leaderboards

| Method | Path | Description |
|---|---|---|
| GET | `/challenges` | Active challenges |
| POST | `/challenges/:id/join` | Join |
| POST | `/challenges/:id/sync` | Recompute my progress |
| GET | `/challenges/:id/leaderboard` | Standings |
| GET | `/leaderboards/xp` | Global XP |
| GET | `/leaderboards/territories` | Kingdom sizes |
| GET | `/leaderboards/weekly-distance?type=RUN` | Weekly distance |

## Notifications

| Method | Path | Description |
|---|---|---|
| GET | `/notifications` | List + unread count |
| POST | `/notifications/read-all` | Mark all read |
| POST | `/notifications/devices` | Register push token (FCM/APNs) |

Realtime: connect Socket.io to `/realtime` with `auth: { userId }`; server emits `notification`, `live:position`.

## Admin (ADMIN / SUPER_ADMIN)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/dashboard` | KPIs |
| GET | `/admin/users?q=` | User management |
| POST | `/admin/users/:id/ban` | Ban/unban (revokes sessions, audited) |
| GET | `/admin/moderation/flagged-activities` | Anti-cheat queue |
| GET/POST | `/admin/feature-flags` | Feature flags |
| GET | `/admin/audit-logs` | Audit trail |

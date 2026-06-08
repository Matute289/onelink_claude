# Auth & Multi-Profile Design

**Date:** 2026-06-08
**Status:** Approved

## Goal

Add user authentication and multi-profile support to Onelink. Only registered users can create and manage profiles. Anyone can view a published profile via its public URL.

---

## Architecture

The app switches from a static SPA (`nuxt generate` + nginx) to a full-stack Node.js server (`nuxt build` + Nitro).

```
[Nginx VPS]  →  [Container: Nuxt/Nitro Node.js]  →  [Container: PostgreSQL 16]
```

- **Nuxt 3 + Nitro** handles both pages (SSR) and API routes (`/api/**`)
- **better-auth** runs inside Nitro and manages all OAuth flows
- **PostgreSQL** stores users, sessions, and profiles
- **Nginx** remains the VPS reverse proxy, no structural changes needed

`nuxt.config.ts` loses `ssr: false` — the app runs in full server mode.  
`docker-compose.vps.yml` gains a second service (`onelink-postgres`).

---

## Authentication

**Provider:** OAuth only — no passwords. Supported providers: Google, GitHub, Discord, X (Twitter), Facebook.

**Session model:** better-auth issues a session token stored in an httpOnly cookie. Sessions are persisted in PostgreSQL. No JWT in localStorage, nothing exposed to browser JavaScript.

**Login flow:**
1. User visits `/` → `middleware/auth.global.ts` checks session server-side
2. Not authenticated → redirect to `/login`
3. `/login` renders 5 OAuth buttons (one per provider)
4. User clicks a provider → better-auth handles the OAuth redirect/callback at `/api/auth/**`
5. On success → session cookie set → redirect to `/`

**Route protection:** A single global Nuxt middleware (`middleware/auth.global.ts`) protects all pages except `/login` and `/p/[id]`. Runs server-side before render.

---

## Data Model

Tables managed by better-auth (auto-generated via migration):
```
users     → id, email, name, image, created_at, updated_at
accounts  → id, user_id, provider, provider_account_id, ...
sessions  → id, user_id, token, expires_at, ...
```

Table managed by the app:
```sql
profiles (
  id          TEXT PRIMARY KEY,        -- short random ID, e.g. "xK3mP9"
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,           -- user-defined label, e.g. "Laboral"
  data        JSONB NOT NULL,          -- profile content: {n, d, i, f, t, ig, gh, ...}
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
)
```

`data` stores the same JSON schema used today (`n`, `d`, `i`, social link keys, `ls` array). No migration of the existing URL-based data — clean start.

Profile `id` is an 8-character alphanumeric string generated server-side on creation.

---

## Editor & Profile Management

`pages/index.vue` is restructured into two zones (no visual changes to the form itself):

**Top zone — editor (unchanged visually):**
- Form (left) + phone preview (right) — same as today
- "Publish" button replaced by **"Guardar"** (saves/updates profile in DB) and **"Copiar URL"** (copies `/p/:id` to clipboard)
- When editing an existing profile, the editor header shows its title

**Bottom zone — "Mis perfiles" panel:**
- Scrollable list of the user's profiles, each showing: title, creation date
- Actions per row: **Editar** (loads into editor), **URL** (copies public link), **Eliminar** (confirm → delete)
- **"+ Nuevo"** button clears the editor to start a new profile

**API routes (all require authenticated session, ownership verified):**
```
GET    /api/profiles        → list profiles for current user
POST   /api/profiles        → create profile, returns { id }
PUT    /api/profiles/:id    → update profile data or title
DELETE /api/profiles/:id    → delete profile
```

All write endpoints verify that the `profile.user_id` matches the session user before acting.

---

## Public Profile Page

**Route:** `pages/p/[id].vue`

Data is fetched **server-side** via `useAsyncData`. The server queries the DB for the profile, then renders `Templates/Simple.vue` with the data. The browser receives fully-rendered HTML — no spinners, no flash, SEO-friendly.

```
GET /p/xK3mP9
  → server: SELECT * FROM profiles WHERE id = 'xK3mP9'
  → not found  → 404 error page
  → found      → render Templates/Simple.vue with profile data
```

A public API endpoint `GET /api/profile/:id` (no auth) is used by `useAsyncData` to fetch profile data. Returns 404 if not found.

The page is identical to today's public view: avatar, name, description, social icons, custom links. No auth UI, no edit buttons.

`pages/1.vue` is deleted entirely.

---

## Rate Limiting

Three layers:

**Layer 1 — better-auth (auth endpoints):**
Built-in rate limiting on `/api/auth/**`. Configurable per-endpoint limits protect against OAuth abuse.

**Layer 2 — Nitro middleware (`server/middleware/rateLimit.ts`):**
Applies to `/api/profiles/**`: 60 requests/minute per authenticated user. Returns `429 Too Many Requests` when exceeded.

**Layer 3 — Nginx (network level):**
```nginx
limit_req_zone $binary_remote_addr zone=onelink:10m rate=30r/m;
limit_req zone=onelink burst=10 nodelay;
```
30 req/min per IP, applied before requests reach the Node.js process. Public profile routes (`/p/**`) get a separate zone at 120 req/min per IP (reads only).

---

## Deployment Changes

**`deploy/Dockerfile.vps`** changes from:
- `node:alpine` builder → nginx serving static files

To:
- `node:alpine` builder → Node.js running `node .output/server/index.mjs`

**`deploy/docker-compose.vps.yml`** adds:
```yaml
services:
  onelink-app:       # Nuxt Node.js server (PORT 3000 → 127.0.0.1:8008)
  onelink-postgres:  # PostgreSQL 16, data volume mounted for persistence
```

PostgreSQL credentials injected via environment variables (`.env` on VPS, never committed to git).

---

## Files Added / Changed

| File | Change |
|------|--------|
| `nuxt.config.ts` | remove `ssr: false`, add better-auth module |
| `pages/index.vue` | add profile management panel |
| `pages/login.vue` | new — OAuth login page |
| `pages/p/[id].vue` | new — public profile page |
| `pages/1.vue` | **deleted** |
| `middleware/auth.global.ts` | new — session guard |
| `server/api/auth/[...].ts` | new — better-auth handler |
| `server/api/profiles/index.ts` | new — GET + POST |
| `server/api/profiles/[id].ts` | new — PUT + DELETE |
| `server/api/profile/[id].ts` | new — public GET (no auth) |
| `server/middleware/rateLimit.ts` | new — API rate limiting |
| `server/lib/db.ts` | new — PostgreSQL client |
| `server/lib/auth.ts` | new — better-auth instance |
| `deploy/Dockerfile.vps` | switch to Node.js server |
| `deploy/docker-compose.vps.yml` | add postgres service |
| `deploy/nginx.conf` | add rate limit zones |

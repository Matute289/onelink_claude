# Auth & Multi-Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add OAuth authentication (Google, GitHub, Discord, X, Facebook) and multi-profile management so only registered users can create/edit profiles, while anyone can view a published profile at `/p/:id`.

**Architecture:** Switch from static SPA (`nuxt generate` + nginx) to full-stack Nuxt 3 server (`nuxt build` + Nitro + Node.js). better-auth handles all OAuth flows and session management via httpOnly cookies backed by PostgreSQL. Profile data moves from URL Base64 encoding into a `profiles` DB table.

**Tech Stack:** Nuxt 3 (SSR), better-auth 1.x, PostgreSQL 16, pg (node-postgres), Docker Compose

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `nuxt.config.ts` | Modify | Remove `ssr: false`, add runtimeConfig |
| `.env.example` | Create | Document required env vars |
| `server/lib/db.ts` | Create | Shared pg.Pool singleton |
| `server/plugins/migrate.ts` | Create | Run DB migrations on server startup |
| `server/lib/auth.ts` | Create | better-auth instance with 5 providers |
| `server/api/auth/[...].ts` | Create | Catch-all handler for better-auth routes |
| `middleware/auth.global.ts` | Create | Nuxt route guard — redirect to /login if no session |
| `server/api/profiles/index.ts` | Create | GET (list user profiles) + POST (create) |
| `server/api/profiles/[id].ts` | Create | PUT (update) + DELETE |
| `server/api/profile/[id].ts` | Create | Public GET — no auth required |
| `server/middleware/rateLimit.ts` | Create | 60 req/min per user on /api/profiles/** |
| `pages/login.vue` | Create | OAuth login page with 5 provider buttons |
| `pages/p/[id].vue` | Create | Public profile page (SSR, no auth) |
| `pages/index.vue` | Modify | Add Guardar/CopiarURL buttons + Mis perfiles panel |
| `pages/1.vue` | Delete | Replaced by pages/p/[id].vue |
| `utils/transformer.js` | Delete | No longer needed — data lives in DB |
| `deploy/Dockerfile.vps` | Modify | Switch from nginx static to Node.js server |
| `deploy/docker-compose.vps.yml` | Modify | Add onelink-postgres service |
| `deploy/nginx.conf` | Modify | Add rate limit zones |

---

## Task 1: Install dependencies and configure Nuxt

**Files:**
- Modify: `package.json` (via yarn add)
- Modify: `nuxt.config.ts`
- Create: `.env.example`
- Create: `.gitignore` entry for `.env`

- [ ] **Step 1: Install production dependencies**

```bash
yarn add better-auth pg
yarn add -D @types/pg
```

Expected: `package.json` now includes `better-auth` and `pg` in dependencies.

- [ ] **Step 2: Update `nuxt.config.ts`**

Replace the entire file with:

```ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss', '@nuxt/icon', '@vueuse/nuxt'],
  build: {
    transpile: ['@headlessui/vue'],
  },
  colorMode: {
    classSuffix: '',
  },
  runtimeConfig: {
    databaseUrl: '',
    betterAuthSecret: '',
    betterAuthUrl: '',
    googleClientId: '',
    googleClientSecret: '',
    githubClientId: '',
    githubClientSecret: '',
    discordClientId: '',
    discordClientSecret: '',
    twitterClientId: '',
    twitterClientSecret: '',
    facebookClientId: '',
    facebookClientSecret: '',
  },
})
```

Note: `ssr: false` is removed — the app now runs in full server mode. Each `runtimeConfig` key maps to an env var with the `NUXT_` prefix (e.g., `databaseUrl` → `NUXT_DATABASE_URL`).

- [ ] **Step 3: Create `.env.example`**

```bash
# Database
NUXT_DATABASE_URL=postgresql://onelink:password@localhost:5432/onelink

# better-auth
NUXT_BETTER_AUTH_SECRET=generate-a-random-32-char-string-here
NUXT_BETTER_AUTH_URL=https://your-domain.com

# OAuth providers — create apps in each provider's developer console
NUXT_GOOGLE_CLIENT_ID=
NUXT_GOOGLE_CLIENT_SECRET=

NUXT_GITHUB_CLIENT_ID=
NUXT_GITHUB_CLIENT_SECRET=

NUXT_DISCORD_CLIENT_ID=
NUXT_DISCORD_CLIENT_SECRET=

NUXT_TWITTER_CLIENT_ID=
NUXT_TWITTER_CLIENT_SECRET=

NUXT_FACEBOOK_CLIENT_ID=
NUXT_FACEBOOK_CLIENT_SECRET=
```

- [ ] **Step 4: Add `.env` to `.gitignore`**

Check if `.gitignore` exists. If not, create it. Ensure it contains:

```
.env
.env.local
```

- [ ] **Step 5: Verify Nuxt starts without errors**

```bash
yarn build 2>&1 | tail -5
```

Expected: build completes (it may warn about missing env vars — that's fine for now).

- [ ] **Step 6: Commit**

```bash
git add nuxt.config.ts .env.example .gitignore package.json yarn.lock
git commit -m "feat: install better-auth + pg, switch to SSR mode"
```

---

## Task 2: Database client and startup migration

**Files:**
- Create: `server/lib/db.ts`
- Create: `server/plugins/migrate.ts`

- [ ] **Step 1: Create `server/lib/db.ts`**

```ts
import pg from 'pg'

const { Pool } = pg

let _pool: pg.Pool | null = null

export function getPool(): pg.Pool {
  if (!_pool) {
    const config = useRuntimeConfig()
    _pool = new Pool({ connectionString: config.databaseUrl })
  }
  return _pool
}
```

This lazily creates a single connection pool shared across all requests. The `useRuntimeConfig()` call reads `NUXT_DATABASE_URL` from the environment.

- [ ] **Step 2: Create `server/plugins/migrate.ts`**

```ts
import { getPool } from '~/server/lib/db'
import { auth } from '~/server/lib/auth'

export default defineNitroPlugin(async () => {
  const pool = getPool()

  // Create profiles table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      title       TEXT NOT NULL,
      data        JSONB NOT NULL DEFAULT '{}',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles (user_id)
  `)

  // Run better-auth migrations (creates users, accounts, sessions tables)
  await auth.migrate()

  console.log('[onelink] DB migrations complete')
})
```

Note: This file imports `auth` from `~/server/lib/auth` which you'll create in Task 3. Nitro plugins run sequentially at server startup so the tables exist before any request is handled.

- [ ] **Step 3: Commit**

```bash
git add server/lib/db.ts server/plugins/migrate.ts
git commit -m "feat: add pg pool and DB migration plugin"
```

---

## Task 3: better-auth instance and auth API handler

**Files:**
- Create: `server/lib/auth.ts`
- Create: `server/api/auth/[...].ts`

- [ ] **Step 1: Create `server/lib/auth.ts`**

```ts
import { betterAuth } from 'better-auth'
import { Pool } from 'pg'

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.NUXT_DATABASE_URL }),
  secret: process.env.NUXT_BETTER_AUTH_SECRET,
  baseURL: process.env.NUXT_BETTER_AUTH_URL,
  socialProviders: {
    google: {
      clientId: process.env.NUXT_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.NUXT_GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.NUXT_GITHUB_CLIENT_ID!,
      clientSecret: process.env.NUXT_GITHUB_CLIENT_SECRET!,
    },
    discord: {
      clientId: process.env.NUXT_DISCORD_CLIENT_ID!,
      clientSecret: process.env.NUXT_DISCORD_CLIENT_SECRET!,
    },
    twitter: {
      clientId: process.env.NUXT_TWITTER_CLIENT_ID!,
      clientSecret: process.env.NUXT_TWITTER_CLIENT_SECRET!,
    },
    facebook: {
      clientId: process.env.NUXT_FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.NUXT_FACEBOOK_CLIENT_SECRET!,
    },
  },
  trustedOrigins: [process.env.NUXT_BETTER_AUTH_URL!],
})
```

Note: We use `process.env` directly here (not `useRuntimeConfig()`) because this file is instantiated at module load time, before the Nuxt runtime config system is fully initialized. The `NUXT_*` prefixed env vars are always available to the server process.

- [ ] **Step 2: Create `server/api/auth/[...].ts`**

```ts
import { auth } from '~/server/lib/auth'

export default defineEventHandler((event) => {
  return auth.handler(toWebRequest(event))
})
```

This single file catches every request to `/api/auth/**` and delegates it to better-auth. better-auth exposes these routes automatically:
- `GET /api/auth/get-session` — returns current session
- `GET /api/auth/signin/:provider` — starts OAuth flow
- `GET /api/auth/callback/:provider` — OAuth callback
- `POST /api/auth/sign-out` — ends session

- [ ] **Step 3: Commit**

```bash
git add server/lib/auth.ts server/api/auth/[...].ts
git commit -m "feat: add better-auth instance and API handler"
```

---

## Task 4: Auth middleware (Nuxt route guard)

**Files:**
- Create: `middleware/auth.global.ts`

- [ ] **Step 1: Create `middleware/auth.global.ts`**

```ts
export default defineNuxtRouteMiddleware(async (to) => {
  const PUBLIC_PATHS = ['/login']
  const PUBLIC_PREFIXES = ['/p/']

  if (
    PUBLIC_PATHS.includes(to.path) ||
    PUBLIC_PREFIXES.some((prefix) => to.path.startsWith(prefix))
  ) {
    return
  }

  const session = await $fetch('/api/auth/get-session', {
    headers: useRequestHeaders(['cookie']),
  }).catch(() => null)

  if (!session?.user) {
    return navigateTo('/login')
  }
})
```

This middleware:
- Runs on every route navigation, both server-side (first request) and client-side (SPA navigation)
- Skips `/login` and any `/p/*` public profile URL
- Calls `GET /api/auth/get-session` — better-auth reads the session cookie and returns user data or null
- `useRequestHeaders(['cookie'])` forwards the session cookie on SSR so the check works server-side

- [ ] **Step 2: Verify the guard works**

Start the dev server (you'll need a local `.env` with at least `NUXT_DATABASE_URL` and `NUXT_BETTER_AUTH_SECRET`):

```bash
yarn dev
```

Open `http://localhost:3000` in the browser. Without a session, you should be redirected to `/login`. (The login page doesn't exist yet — you'll see a Nuxt 404, which is expected at this stage.)

- [ ] **Step 3: Commit**

```bash
git add middleware/auth.global.ts
git commit -m "feat: add global auth middleware"
```

---

## Task 5: Profiles API — list and create

**Files:**
- Create: `server/api/profiles/index.ts`
- Create: `server/utils/generateId.ts`

- [ ] **Step 1: Create `server/utils/generateId.ts`**

```ts
import { randomBytes } from 'node:crypto'

export function generateId(): string {
  return randomBytes(6).toString('base64url').slice(0, 8)
}
```

`base64url` uses `A-Z`, `a-z`, `0-9`, `-`, `_` — all URL-safe. Slicing to 8 chars gives 48 bits of entropy (281 trillion combinations), enough to avoid collisions for a personal tool.

- [ ] **Step 2: Write a quick sanity check for generateId**

```bash
node -e "
const { randomBytes } = require('node:crypto')
function generateId() { return randomBytes(6).toString('base64url').slice(0, 8) }
const ids = Array.from({ length: 10 }, generateId)
console.log('Sample IDs:', ids)
console.log('All length 8?', ids.every(id => id.length === 8))
console.log('All URL-safe?', ids.every(id => /^[A-Za-z0-9_-]+$/.test(id)))
"
```

Expected output: 10 unique 8-char strings, all passing URL-safe check.

- [ ] **Step 3: Create `server/api/profiles/index.ts`**

```ts
import { getPool } from '~/server/lib/db'
import { auth } from '~/server/lib/auth'
import { generateId } from '~/server/utils/generateId'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  const userId = session.user.id

  if (event.method === 'GET') {
    const pool = getPool()
    const { rows } = await pool.query(
      `SELECT id, title, created_at, updated_at
       FROM profiles
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    )
    return rows
  }

  if (event.method === 'POST') {
    const body = await readBody(event)
    if (!body?.title || typeof body.title !== 'string') {
      throw createError({ statusCode: 400, message: 'title is required' })
    }
    if (!body?.data || typeof body.data !== 'object') {
      throw createError({ statusCode: 400, message: 'data is required' })
    }
    const id = generateId()
    const pool = getPool()
    await pool.query(
      `INSERT INTO profiles (id, user_id, title, data)
       VALUES ($1, $2, $3, $4)`,
      [id, userId, body.title, JSON.stringify(body.data)]
    )
    return { id }
  }

  throw createError({ statusCode: 405, message: 'Method Not Allowed' })
})
```

- [ ] **Step 4: Verify with curl (requires running server + valid session cookie)**

With the dev server running and a valid session, test the list endpoint:

```bash
# After logging in via browser, copy the session cookie from DevTools → Application → Cookies
curl -s http://localhost:3000/api/profiles \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN" | jq .
```

Expected: `[]` (empty array, no profiles yet).

Test create:

```bash
curl -s -X POST http://localhost:3000/api/profiles \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN" \
  -d '{"title":"Laboral","data":{"n":"Test","d":"Desc","ls":[]}}' | jq .
```

Expected: `{"id":"xK3mP9ab"}` (8-char random ID).

- [ ] **Step 5: Commit**

```bash
git add server/api/profiles/index.ts server/utils/generateId.ts
git commit -m "feat: add profiles list and create API"
```

---

## Task 6: Profiles API — update, delete, and public get

**Files:**
- Create: `server/api/profiles/[id].ts`
- Create: `server/api/profile/[id].ts`

- [ ] **Step 1: Create `server/api/profiles/[id].ts`**

```ts
import { getPool } from '~/server/lib/db'
import { auth } from '~/server/lib/auth'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  const userId = session.user.id
  const profileId = getRouterParam(event, 'id')!
  const pool = getPool()

  // Verify ownership before any mutation
  const { rows } = await pool.query(
    `SELECT user_id FROM profiles WHERE id = $1`,
    [profileId]
  )
  if (rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Profile not found' })
  }
  if (rows[0].user_id !== userId) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  if (event.method === 'PUT') {
    const body = await readBody(event)
    const fields: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (body?.title !== undefined) {
      fields.push(`title = $${idx++}`)
      values.push(body.title)
    }
    if (body?.data !== undefined) {
      fields.push(`data = $${idx++}`)
      values.push(JSON.stringify(body.data))
    }
    if (fields.length === 0) {
      throw createError({ statusCode: 400, message: 'Nothing to update' })
    }
    fields.push(`updated_at = now()`)
    values.push(profileId)

    await pool.query(
      `UPDATE profiles SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    )
    return { ok: true }
  }

  if (event.method === 'DELETE') {
    await pool.query(`DELETE FROM profiles WHERE id = $1`, [profileId])
    return { ok: true }
  }

  throw createError({ statusCode: 405, message: 'Method Not Allowed' })
})
```

- [ ] **Step 2: Create `server/api/profile/[id].ts`** (public, no auth)

```ts
import { getPool } from '~/server/lib/db'

export default defineEventHandler(async (event) => {
  const profileId = getRouterParam(event, 'id')!
  const pool = getPool()

  const { rows } = await pool.query(
    `SELECT id, title, data FROM profiles WHERE id = $1`,
    [profileId]
  )

  if (rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Profile not found' })
  }

  return rows[0]
})
```

Note: route is `/api/profile/:id` (singular) — distinct from the authenticated `/api/profiles/:id` (plural). This endpoint returns profile data to anyone, no session required.

- [ ] **Step 3: Verify ownership protection with curl**

```bash
# Attempt to delete another user's profile (should return 403)
curl -s -X DELETE http://localhost:3000/api/profiles/ANOTHER_USERS_ID \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN" | jq .
```

Expected: `{"statusCode":403,"message":"Forbidden"}`

```bash
# Public GET — no cookie needed
curl -s http://localhost:3000/api/profile/EXISTING_PROFILE_ID | jq .
```

Expected: profile object with `id`, `title`, `data`.

- [ ] **Step 4: Commit**

```bash
git add server/api/profiles/[id].ts server/api/profile/[id].ts
git commit -m "feat: add profiles update/delete and public profile GET API"
```

---

## Task 7: Rate limiting middleware

**Files:**
- Create: `server/middleware/rateLimit.ts`

- [ ] **Step 1: Create `server/middleware/rateLimit.ts`**

```ts
import { auth } from '~/server/lib/auth'

const WINDOW_MS = 60_000 // 1 minute
const MAX_REQUESTS = 60

// In-memory store: userId → { count, resetAt }
const store = new Map<string, { count: number; resetAt: number }>()

export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/profiles')) return

  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) return // unauthenticated requests are handled by the route itself

  const userId = session.user.id
  const now = Date.now()
  const entry = store.get(userId)

  if (!entry || now > entry.resetAt) {
    store.set(userId, { count: 1, resetAt: now + WINDOW_MS })
    return
  }

  entry.count++
  if (entry.count > MAX_REQUESTS) {
    throw createError({
      statusCode: 429,
      message: 'Too many requests. Please wait a minute.',
    })
  }
})
```

Note: This is an in-memory store — it resets on server restart and doesn't share state across multiple instances. For a single-VPS deployment this is perfectly adequate.

- [ ] **Step 2: Verify rate limiting**

```bash
# Run 61 rapid requests — the 61st should return 429
for i in $(seq 1 61); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    http://localhost:3000/api/profiles \
    -H "Cookie: better-auth.session_token=YOUR_TOKEN")
  echo "Request $i: $STATUS"
done
```

Expected: requests 1-60 return `200`, request 61 returns `429`.

- [ ] **Step 3: Commit**

```bash
git add server/middleware/rateLimit.ts
git commit -m "feat: add in-memory rate limiting on /api/profiles"
```

---

## Task 8: Login page

**Files:**
- Create: `pages/login.vue`

- [ ] **Step 1: Create `pages/login.vue`**

```vue
<template>
  <div class="min-h-screen bg-gradient-to-b from-amber-50 via-rose-50 to-fuchsia-100 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm space-y-6">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-slate-800">Onelink</h1>
        <p class="text-sm text-slate-500 mt-1">Iniciá sesión para continuar</p>
      </div>

      <div class="space-y-3">
        <a
          v-for="provider in providers"
          :key="provider.id"
          :href="`/api/auth/signin/${provider.id}`"
          class="flex items-center justify-center space-x-3 w-full border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <icon :name="provider.icon" class="h-5 w-5" />
          <span>Continuar con {{ provider.label }}</span>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const providers = [
  { id: 'google',   label: 'Google',  icon: 'mdi:google' },
  { id: 'github',   label: 'GitHub',  icon: 'mdi:github' },
  { id: 'discord',  label: 'Discord', icon: 'ic:baseline-discord' },
  { id: 'twitter',  label: 'X',       icon: 'mdi:twitter' },
  { id: 'facebook', label: 'Facebook',icon: 'mdi:facebook' },
]
</script>
```

`definePageMeta({ layout: false })` prevents the default layout from wrapping this page — the login page is self-contained.

Each `<a>` link points to `/api/auth/signin/:provider` — better-auth handles the redirect to the provider's OAuth page.

- [ ] **Step 2: Verify login page renders**

```bash
yarn dev
```

Open `http://localhost:3000` — you should be redirected to `/login`. The login page should show 5 provider buttons. (Clicking them will fail until OAuth credentials are configured in `.env`.)

- [ ] **Step 3: Commit**

```bash
git add pages/login.vue
git commit -m "feat: add OAuth login page"
```

---

## Task 9: Public profile page and cleanup

**Files:**
- Create: `pages/p/[id].vue`
- Delete: `pages/1.vue`
- Delete: `utils/transformer.js`

- [ ] **Step 1: Create `pages/p/[id].vue`**

```vue
<template>
  <div class="min-h-screen bg-gradient-to-b from-amber-50 via-rose-50 to-fuchsia-100">
    <templates-simple v-if="profile" :acc="profile.data" />
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const route = useRoute()
const { data: profile, error } = await useAsyncData(
  `profile-${route.params.id}`,
  () => $fetch(`/api/profile/${route.params.id}`)
)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Perfil no encontrado' })
}
</script>
```

`useAsyncData` fetches the profile server-side. If the profile doesn't exist, the server throws a 404 that Nuxt renders as its built-in error page. `layout: false` keeps the page standalone (no editor chrome).

- [ ] **Step 2: Delete `pages/1.vue`**

```bash
git rm pages/1.vue
```

- [ ] **Step 3: Delete `utils/transformer.js`**

The transformer (Base64 encode/decode) is no longer used — profile data lives in the DB. Remove the file and its only importer.

```bash
git rm utils/transformer.js
```

Then open `pages/index.vue` and remove the import line:
```js
import { encodeData } from "../utils/transformer";
```
(You'll rewrite the `publish` function in Task 10.)

- [ ] **Step 4: Verify public profile page**

With a profile ID created in Task 5, open `http://localhost:3000/p/YOUR_PROFILE_ID`. You should see the profile rendered server-side — view source should show the profile content in the HTML (not an empty shell).

- [ ] **Step 5: Commit**

```bash
git add pages/p/[id].vue pages/index.vue
git commit -m "feat: add public profile page, delete 1.vue and transformer"
```

---

## Task 10: Editor redesign

**Files:**
- Modify: `pages/index.vue`

This is the largest UI change. The editor gets two new features:
1. "Guardar" + "Copiar URL" replace "Publish"
2. "Mis perfiles" panel below the editor

- [ ] **Step 1: Replace `pages/index.vue` entirely**

```vue
<template>
  <div class="h-screen flex flex-col">
    <!-- Top: editor + preview -->
    <div class="flex-1 grid grid-cols-3 divide-x overflow-hidden">
      <div class="col-span-2 h-full flex flex-col bg-slate-100">
        <div class="flex-1 overflow-y-auto p-8">
          <app-form-profile
            v-model:name="data.n"
            v-model:desc="data.d"
            v-model:image="data.i"
          />
          <app-form-hr />
          <app-form-social-links
            v-model:facebook="data.f"
            v-model:twitter="data.t"
            v-model:instagram="data.ig"
            v-model:github="data.gh"
            v-model:telegram="data.tg"
            v-model:linkedin="data.l"
            v-model:email="data.e"
            v-model:whatsapp="data.w"
            v-model:youtube="data.y"
          />
          <app-form-hr />
          <app-form-links v-model="data.ls" />
        </div>

        <!-- Action bar -->
        <div class="border-t bg-white flex items-center">
          <button
            @click="prefillDemoData"
            class="h-12 flex items-center space-x-2 px-4 border-r text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <span>Demo</span>
            <icon name="mdi:code-json" class="h-4 w-4" />
          </button>
          <button
            @click="saveProfile"
            :disabled="saving"
            class="h-12 flex items-center space-x-2 px-4 border-r text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <span>{{ saving ? 'Guardando...' : (editingId ? 'Guardar' : 'Guardar nuevo') }}</span>
            <icon name="ph:floppy-disk-duotone" class="h-4 w-4" />
          </button>
          <button
            v-if="editingId"
            @click="copyUrl"
            class="h-12 flex items-center space-x-2 px-4 border-r text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <span>Copiar URL</span>
            <icon name="ph:link-duotone" class="h-4 w-4" />
          </button>
          <button
            @click="signOut"
            class="h-12 flex items-center space-x-2 px-4 text-xs font-medium text-slate-500 hover:bg-slate-50 ml-auto"
          >
            <span>Salir</span>
            <icon name="ph:sign-out-duotone" class="h-4 w-4" />
          </button>
          <a
            href="https://github.com/Matute289/onelink_claude"
            target="_blank"
            class="h-12 flex items-center space-x-2 px-4 border-l text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <icon name="mdi:github" class="h-4 w-4" />
          </a>
        </div>
      </div>
      <app-form-preview :data="data" />
    </div>

    <!-- Bottom: Mis perfiles panel -->
    <div class="h-48 border-t bg-white flex flex-col">
      <div class="flex items-center justify-between px-6 py-3 border-b">
        <h2 class="text-sm font-semibold text-slate-700">Mis perfiles</h2>
        <button
          @click="newProfile"
          class="flex items-center space-x-1 text-xs font-medium text-slate-600 hover:text-slate-900 border rounded-md px-3 py-1.5 hover:bg-slate-50"
        >
          <icon name="ph:plus-bold" class="h-3.5 w-3.5" />
          <span>Nuevo</span>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div v-if="profiles.length === 0" class="flex items-center justify-center h-full text-sm text-slate-400">
          No tenés perfiles todavía. Completá el formulario y guardá.
        </div>
        <table v-else class="w-full text-sm">
          <tbody>
            <tr
              v-for="profile in profiles"
              :key="profile.id"
              class="border-b last:border-0 hover:bg-slate-50"
            >
              <td class="px-6 py-2 font-medium text-slate-700">{{ profile.title }}</td>
              <td class="px-2 py-2 text-xs text-slate-400">
                {{ new Date(profile.created_at).toLocaleDateString('es-AR') }}
              </td>
              <td class="px-4 py-2 text-right space-x-2">
                <button
                  @click="loadProfile(profile)"
                  class="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100"
                >Editar</button>
                <button
                  @click="copyProfileUrl(profile.id)"
                  class="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100"
                >URL</button>
                <button
                  @click="deleteProfile(profile.id)"
                  class="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                >Borrar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
const EMPTY_DATA = () => ({
  n: '', d: '', i: '',
  f: '', t: '', ig: '', gh: '', tg: '', l: '', e: '', w: '', y: '',
  ls: [],
})

const data = ref(EMPTY_DATA())
const editingId = ref(null)
const saving = ref(false)

const { data: profiles, refresh: refreshProfiles } = await useAsyncData(
  'profiles',
  () => $fetch('/api/profiles')
)

async function saveProfile() {
  if (!data.value.n && !data.value.d) {
    alert('Completá al menos el nombre o la descripción.')
    return
  }
  const title = prompt('Título para este perfil (ej: Laboral, Hobbies):', editingId.value
    ? profiles.value?.find(p => p.id === editingId.value)?.title ?? ''
    : '')
  if (!title) return

  saving.value = true
  try {
    if (editingId.value) {
      await $fetch(`/api/profiles/${editingId.value}`, {
        method: 'PUT',
        body: { title, data: data.value },
      })
    } else {
      const result = await $fetch('/api/profiles', {
        method: 'POST',
        body: { title, data: data.value },
      })
      editingId.value = result.id
    }
    await refreshProfiles()
  } finally {
    saving.value = false
  }
}

function copyUrl() {
  if (!editingId.value) return
  copyProfileUrl(editingId.value)
}

function copyProfileUrl(id) {
  const url = `${window.location.origin}/p/${id}`
  navigator.clipboard.writeText(url).then(() => alert('URL copiada al clipboard'))
}

async function loadProfile(profile) {
  const full = await $fetch(`/api/profile/${profile.id}`)
  data.value = { ...EMPTY_DATA(), ...full.data }
  editingId.value = profile.id
}

async function deleteProfile(id) {
  if (!confirm('¿Seguro que querés borrar este perfil?')) return
  await $fetch(`/api/profiles/${id}`, { method: 'DELETE' })
  if (editingId.value === id) newProfile()
  await refreshProfiles()
}

function newProfile() {
  data.value = EMPTY_DATA()
  editingId.value = null
}

function prefillDemoData() {
  data.value = {
    n: 'John Snow',
    d: "I'm John Snow, the king in the north. I know Nothing.",
    i: 'https://i.insider.com/56743fad72f2c12a008b6cc0',
    f: 'https://www.facebook.com/john_snow',
    t: 'https://twitter.com/john_snow',
    ig: 'https://www.instagram.com/john_snow',
    e: 'mail@john_snow.cc',
    gh: 'https://github.com/john_snow',
    tg: 'https://t.me/john_snow',
    w: '+918888888888',
    y: 'https://youtube.com/@john_snow',
    l: 'https://linkedin.com/john_snow',
    ls: [
      { l: 'My Website', i: 'ph:globe-duotone', u: 'https://example.com' },
    ],
  }
}

async function signOut() {
  await $fetch('/api/auth/sign-out', { method: 'POST' })
  navigateTo('/login')
}
</script>
```

- [ ] **Step 2: Verify the editor panel works end-to-end**

With the dev server running and logged in:
1. Fill in the form → click "Guardar nuevo" → enter a title → profile appears in the "Mis perfiles" panel
2. Click "Editar" on a profile → form fills with that profile's data
3. Make a change → click "Guardar" → updated_at changes
4. Click "URL" → clipboard gets `http://localhost:3000/p/:id`
5. Open that URL in an incognito window → profile renders publicly
6. Click "Borrar" → confirm → profile disappears from panel
7. Click "Nuevo" → form clears
8. Click "Salir" → redirected to `/login`

- [ ] **Step 3: Commit**

```bash
git add pages/index.vue
git commit -m "feat: redesign editor with Guardar/CopiarURL and Mis perfiles panel"
```

---

## Task 11: Deployment update

**Files:**
- Modify: `deploy/Dockerfile.vps`
- Modify: `deploy/docker-compose.vps.yml`
- Modify: `deploy/nginx.conf`

- [ ] **Step 1: Replace `deploy/Dockerfile.vps`**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/.output /app/.output
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", ".output/server/index.mjs"]
```

Key changes:
- `yarn generate` → `yarn build` (Node.js server instead of static files)
- Second stage: `node:22-alpine` instead of `nginx:alpine`
- Runs `node .output/server/index.mjs` — the Nitro server entry point

- [ ] **Step 2: Replace `deploy/docker-compose.vps.yml`**

```yaml
services:
  onelink-app:
    image: onelink-web:latest
    container_name: onelink-app
    ports:
      - "127.0.0.1:8008:3000"
    env_file: .env
    mem_limit: 256m
    restart: unless-stopped
    depends_on:
      - onelink-postgres

  onelink-postgres:
    image: postgres:16-alpine
    container_name: onelink-postgres
    environment:
      POSTGRES_DB: onelink
      POSTGRES_USER: onelink
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    mem_limit: 128m
    restart: unless-stopped

volumes:
  postgres_data:
```

Add `POSTGRES_PASSWORD` to `.env.example`:

```bash
POSTGRES_PASSWORD=choose-a-strong-password
NUXT_DATABASE_URL=postgresql://onelink:choose-a-strong-password@onelink-postgres:5432/onelink
```

Note: `onelink-postgres` is the hostname inside Docker's network. The `NUXT_DATABASE_URL` uses `onelink-postgres` as the host, not `localhost`.

- [ ] **Step 3: Replace `deploy/nginx.conf`**

```nginx
limit_req_zone $binary_remote_addr zone=onelink_api:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=onelink_pub:10m rate=120r/m;

server {
    listen 80;

    location /p/ {
        limit_req zone=onelink_pub burst=20 nodelay;
        proxy_pass http://127.0.0.1:8008;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        limit_req zone=onelink_api burst=10 nodelay;
        proxy_pass http://127.0.0.1:8008;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Changes from the old config:
- Removed `root`, `index`, `try_files` — nginx is now a reverse proxy, not a file server
- Two rate limit zones: `onelink_pub` (120 req/min) for public profiles, `onelink_api` (30 req/min) for everything else
- `proxy_set_header X-Forwarded-Proto $scheme` ensures better-auth generates the correct `https://` callback URLs

- [ ] **Step 4: Deploy to VPS**

On the VPS:

```bash
# 1. Create .env with all required values (see .env.example)
nano .env

# 2. Pull latest code
git pull origin vps-deploy

# 3. Build the Docker image
docker build -f deploy/Dockerfile.vps -t onelink-web:latest .

# 4. Start services
docker compose -f deploy/docker-compose.vps.yml up -d

# 5. Check logs for successful migration
docker logs onelink-app --tail 30
```

Expected in logs: `[onelink] DB migrations complete`

- [ ] **Step 5: Configure OAuth callback URLs in each provider's developer console**

For each provider, the callback URL to register is:
```
https://your-domain.com/api/auth/callback/google
https://your-domain.com/api/auth/callback/github
https://your-domain.com/api/auth/callback/discord
https://your-domain.com/api/auth/callback/twitter
https://your-domain.com/api/auth/callback/facebook
```

- [ ] **Step 6: Smoke test the deployed app**

```bash
# Public profile (no auth needed)
curl -I https://your-domain.com/p/SOME_PROFILE_ID
# Expected: HTTP/2 200

# Editor (should redirect to login)
curl -I https://your-domain.com/
# Expected: HTTP/2 302 → Location: /login

# Rate limit test (31st request in under a minute should return 429)
for i in $(seq 1 31); do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" https://your-domain.com/
done
```

- [ ] **Step 7: Commit**

```bash
git add deploy/Dockerfile.vps deploy/docker-compose.vps.yml deploy/nginx.conf .env.example
git commit -m "feat: update deployment to Node.js server + PostgreSQL"
```

---

## OAuth Developer Console Setup Reference

Each provider requires creating an "app" or "OAuth client" in its developer console:

| Provider | Console URL | Notes |
|----------|------------|-------|
| Google | console.cloud.google.com → APIs & Services → Credentials | Create OAuth 2.0 Client ID, type: Web application |
| GitHub | github.com → Settings → Developer settings → OAuth Apps | Homepage URL + callback URL |
| Discord | discord.com/developers/applications | Add Redirect URI in OAuth2 tab |
| X (Twitter) | developer.twitter.com → Projects & Apps | Enable OAuth 2.0, set callback URL |
| Facebook | developers.facebook.com → Apps | Add "Facebook Login" product, set Valid OAuth Redirect URIs |

All callbacks follow the pattern: `https://your-domain.com/api/auth/callback/:provider`

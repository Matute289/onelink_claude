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

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

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

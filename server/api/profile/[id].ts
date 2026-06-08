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

import { getMigrations } from 'better-auth/db'
import { getPool } from '~/server/lib/db'
import { auth } from '~/server/lib/auth'

export default defineNitroPlugin(async () => {
  const pool = getPool()

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

  const { runMigrations } = await getMigrations(auth.options)
  await runMigrations()

  console.log('[onelink] DB migrations complete')
})

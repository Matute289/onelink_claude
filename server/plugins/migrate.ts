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

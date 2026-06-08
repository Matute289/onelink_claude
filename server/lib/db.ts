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

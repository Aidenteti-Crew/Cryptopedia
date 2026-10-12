import { Pool } from 'pg'

import type { QueryFn } from './query.js'

export interface PgConnection {
  query: QueryFn
  close: () => Promise<void>
}

export function createPgConnection(databaseUrl: string): PgConnection {
  const pool = new Pool({ connectionString: databaseUrl })
  return {
    query: async (sql, params) => {
      const result = await pool.query(sql, params)
      return { rows: result.rows, rowCount: result.rowCount }
    },
    close: () => pool.end(),
  }
}

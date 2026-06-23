import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

export type Db = NodePgDatabase<typeof schema>;

export interface DbHandle {
  db: Db;
  pool: pg.Pool;
  close: () => Promise<void>;
}

export interface CreateDbOptions {
  /** Max pool size. Keep small — single-user app. */
  max?: number;
  /**
   * Idle connection timeout (ms). Connections are released after this so Neon's
   * compute can suspend between bursts (preserves scale-to-zero — R-2).
   */
  idleTimeoutMillis?: number;
}

/**
 * Create a Drizzle client backed by a node-postgres pool. Used by the API
 * service and the worker on Railway. Transactions are supported (the action
 * layer writes a mutation + its event row atomically).
 */
export function createDb(connectionString: string, opts: CreateDbOptions = {}): DbHandle {
  const pool = new pg.Pool({
    connectionString,
    max: opts.max ?? 4,
    idleTimeoutMillis: opts.idleTimeoutMillis ?? 10_000,
    // Neon requires TLS.
    ssl: connectionString.includes('localhost') ? undefined : { rejectUnauthorized: false },
  });
  const db = drizzle(pool, { schema });
  return {
    db,
    pool,
    close: async () => {
      await pool.end();
    },
  };
}

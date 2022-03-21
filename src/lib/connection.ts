import { Pool } from 'pg';
import { getConfig } from './config';

const cfg = getConfig();
let pool: Pool;

export function initPool() {
  if (!pool) {
    const { host, port, user, password, database, ssl } = cfg.connection;
    const connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}?sslmode=${ssl}`;
    pool = new Pool({ connectionString });
  }
}

export async function stopPool() {
  if (pool) {
    await pool.end();
  }
}

export function getPool() {
  return pool;
}

export async function getClient(){
  initPool();
  pool = getPool();
  const client = await pool.connect();
  return client;
}

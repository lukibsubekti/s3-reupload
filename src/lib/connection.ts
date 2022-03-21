import { Pool } from 'pg';
import { getConfig } from './config';

const cfg = getConfig();
let pool: Pool;

export function initPool() {
  if (!pool) {
    const { host, port, user, password, database, ssl } = cfg.connection;
    const connectionString = `postgres://${user}:${password}@${host}:${port}/${database}`;
    pool = new Pool({ connectionString, ssl: ssl ? { rejectUnauthorized: false } : false });
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

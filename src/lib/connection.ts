import { Pool } from 'pg';
import { getConfig } from './config';

const cfg = getConfig();
let pool: Pool;

export function initPool() {
  if (!pool) {
    pool = new Pool(cfg.connection);
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

import mysql, { Pool } from 'mysql2/promise';
import { env } from './env';

let pool: Pool | null = null;

export const getDbPool = (): Pool => {
  if (pool) return pool;

  pool = mysql.createPool({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    connectionLimit: env.db.connectionLimit,
    waitForConnections: true,
    queueLimit: 0
  });

  return pool;
};

export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const conn = await getDbPool().getConnection();
    conn.release();
    return true;
  } catch {
    return false;
  }
};

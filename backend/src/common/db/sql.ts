import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getDbPool } from '../../config/database';

export const queryRows = async <T = RowDataPacket>(
  sql: string,
  params: any[] = []
): Promise<T[]> => {
  const [rows] = await getDbPool().query(sql, params);
  return rows as T[];
};

export const executeSql = async (
  sql: string,
  params: any[] = []
): Promise<ResultSetHeader> => {
  const [result] = await getDbPool().execute(sql, params);
  return result as ResultSetHeader;
};

export const one = async <T = RowDataPacket>(
  sql: string,
  params: any[] = []
): Promise<T | undefined> => {
  const rows = await queryRows<T>(sql, params);
  return rows[0];
};

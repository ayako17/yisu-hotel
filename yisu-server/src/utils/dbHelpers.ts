import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// 通用查询函数 - 使用 query 而不是 execute
export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  console.log('执行SQL:', sql);
  console.log('参数:', params);
  try {
    // 使用 query 方法代替 execute
    const [rows] = await pool.query(sql, params);
    return rows as T;
  } catch (error) {
    console.error('SQL执行失败:', error);
    throw error;
  }
}

// 查询单条记录
export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T[]>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// 执行插入/更新/删除 - 使用 execute 方法
export async function execute(sql: string, params?: any[]): Promise<ResultSetHeader> {
  console.log('执行SQL:', sql);
  console.log('参数:', params);
  try {
    const [result] = await pool.execute(sql, params);
    return result as ResultSetHeader;
  } catch (error) {
    console.error('SQL执行失败:', error);
    throw error;
  }
}

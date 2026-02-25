import { Request, Response } from 'express';
import pool from '../../config/db';

// 获取标签列表
export const getTags = async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    
    let sql = 'SELECT tag_id, name, tag_type FROM tags WHERE 1=1';
    const params: any[] = [];
    
    if (type === 'facility' || type === 'special') {
      sql += ' AND tag_type = ?';
      params.push(type);
    }
    
    sql += ' ORDER BY tag_type, sort_order';
    
    const [rows]: any = await pool.query(sql, params);
    res.json(rows || []);
  } catch (error) {
    console.error('获取标签列表失败:', error);
    res.status(500).json({ msg: '服务器错误' });
  }
};
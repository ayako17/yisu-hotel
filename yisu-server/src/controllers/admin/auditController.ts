import { Request, Response } from 'express';
import pool from '../../config/db';

export const getMerchantAudits = async (req: Request, res: Response) => {
  try {
    // 联合查询 merchant_profiles 和 users 表，获取商户详细信息
    const [rows] = await pool.execute(`
      SELECT 
        m.user_id, 
        u.username, 
        u.phone, 
        m.license_image_url, 
        m.apply_reason, 
        m.status, 
        u.created_at
      FROM merchant_profiles m
      JOIN users u ON m.user_id = u.user_id
      ORDER BY u.created_at DESC
    `);

    res.json({
      code: 200,
      msg: '获取成功',
      data: rows
    });
  } catch (error: any) {
    res.json({ code: 500, msg: '获取列表失败: ' + error.message });
  }
};
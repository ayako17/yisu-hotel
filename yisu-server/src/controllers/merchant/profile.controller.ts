import { Request, Response } from 'express';
import pool from '../../config/db';

// 获取商户资料
export const getProfile = async (req: Request, res: Response) => {
  try {
    const user_id = req.user!.user_id;
    
    const [rows]: any = await pool.query(
      'SELECT * FROM merchant_profiles WHERE user_id = ?',
      [user_id]
    );
    
    if (!rows.length) {
      // 如果不存在，创建一条空记录
      await pool.query(
        'INSERT INTO merchant_profiles (user_id) VALUES (?)',
        [user_id]
      );
      
      const [newRows]: any = await pool.query(
        'SELECT * FROM merchant_profiles WHERE user_id = ?',
        [user_id]
      );
      
      const p = newRows[0] || {};
      return res.json({
        ...p,
        establish_date: p.establish_date ? (p.establish_date.toISOString ? p.establish_date.toISOString().slice(0, 10) : p.establish_date) : null,
        valid_until: p.valid_until ? (p.valid_until.toISOString ? p.valid_until.toISOString().slice(0, 10) : p.valid_until) : null
      });
    }
    
    const p = rows[0];
    res.json({
      ...p,
      establish_date: p.establish_date ? (p.establish_date.toISOString ? p.establish_date.toISOString().slice(0, 10) : p.establish_date) : null,
      valid_until: p.valid_until ? (p.valid_until.toISOString ? p.valid_until.toISOString().slice(0, 10) : p.valid_until) : null
    });
  } catch (error) {
    console.error('获取商户资料失败:', error);
    res.status(500).json({ msg: '服务器错误' });
  }
};

// 更新商户资料
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const user_id = req.user!.user_id;
    const { license_image_url, license_no, issuing_authority, establish_date, valid_until } = req.body;
    
    // 检查是否存在
    const [rows]: any = await pool.query(
      'SELECT * FROM merchant_profiles WHERE user_id = ?',
      [user_id]
    );
    
    if (!rows.length) {
      await pool.query(
        'INSERT INTO merchant_profiles (user_id) VALUES (?)',
        [user_id]
      );
    }
    
    await pool.query(
      `UPDATE merchant_profiles SET 
        license_image_url = COALESCE(?, license_image_url),
        license_no = COALESCE(?, license_no),
        issuing_authority = COALESCE(?, issuing_authority),
        establish_date = ?,
        valid_until = ?
       WHERE user_id = ?`,
      [license_image_url ?? null, license_no ?? null, issuing_authority ?? null, 
       establish_date || null, valid_until || null, user_id]
    );
    
    res.json({ msg: '营业执照信息已更新' });
  } catch (error) {
    console.error('更新商户资料失败:', error);
    res.status(500).json({ msg: '服务器错误' });
  }
};
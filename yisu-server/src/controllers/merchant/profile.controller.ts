// yisu-server/src/controllers/merchant/profile.controller.ts
import { Request, Response } from 'express';
import pool from '../../config/db';

// 获取商户资料 - 联合查询 users 表和 merchant_profiles 表
export const getProfile = async (req: Request, res: Response) => {
  try {
    const user_id = req.user!.user_id;
    
    // 联合查询 users 表和 merchant_profiles 表 - 添加所有字段
    const [rows]: any = await pool.query(
      `SELECT 
        u.user_id,
        u.username,
        u.phone,
        u.avatar_url,
        u.status as account_status,
        mp.license_image_url,
        mp.license_no,              -- 添加统一社会信用代码
        mp.issuing_authority,        -- 添加发证机关
        mp.establish_date,           -- 添加成立日期
        mp.valid_until,              -- 添加有效期限
        mp.status as merchant_status,
        mp.apply_reason,
        mp.rejection_reason,
        mp.created_at as merchant_created_at,
        mp.updated_at as merchant_updated_at,
        u.created_at
       FROM users u
       LEFT JOIN merchant_profiles mp ON u.user_id = mp.user_id
       WHERE u.user_id = ?`,
      [user_id]
    );
    
    if (!rows.length) {
      return res.status(404).json({ 
        code: 404, 
        msg: '用户不存在' 
      });
    }
    
    const userData = rows[0];
    
    // 如果商户资料不存在，创建一条空记录（可选）
    if (!userData.license_image_url && !userData.merchant_status) {
      await pool.query(
        'INSERT INTO merchant_profiles (user_id, status) VALUES (?, ?)',
        [user_id, 'pending']
      );
    }
    
    res.json({
      code: 200,
      data: {
        user_id: userData.user_id,
        username: userData.username || '新用户',
        phone: userData.phone || '',
        avatar_url: userData.avatar_url,
        account_status: userData.account_status,
        // 商户资质信息 - 包含所有字段
        license_image_url: userData.license_image_url,
        license_no: userData.license_no,
        issuing_authority: userData.issuing_authority,
        establish_date: userData.establish_date,
        valid_until: userData.valid_until,
        status: userData.merchant_status || 'pending',
        apply_reason: userData.apply_reason,
        rejection_reason: userData.rejection_reason,
        created_at: userData.created_at,
        updated_at: userData.merchant_updated_at || userData.updated_at
      }
    });
    
  } catch (error) {
    console.error('获取商户资料失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 更新商户资料 - 只更新 merchant_profiles 表
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const user_id = req.user!.user_id;
    const { license_image_url, apply_reason } = req.body;
    
    // 检查商户资料是否存在
    const [rows]: any = await pool.query(
      'SELECT * FROM merchant_profiles WHERE user_id = ?',
      [user_id]
    );
    
    if (!rows.length) {
      // 如果不存在，创建新记录
      await pool.query(
        `INSERT INTO merchant_profiles 
         (user_id, license_image_url, apply_reason, status, created_at, updated_at) 
         VALUES (?, ?, ?, 'pending', NOW(), NOW())`,
        [user_id, license_image_url || null, apply_reason || null]
      );
    } else {
      // 更新现有记录
      await pool.query(
        `UPDATE merchant_profiles SET 
          license_image_url = COALESCE(?, license_image_url),
          apply_reason = COALESCE(?, apply_reason),
          status = 'pending',
          updated_at = NOW()
         WHERE user_id = ?`,
        [license_image_url ?? null, apply_reason ?? null, user_id]
      );
    }
    
    res.json({ 
      code: 200, 
      msg: '资料已更新' 
    });
    
  } catch (error) {
    console.error('更新商户资料失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};
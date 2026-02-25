import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 登录
export const login = async (req: Request, res: Response) => {
  // 登录不需要认证，所以这里用 Request 而不是 AuthRequest
  try {
    const { phone, password, account, username } = req.body;
    const acct = phone || account || username || '';
    
    if (!acct || !password) {
      return res.status(400).json({ msg: '缺少账号或密码' });
    }
    
    const [rows]: any = await pool.query(
      'SELECT * FROM users WHERE phone = ? OR username = ? LIMIT 1',
      [acct, acct]
    );
    
    if (!rows.length) {
      return res.status(401).json({ msg: '用户不存在' });
    }
    
    const user = rows[0];
    const isValid = bcrypt.compareSync(password, user.password);
    
    if (!isValid) {
      return res.status(401).json({ msg: '密码错误' });
    }
    
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    
    res.json({
      token,
      user: {
        user_id: user.user_id,
        phone: user.phone,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ msg: '服务器错误' });
  }
};

// 注册
export const register = async (req: Request, res: Response) => {
  try {
    const { phone, password, username, role } = req.body;
    
    if (!['merchant', 'admin', 'user'].includes(role)) {
      return res.status(400).json({ msg: '角色无效' });
    }
    
    const [exist]: any = await pool.query(
      'SELECT * FROM users WHERE phone = ?',
      [phone]
    );
    
    if (exist.length) {
      return res.status(400).json({ msg: '手机号已被注册' });
    }
    
    const hash = bcrypt.hashSync(password, 10);
    
    await pool.query(
      'INSERT INTO users (phone, password, username, role) VALUES (?, ?, ?, ?)',
      [phone, hash, username || '新用户', role]
    );
    
    res.json({ msg: '注册成功' });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ msg: '服务器错误' });
  }
};

// 申请入驻
export const apply = async (req: Request, res: Response) => {
  try {
    const { hotelName, hotelType, address, contactName, contactPhone, password, apply_reason } = req.body;
    
    if (!contactPhone || !password) {
      return res.status(400).json({ msg: '联系电话和密码为必填项' });
    }
    
    const [exist]: any = await pool.query(
      'SELECT user_id FROM users WHERE phone = ?',
      [contactPhone]
    );
    
    if (exist.length) {
      return res.status(400).json({ msg: '手机号已被注册，请直接登录或使用忘记密码' });
    }
    
    const hash = bcrypt.hashSync(password, 10);
    
    const [insUser]: any = await pool.query(
      'INSERT INTO users (phone, password, username, role) VALUES (?, ?, ?, ?)',
      [contactPhone, hash, contactName || contactPhone, 'merchant']
    );
    
    const merchant_id = insUser.insertId;
    const change_data = JSON.stringify({ hotelName, hotelType, address, contactName, contactPhone });
    
    await pool.query(
      'INSERT INTO audits_apply (target_type, target_id, hotel_id, merchant_id, change_data, apply_reason) VALUES (?, ?, ?, ?, ?, ?)',
      ['hotel_apply', 0, null, merchant_id, change_data, apply_reason || null]
    );
    
    res.json({ msg: '申请提交成功，账号已创建，请等待审核' });
  } catch (error) {
    console.error('申请失败:', error);
    res.status(500).json({ msg: '服务器错误' });
  }
};
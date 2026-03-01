import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../../config/db';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/avatars';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = (req as any).user?.userId || (req as any).user?.user_id;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${userId}_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB限制
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持图片文件（jpeg, jpg, png, gif）'));
    }
  }
});

// 头像上传中间件
export const uploadAvatar = upload.single('avatar');

// 处理头像上传
export const handleAvatarUpload = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.json({ code: 400, msg: '请选择要上传的头像' });
    }

    // 获取用户ID（兼容两种字段名）
    const userId = (req as any).user?.userId || (req as any).user?.user_id;
    if (!userId) {
      return res.json({ code: 401, msg: '未登录或token无效' });
    }

    // 生成可访问的URL
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    // 更新数据库中的头像地址
    await pool.execute(
      'UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE user_id = ?',
      [avatarUrl, userId]
    );

    res.json({
      code: 200,
      msg: '头像上传成功',
      data: { url: avatarUrl }
    });
  } catch (error: any) {
    console.error('头像上传错误:', error);
    res.json({ code: 500, msg: '头像上传失败: ' + error.message });
  }
};

// 获取个人信息
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.user_id;
    
    if (!userId) {
      return res.json({ code: 401, msg: '未登录或token无效' });
    }

    const [rows]: any = await pool.execute(
      `SELECT 
        user_id, 
        phone, 
        username, 
        avatar_url, 
        role, 
        status, 
        created_at, 
        updated_at 
       FROM users WHERE user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.json({ code: 404, msg: '用户不存在' });
    }

    const user = rows[0];
    res.json({
      code: 200,
      data: {
        userId: user.user_id,
        phone: user.phone,
        username: user.username,
        avatar_url: user.avatar_url,
        role: user.role,
        status: user.status,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });
  } catch (error: any) {
    console.error('获取个人信息错误:', error);
    res.json({ code: 500, msg: error.message });
  }
};

// 更新个人信息
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.user_id;
    const { username, phone, avatar_url } = req.body;

    if (!userId) {
      return res.json({ code: 401, msg: '未登录或token无效' });
    }

    // 验证数据
    if (!username || username.trim() === '') {
      return res.json({ code: 400, msg: '用户名不能为空' });
    }

    if (username.length < 2 || username.length > 20) {
      return res.json({ code: 400, msg: '用户名长度应在2-20个字符之间' });
    }

    // 检查手机号是否已被其他用户使用
    const [existingPhone]: any = await pool.execute(
      'SELECT user_id FROM users WHERE phone = ? AND user_id != ?',
      [phone, userId]
    );

    if (existingPhone.length > 0) {
      return res.json({ code: 400, msg: '该手机号已被其他用户使用' });
    }

    // 更新用户信息
    await pool.execute(
      'UPDATE users SET username = ?, phone = ?, avatar_url = ?, updated_at = NOW() WHERE user_id = ?',
      [username, phone, avatar_url || null, userId]
    );

    // 获取更新后的用户信息
    const [updatedRows]: any = await pool.execute(
      'SELECT user_id, phone, username, avatar_url, role, status, created_at, updated_at FROM users WHERE user_id = ?',
      [userId]
    );

    const user = updatedRows[0];
    res.json({
      code: 200,
      msg: '个人信息更新成功',
      data: {
        userId: user.user_id,
        phone: user.phone,
        username: user.username,
        avatar_url: user.avatar_url,
        role: user.role,
        status: user.status,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });
  } catch (error: any) {
    console.error('更新个人信息错误:', error);
    res.json({ code: 500, msg: '更新失败: ' + error.message });
  }
};

// 修改密码
export const updatePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.user_id;
    const { oldPassword, newPassword } = req.body;

    if (!userId) {
      return res.json({ code: 401, msg: '未登录或token无效' });
    }

    // 验证新密码长度
    if (newPassword.length < 6) {
      return res.json({ code: 400, msg: '新密码长度至少6位' });
    }

    // 获取当前用户信息
    const [rows]: any = await pool.execute(
      'SELECT password FROM users WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.json({ code: 404, msg: '用户不存在' });
    }

    const user = rows[0];

    // 验证旧密码
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.json({ code: 400, msg: '当前密码不正确' });
    }

    // 检查新密码是否与旧密码相同
    const samePassword = await bcrypt.compare(newPassword, user.password);
    if (samePassword) {
      return res.json({ code: 400, msg: '新密码不能与旧密码相同' });
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await pool.execute(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE user_id = ?',
      [hashedPassword, userId]
    );

    res.json({ code: 200, msg: '密码修改成功' });
  } catch (error: any) {
    console.error('修改密码错误:', error);
    res.json({ code: 500, msg: '修改失败: ' + error.message });
  }
};
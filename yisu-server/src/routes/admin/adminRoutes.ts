import express from 'express';
import bcrypt from 'bcrypt';
import { authenticate, authorize } from '../../middleware/auth';
import pool from '../../config/db';
import { query, queryOne, execute } from '../../utils/dbHelpers';
import { User } from '../../types/db';

const router = express.Router();

// 所有管理员路由都需要认证
router.use(authenticate);
router.use(authorize(['admin', 'super_admin']));

/**
 * 获取管理员列表（超级管理员可用）
 */
router.get('/users', authorize(['super_admin']), async (req, res) => {
  try {
    const [rows]: any = await pool.execute(
      `SELECT 
        user_id, 
        username, 
        phone, 
        role, 
        status, 
        created_at, 
        updated_at as last_login
       FROM users 
       WHERE role IN (?, ?)
       ORDER BY created_at DESC`,
      ['admin', 'super_admin']
    );

    res.json({
      code: 200,
      msg: '获取成功',
      data: rows,
    });
  } catch (error) {
    console.error('获取管理员列表失败:', error);
    res.status(500).json({
      code: 500,
      msg: '获取管理员列表失败',
    });
  }
});

/**
 * 创建管理员（超级管理员可用）
 */
router.post('/users', authorize(['super_admin']), async (req, res) => {
  try {
    const { username, phone, password, role = 'admin' } = req.body;

    // 检查手机号是否已存在
    const existingUser = await queryOne<User>(
      'SELECT user_id FROM users WHERE phone = ?',
      [phone]
    );
    
    if (existingUser) {
      return res.status(400).json({
        code: 400,
        msg: '手机号已存在',
      });
    }

    // 创建管理员
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await execute(
      `INSERT INTO users (username, phone, password, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
      [username, phone, hashedPassword, role]
    );

    res.status(201).json({
      code: 200,
      msg: '创建成功',
      data: {
        user_id: result.insertId,
        username,
        phone,
        role,
      },
    });
  } catch (error) {
    console.error('创建管理员失败:', error);
    res.status(500).json({
      code: 500,
      msg: '创建管理员失败',
    });
  }
});

/**
 * 更新管理员状态（超级管理员可用）
 */
router.put('/users/:id/status', authorize(['super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 验证状态值
    if (status !== 'active' && status !== 'suspended') {
      return res.status(400).json({
        code: 400,
        msg: '状态值无效，必须是 active 或 suspended'
      });
    }

    const user = await queryOne<User>('SELECT * FROM users WHERE user_id = ?', [id]);
    
    if (!user) {
      return res.status(404).json({
        code: 404,
        msg: '用户不存在'
      });
    }

    if (user.role === 'super_admin') {
      return res.status(400).json({
        code: 400,
        msg: '不能修改超级管理员状态'
      });
    }

    await execute(
      'UPDATE users SET status = ?, updated_at = NOW() WHERE user_id = ?',
      [status, id]
    );

    res.json({
      code: 200,
      msg: '状态更新成功',
      data: { user_id: id, status }
    });
  } catch (error) {
    console.error('更新管理员状态失败:', error);
    res.status(500).json({
      code: 500,
      msg: '更新管理员状态失败'
    });
  }
});

/**
 * 删除管理员（超级管理员可用）
 */
router.delete('/users/:id', authorize(['super_admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await queryOne<User>('SELECT * FROM users WHERE user_id = ?', [id]);
    
    if (!user) {
      return res.status(404).json({
        code: 404,
        msg: '用户不存在',
      });
    }

    if (user.role === 'super_admin') {
      return res.status(400).json({
        code: 400,
        msg: '不能删除超级管理员',
      });
    }

    await execute('DELETE FROM users WHERE user_id = ?', [id]);

    res.json({
      code: 200,
      msg: '删除成功',
    });
  } catch (error) {
    console.error('删除管理员失败:', error);
    res.status(500).json({
      code: 500,
      msg: '删除管理员失败',
    });
  }
});

export default router;
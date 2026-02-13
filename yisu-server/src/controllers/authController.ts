import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'yisu_secret_key';
const JWT_EXPIRES_IN = '24h';

export const register = async (req: Request, res: Response) => {
  const { phone, password, username, role = 'user', inviteCode } = req.body;
  
  // 在外层声明applyId
  let applyId = null;
  
  try {
    // 验证角色是否合法 - 禁止注册超级管理员
    const allowedRoles = ['user', 'merchant', 'admin'];
    if (!allowedRoles.includes(role)) {
      return res.json({ 
        code: 400, 
        msg: '无效的角色类型，超级管理员由系统初始化创建' 
      });
    }

    // 1. 检查手机号是否已注册
    const [existing]: any = await pool.execute(
      'SELECT * FROM users WHERE phone = ?', 
      [phone]
    );
    
    if (existing.length > 0) {
      return res.json({ 
        code: 400, 
        msg: '该手机号已被注册' 
      });
    }

    // 2. 如果是管理员注册，验证邀请码
    if (role === 'admin') {
      if (!inviteCode || inviteCode.trim() === '') {
        return res.json({ 
          code: 400, 
          msg: '管理员注册需要邀请码' 
        });
      }

      const [invitationRows]: any = await pool.execute(
        `SELECT * FROM admin_invitations 
        WHERE invite_code = ? 
        AND is_used = 0 
        AND expire_at > NOW()`,
        [inviteCode]
      );

      if (invitationRows.length === 0) {
        console.log('邀请码无效或已过期');
        return res.json({ 
          code: 400, 
          msg: '邀请码无效或已过期' 
        });
      }
      
      console.log('邀请码验证通过，ID:', invitationRows[0].invitation_id);
    }

    // 3. users表的status固定为'active'
    const userStatus = 'active';
    
    // 4. 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 5. 插入用户数据
    const [result]: any = await pool.execute(
      'INSERT INTO users (phone, password, username, role, status) VALUES (?, ?, ?, ?, ?)',
      [phone, hashedPassword, username, role, userStatus]
    );

    const userId = result.insertId;

    // // 6. 如果是管理员注册，标记邀请码已使用
    if (role === 'admin' && inviteCode) {
      await pool.execute(
        `UPDATE admin_invitations 
         SET is_used = 1, used_by_id = ? 
         WHERE invite_code = ?`,
        [userId, inviteCode]
      );
    }

  // 7. 如果是商户注册，只创建商户资料，不创建审核申请
  if (role === 'merchant') {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      
      // 只创建商户资料（状态为pending），不创建audits_apply
      await connection.execute(
        `INSERT INTO merchant_profiles (
          user_id, 
          status, 
          created_at, 
          updated_at
        ) VALUES (?, 'pending', NOW(), NOW())`,
        [userId]
      );
      
      await connection.commit();
      console.log('商户资料创建成功，等待资质上传:', userId);
      
      // pplyId 设为 null，等待资质上传时再创建
      applyId = null;
      
    } catch (merchantError) {
      if (connection) await connection.rollback();
      console.error('创建商户资料失败:', merchantError);
      // 不抛出错误，用户已创建成功
    } finally {
      if (connection) connection.release();
    }
  }

    // 8. 生成JWT Token（为商户提供token用于资质上传）
    //添加类型注解，明确token可以是string或null
    let token: string | null = null;
    
    if (role === 'merchant') {
      token = jwt.sign(
        { 
          userId: userId, 
          role: 'merchant',
          username: username,
          phone: phone
        },
        JWT_SECRET,  // 使用常量
        { expiresIn: JWT_EXPIRES_IN }  // 使用常量
      );
    }

    // 9. 返回成功响应
    const roleMessages = {
      'user': '用户',
      'merchant': '商户',
      'admin': '管理员'
    };

    const successMsg = role === 'user' 
      ? '注册成功，请登录！'
      : `${roleMessages[role]}注册成功${role === 'merchant' ? '，请等待审核' : '，请登录'}！`;

    console.log('注册成功，返回响应:', { 
      role, 
      status: userStatus, 
      userId, 
      applyId,
      hasToken: !!token 
    });

    // 根据不同角色返回不同的数据
    const responseData: any = { 
      role, 
      status: userStatus,
      user_id: userId
    };

    // 商户返回额外的数据
    if (role === 'merchant') {
      responseData.apply_id = null;
      responseData.token = token;  // 返回token供资质上传使用
      responseData.need_qualification = true;  // 标识需要上传资质
    }

    res.json({ 
      code: 200, 
      msg: successMsg,
      data: responseData
    });
    
  } catch (error: any) {
    console.error('注册失败:', error);
    res.json({ 
      code: 500, 
      msg: '服务器错误，注册失败' 
    });
  }
};

// 登录接口
export const login = async (req: Request, res: Response) => {
  const { phone, password } = req.body;

  try {
    // 1. 根据手机号查询用户
    const [rows]: any = await pool.execute(
      'SELECT * FROM users WHERE phone = ?',
      [phone]
    );

    if (rows.length === 0) {
      return res.json({ code: 400, msg: '账号未注册' });
    }

    const user = rows[0];

    // 2. 检查账户状态
    if (user.status === 'suspended') {
      return res.json({ 
        code: 403, 
        msg: '账号已被封禁，请联系管理员' 
      });
    }

    // 3. 验证密码
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({ code: 400, msg: '密码错误' });
    }

    // 4. 生成 JWT Token
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        role: user.role,
        username: user.username,
        phone: user.phone
      },
      JWT_SECRET,  // 使用常量
      { expiresIn: JWT_EXPIRES_IN }  // 使用常量
    );

    // 5. 返回用户信息
    res.json({
      code: 200,
      msg: '登录成功',
      data: {
        token,
        username: user.username,
        role: user.role,
        phone: user.phone,
        userId: user.user_id
      }
    });

  } catch (error: any) {
    console.error('登录错误:', error);
    res.json({ code: 500, msg: '服务器内部错误' });
  }
};
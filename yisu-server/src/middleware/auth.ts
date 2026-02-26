import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: number;
  phone: string;
  role: string;
}

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        user_id: number;  // 添加 user_id 字段以兼容旧代码
        phone: string;
        role: string;
      };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ code: 401, msg: '未提供认证令牌' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'yisu_secret_key', (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ code: 403, msg: '令牌无效或已过期' });
    }

    const userId = decoded.userId || decoded.user_id;
    
    // 同时提供 userId 和 user_id 以兼容旧代码
    req.user = {
      userId: userId,
      user_id: userId,  // 添加 user_id 字段
      phone: decoded.phone,
      role: decoded.role
    };
    next();
  });
};

export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        code: 401,
        msg: '未认证',
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        code: 403,
        msg: '权限不足',
      });
    }

    next();
  };
};
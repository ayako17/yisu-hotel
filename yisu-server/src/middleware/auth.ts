import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: number;
  phone: string;
  role: string;
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

    req.user = {
      user_id: decoded.userId,
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
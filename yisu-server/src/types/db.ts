// 用户表类型
export interface User {
  userId: number;
  username: string;
  phone: string;
  password: string;
  role: 'user' | 'merchant' | 'admin' | 'super_admin';
  status: 'active' | 'suspended';  // 改为枚举值
  avatar_url: string | null;       // 注意字段名
  created_at: Date;
  updated_at: Date;
}

// 邀请码表类型
export interface Invitation {
  invitation_id: number;
  invite_code: string;
  creator_id: number;
  is_used: 0 | 1;
  used_by_id: number | null;
  used_at: Date | null;
  expire_at: Date;
  note: string | null;
  created_at: Date;
  updated_at: Date;
}

// 扩展请求类型
declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id: number;
        phone: string;
        role: string;
      };
    }
  }
}
// 用户角色类型
export type UserRole = 'user' | 'merchant' | 'admin'
export type UserStatus = 'active' | 'suspended'

export interface User {
  user_id: number
  phone: string
  username: string
  avatar_url?: string
  role: UserRole
  status: UserStatus
  created_at?: string
  updated_at?: string
}

export interface LoginParams {
  phone: string
  password: string
}

export interface RegisterParams {
  phone: string
  password: string
  username?: string  // 可选，不传就用手机号
}

export interface LoginResponse {
  success: boolean
  message: string
  data: {
    token: string
    user: User
  }
}

export interface ChangePasswordParams {
  oldPassword: string
  newPassword: string
}
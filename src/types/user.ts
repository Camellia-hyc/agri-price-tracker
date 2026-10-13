// 用户契约(前后端共用;server 侧 import type 直接引用)。
// 仅在本地后端模式(VITE_API_BASE 设置时)使用;线上静态版不涉及任何用户数据。
export type Role = "user" | "admin"

// 对外返回的用户信息:绝不含 passwordHash
export interface PublicUser {
  id: number
  username: string
  role: Role
  createdAt: string // ISO 8601
}

export interface AuthResponse {
  token: string
  user: PublicUser
}

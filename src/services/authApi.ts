// 用户系统前端接口:注册/登录/当前用户 + 管理员(用户管理、价格数据管理)。
// 仅本地后端模式可用 —— IS_API_MODE 为 false(线上静态版)时,页面不渲染入口也不调用任何函数;
// 数据源开关与 src/services/api.ts 同源(同读 VITE_API_BASE),但独立成文件,不动 api.ts 验证过的逻辑。
import type { AuthResponse, PublicUser, Role } from "@/types/user"

const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/+$/, "")

export const IS_API_MODE = Boolean(API_BASE)

const TOKEN_KEY = "agri.token"

// localStorage 在隐私模式等场景可能不可用:读写都兜底,token 存不住时视为未登录(刷新后需重新登录)
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* 存不住就算了:下次刷新重新登录 */
  }
}

async function request<T>(path: string, init: RequestInit = {}, withToken = false): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set("Content-Type", "application/json")
  if (withToken) {
    const token = getToken()
    if (token) headers.set("Authorization", `Bearer ${token}`)
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    // 后端错误体统一为 { error: string };解析失败退回状态码文案
    let message = `请求失败(${res.status})`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      /* 无 JSON 错误体 */
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export async function register(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  })
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  })
}

// 用已存令牌恢复会话;失败(过期/被删)抛出,由 AuthContext 清 token
export async function me(): Promise<PublicUser> {
  const body = await request<{ user: PublicUser }>("/api/auth/me", {}, true)
  return body.user
}

// ---- 管理员接口(全部需要 admin 角色,后端强制鉴权) ----

export async function listUsers(): Promise<PublicUser[]> {
  return request<PublicUser[]>("/api/admin/users", {}, true)
}

export async function updateUserRole(id: number, role: Role): Promise<void> {
  await request(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ role }) }, true)
}

export async function deleteUser(id: number): Promise<void> {
  await request(`/api/admin/users/${id}`, { method: "DELETE" }, true)
}

export async function upsertPrice(row: {
  productId: string
  marketId: string
  date: string
  price: number
}): Promise<void> {
  await request("/api/admin/prices", { method: "PUT", body: JSON.stringify(row) }, true)
}

// deletePrice 成功返回 200,记录不存在时后端返回 404(抛出"未找到该价格记录"之类)
export async function deletePrice(row: {
  productId: string
  marketId: string
  date: string
}): Promise<void> {
  const sp = new URLSearchParams(row)
  await request(`/api/admin/prices?${sp}`, { method: "DELETE" }, true)
}

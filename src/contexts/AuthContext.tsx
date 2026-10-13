// 登录会话上下文:启动时用 localStorage 里的令牌调 /api/auth/me 恢复登录状态。
// 静态模式(线上)直接跳过,不发任何请求;所有登录入口在 Header 等组件里也先判 IS_API_MODE。
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import type { PublicUser } from "@/types/user"
import * as authApi from "@/services/authApi"
import { IS_API_MODE } from "@/services/authApi"

interface AuthContextValue {
  user: PublicUser | null
  loading: boolean // 仅恢复会话期间为 true;静态模式恒为 false
  login(username: string, password: string): Promise<void>
  register(username: string, password: string): Promise<void>
  logout(): void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  // 有令牌才需要等待恢复;静态模式/未登录都不等,页面立即渲染
  const [loading, setLoading] = useState(() => IS_API_MODE && Boolean(authApi.getToken()))

  useEffect(() => {
    if (!IS_API_MODE || !authApi.getToken()) return
    let ignore = false // StrictMode 下 effect 跑两次,只认最后一次的结果
    authApi
      .me()
      .then((u) => {
        if (!ignore) setUser(u)
      })
      .catch(() => {
        if (!ignore) authApi.setToken(null) // 令牌过期或用户已被删除
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login(username, password)
    authApi.setToken(res.token)
    setUser(res.user)
  }, [])

  const register = useCallback(async (username: string, password: string) => {
    const res = await authApi.register(username, password)
    authApi.setToken(res.token)
    setUser(res.user)
  }, [])

  const logout = useCallback(() => {
    authApi.setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth 必须在 <AuthProvider> 内使用")
  return ctx
}

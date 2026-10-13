// 登录页:仅本地后端模式渲染表单;静态模式显示提示卡。
// 支持回跳:被引导来登录时路由 state 里带 from.pathname(如从 /admin 跳来)。
import { useState } from "react"
import type { FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import StaticModeNotice from "@/components/auth/StaticModeNotice"
import { useAuth } from "@/contexts/AuthContext"
import { IS_API_MODE } from "@/services/authApi"

// 表单控件规范:与首页搜索框 / 日期选择一致的观感
const inputCls =
  "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-sm transition-colors focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!IS_API_MODE) return <StaticModeNotice feature="登录" />

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/"

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader>
          <CardTitle>登录</CardTitle>
          <CardDescription>登录后可管理价格数据(管理员)与调整用户角色</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">用户名</span>
              <input
                className={inputCls}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">密码</span>
              <input
                className={inputCls}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "登录中…" : "登录"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            还没有账号?
            <Link to="/register" className="text-primary hover:underline">
              注册
            </Link>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">演示管理员账号:admin / admin123</p>
        </CardContent>
      </Card>
    </div>
  )
}

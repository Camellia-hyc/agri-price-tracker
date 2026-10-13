// 注册页:仅本地后端模式渲染表单;静态模式显示提示卡。
// 注册成功即自动登录(后端 201 已返回令牌),回首页。
import { useState } from "react"
import type { FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import StaticModeNotice from "@/components/auth/StaticModeNotice"
import { useAuth } from "@/contexts/AuthContext"
import { IS_API_MODE } from "@/services/authApi"

const inputCls =
  "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-sm transition-colors focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!IS_API_MODE) return <StaticModeNotice feature="注册" />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError("两次输入的密码不一致")
      return
    }
    setSubmitting(true)
    try {
      await register(username.trim(), password)
      navigate("/", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader>
          <CardTitle>注册</CardTitle>
          <CardDescription>新账号默认是普通用户,可由管理员在后台提升权限</CardDescription>
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
                placeholder="2~20 个字符,可含中文"
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
                autoComplete="new-password"
                placeholder="至少 6 位"
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">确认密码</span>
              <input
                className={inputCls}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "注册中…" : "注册"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            已有账号?
            <Link to="/login" className="text-primary hover:underline">
              登录
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

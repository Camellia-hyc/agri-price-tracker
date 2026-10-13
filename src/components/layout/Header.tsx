import { useState } from "react"
import { NavLink, Link } from "react-router-dom"
import { Wheat, Menu, X, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { IS_API_MODE } from "@/services/authApi"

const navItems = [
  { to: "/", label: "首页" },
  { to: "/compare", label: "价格对比" },
  { to: "/trend", label: "趋势分析" },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <NavLink to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Wheat className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">农价通</span>
        </NavLink>

        {/* 桌面导航 */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* 用户区:仅本地后端模式渲染,线上静态版完全不显示、不发请求 */}
          {IS_API_MODE && (
            <div className="hidden items-center gap-1 md:flex">
              {user ? (
                <>
                  <span className="px-1 text-sm text-muted-foreground">{user.username}</span>
                  {user.role === "admin" && (
                    <NavLink
                      to="/admin"
                      className={({ isActive }) =>
                        cn(
                          "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary/10 font-semibold text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )
                      }
                    >
                      管理后台
                    </NavLink>
                  )}
                  <Button variant="ghost" size="sm" className="rounded-full" onClick={logout}>
                    <LogOut />
                    退出
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="rounded-full" asChild>
                    <Link to="/login">登录</Link>
                  </Button>
                  <Button size="sm" className="rounded-full" asChild>
                    <Link to="/register">注册</Link>
                  </Button>
                </>
              )}
            </div>
          )}

          {/* 移动端菜单按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="切换菜单"
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {/* 移动端下拉菜单 */}
      {open && (
        <nav className="border-t border-border/70 bg-card md:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "block px-4 py-3 text-sm font-medium",
                  isActive
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}

          {/* 移动端用户区:与桌面同样的静态模式开关 */}
          {IS_API_MODE &&
            (user ? (
              <>
                {user.role === "admin" && (
                  <NavLink
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "block px-4 py-3 text-sm font-medium",
                        isActive
                          ? "bg-primary/10 font-semibold text-primary"
                          : "text-muted-foreground hover:bg-muted",
                      )
                    }
                  >
                    管理后台
                  </NavLink>
                )}
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    setOpen(false)
                  }}
                  className="block w-full px-4 py-3 text-left text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  退出登录({user.username})
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  登录
                </NavLink>
                <NavLink
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  注册
                </NavLink>
              </>
            ))}
        </nav>
      )}
    </header>
  )
}

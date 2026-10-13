// 管理后台(仅本地后端模式):用户管理(改角色/删除)+ 价格数据管理(改价/新增/删除)。
// 权限以后端为唯一事实来源(所有接口都过 requireAdmin);页面里只是引导与防误操作。
// 价格改动成功后调用 clearPricesCache(),保证对比/趋势页下次进入拉最新数据。
import { useCallback, useEffect, useState } from "react"
import type { FormEvent } from "react"
import { Link, useLocation } from "react-router-dom"
import { ShieldAlert, UserCog } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import StaticModeNotice from "@/components/auth/StaticModeNotice"
import { useAuth } from "@/contexts/AuthContext"
import {
  IS_API_MODE,
  deletePrice,
  deleteUser,
  listUsers,
  updateUserRole,
  upsertPrice,
} from "@/services/authApi"
import { clearPricesCache, getMarkets, getProducts } from "@/services/api"
import { cn } from "@/lib/utils"
import type { PublicUser, Role } from "@/types/user"
import type { Market } from "@/types/market"
import type { Product } from "@/types/product"

const inputCls =
  "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-sm transition-colors focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : "操作失败"
}

export default function Admin() {
  if (!IS_API_MODE) return <StaticModeNotice feature="管理后台" />
  return <AdminGate />
}

function AdminGate() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="px-4 py-24 text-center text-muted-foreground">正在恢复登录状态…</div>
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <h1 className="text-xl font-semibold">请先登录</h1>
        <p className="mt-2 text-muted-foreground">管理后台需要管理员账号登录后访问</p>
        <Button asChild className="mt-6">
          <Link to="/login" state={{ from: location }}>
            去登录
          </Link>
        </Button>
      </div>
    )
  }
  if (user.role !== "admin") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-semibold">需要管理员权限</h1>
        <p className="mt-2 text-muted-foreground">
          当前账号「{user.username}」是普通用户;如需管理权限,请联系管理员在用户管理里调整角色
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/">返回首页</Link>
        </Button>
      </div>
    )
  }
  return <AdminPanel me={user} />
}

function AdminPanel({ me }: { me: PublicUser }) {
  const [tab, setTab] = useState<"users" | "prices">("users")

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">管理后台</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          当前账号:{me.username}(管理员)· 改动即时写入本地数据库
        </p>
      </div>

      <div className="flex gap-1 rounded-full border border-border/70 bg-muted/40 p-1 text-sm font-medium w-fit">
        {(
          [
            ["users", "用户管理"],
            ["prices", "价格数据管理"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-full px-4 py-1.5 transition-colors",
              tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "users" ? <UserManager me={me} /> : <PriceManager />}
    </div>
  )
}

// ---- 用户管理 ----

function UserManager({ me }: { me: PublicUser }) {
  const [users, setUsers] = useState<PublicUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const reload = useCallback(async () => {
    try {
      setUsers(await listUsers())
      setError(null)
    } catch (err) {
      setError(errorText(err))
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function changeRole(u: PublicUser, role: Role) {
    setBusyId(u.id)
    setNotice(null)
    try {
      await updateUserRole(u.id, role)
      setNotice(`已将「${u.username}」设为${role === "admin" ? "管理员" : "普通用户"}`)
      await reload()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusyId(null)
    }
  }

  async function remove(u: PublicUser) {
    if (!window.confirm(`确认删除用户「${u.username}」?该操作不可撤销,其登录凭证立即失效。`)) return
    setBusyId(u.id)
    setNotice(null)
    try {
      await deleteUser(u.id)
      setNotice(`已删除用户「${u.username}」`)
      await reload()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusyId(null)
    }
  }

  if (error && users === null) {
    return <p className="text-sm text-destructive">加载用户列表失败:{error}</p>
  }
  if (users === null) {
    return <p className="text-sm text-muted-foreground">加载用户列表…</p>
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">用户列表</CardTitle>
          <CardDescription>共 {users.length} 个账号;管理员不能修改/删除自己的账号</CardDescription>
        </div>
        <UserCog className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {notice && <p className="text-sm text-primary">{notice}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户名</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>注册时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const isSelf = u.id === me.id
              const busy = busyId === u.id
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.username}
                    {isSelf && <span className="ml-2 text-xs text-muted-foreground">(当前账号)</span>}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        u.role === "admin"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {u.role === "admin" ? "管理员" : "普通用户"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.createdAt.slice(0, 10)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isSelf || busy}
                      onClick={() => changeRole(u, u.role === "admin" ? "user" : "admin")}
                    >
                      {u.role === "admin" ? "设为普通用户" : "设为管理员"}
                    </Button>
                    <Button variant="ghost" size="sm" disabled={isSelf || busy} onClick={() => remove(u)}>
                      <span className="text-destructive">删除</span>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ---- 价格数据管理 ----

function PriceManager() {
  const [products, setProducts] = useState<Product[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [productId, setProductId] = useState("")
  const [marketId, setMarketId] = useState("")
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [price, setPrice] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // 覆盖用户端同款数据层(后端模式走 API);失败时表单仍可用,只是下拉为空
    void getProducts()
      .then(setProducts)
      .catch((err) => setError(`加载品种列表失败:${errorText(err)}`))
    void getMarkets()
      .then(setMarkets)
      .catch((err) => setError(`加载市场列表失败:${errorText(err)}`))
  }, [])

  const productName = products.find((p) => p.id === productId)?.name ?? productId
  const marketName = markets.find((m) => m.id === marketId)?.name ?? marketId

  function validate(): number | null {
    if (!productId || !marketId || !date) {
      setError("请先选择品种、市场与日期")
      return null
    }
    const value = Number(price)
    if (!Number.isFinite(value) || value <= 0) {
      setError("价格需为正数")
      return null
    }
    return value
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    const value = validate()
    if (value === null) return
    setBusy(true)
    try {
      await upsertPrice({ productId, marketId, date, price: value })
      clearPricesCache()
      setNotice(`已保存:${productName} · ${marketName} · ${date} → ${value}`)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    setError(null)
    setNotice(null)
    if (!productId || !marketId || !date) {
      setError("请先选择品种、市场与日期")
      return
    }
    if (!window.confirm(`确认删除 ${productName} · ${marketName} · ${date} 的价格记录?`)) return
    setBusy(true)
    try {
      await deletePrice({ productId, marketId, date })
      clearPricesCache()
      setNotice(`已删除:${productName} · ${marketName} · ${date}`)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">改价 / 新增 / 删除</CardTitle>
        <CardDescription>
          人工录入的价格会标记为真实数据(real=1),在对比页与趋势图中优先展示;
          改动后相关页面会自动拉取新数据
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid max-w-2xl gap-4 sm:grid-cols-2" onSubmit={onSave}>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">品种</span>
            <select className={inputCls} value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">选择品种</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">市场</span>
            <select className={inputCls} value={marketId} onChange={(e) => setMarketId(e.target.value)}>
              <option value="">选择市场</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">日期</span>
            <input
              className={inputCls}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">价格(元/公斤)</span>
            <input
              className={inputCls}
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="如 5.20"
            />
          </label>

          {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
          {notice && <p className="text-sm text-primary sm:col-span-2">{notice}</p>}

          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? "处理中…" : "保存价格"}
            </Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={onDelete}>
              删除该记录
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

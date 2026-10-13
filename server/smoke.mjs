// 后端冒烟验收:需先运行 npm run server:dev(另开终端),然后 npm run server:smoke
// 断言:三端点内容与 public/mock 一致(含 prices 全量逐字节)、过滤参数与前端内存过滤语义等价、错误处理、
//      认证与权限(注册/登录/角色)、管理员价格数据管理。
// 管理员密码读 ADMIN_PASSWORD 环境变量,默认 admin123(与 seed.ts 一致)。
// 价格改动一律落在哨兵行(date=1999-01-01):开头 best-effort 清理残留,结尾删除并做全量逐字节回归,
// 全程不触碰任何现存价格行。
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const BASE = process.env.SMOKE_BASE ?? "http://localhost:8787"
const MOCK = fileURLToPath(new URL("../public/mock/", import.meta.url))

let failed = 0
function check(name, cond, detail = "") {
  if (!cond) failed++
  console.log(` ${cond ? "✅" : "❌"} ${name}${detail ? `  (${detail})` : ""}`)
}

async function getText(path) {
  const res = await fetch(`${BASE}${path}`)
  return { status: res.status, text: await res.text() }
}
async function getJson(path) {
  return JSON.parse((await getText(path)).text)
}
// 带方法与令牌的请求(POST/PUT/PATCH/DELETE);响应体尽力解析 JSON,null 表示无体/非 JSON
async function req(method, path, { token, body } = {}) {
  const headers = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let parsed = null
  try {
    parsed = JSON.parse(await res.text())
  } catch {
    /* 无响应体 */
  }
  return { status: res.status, body: parsed }
}

// 与前端 src/services/api.ts 的 filterPrices 语义一致(用于算 API 过滤结果的期望值)
function filterLike(records, q) {
  return records.filter((r) => {
    if (q.productIds?.length && !q.productIds.includes(r.productId)) return false
    if (q.marketIds?.length && !q.marketIds.includes(r.marketId)) return false
    if (q.startDate && r.date < q.startDate) return false
    if (q.endDate && r.date > q.endDate) return false
    return true
  })
}

console.log(`[smoke] 后端地址 ${BASE}`)
console.log(`[smoke] 数据源   ${MOCK}`)

// 连通性:失败时给明确指引,而不是让 fetch 堆栈糊脸
try {
  const res = await fetch(`${BASE}/api/health`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
} catch (err) {
  console.error(`❌ 无法连接后端(${err.message})——请先在另一个终端运行:npm run server:dev`)
  process.exit(1)
}

const health = await getJson("/api/health")
const products = JSON.parse(readFileSync(`${MOCK}products.json`, "utf8"))
const markets = JSON.parse(readFileSync(`${MOCK}markets.json`, "utf8"))
const prices = JSON.parse(readFileSync(`${MOCK}prices.json`, "utf8"))
const pricesText = readFileSync(`${MOCK}prices.json`, "utf8")

console.log("\n— 目录端点 —")
check("health.ok", health.ok === true)
check(
  "health.counts 与数据文件一致",
  health.counts.products === products.length &&
    health.counts.markets === markets.length &&
    health.counts.prices === prices.length,
  JSON.stringify(health.counts),
)
const apiProducts = await getJson("/api/products")
check("products 与 products.json 等价", JSON.stringify(apiProducts) === JSON.stringify(products), `${apiProducts.length} 条`)
const apiMarkets = await getJson("/api/markets")
check("markets 与 markets.json 等价", JSON.stringify(apiMarkets) === JSON.stringify(markets), `${apiMarkets.length} 条`)

console.log("\n— prices 全量 —")
const { text: apiPricesText } = await getText("/api/prices")
check("与 prices.json 逐字节一致", apiPricesText === pricesText, `api ${apiPricesText.length}B / file ${pricesText.length}B`)
const realCount = prices.filter((r) => r.real === 1).length
check("real 计数与文件一致", health.counts.real === realCount, `${realCount} 条`)

console.log("\n— 过滤参数(与前端内存过滤逐字节等价)—")
const first = prices[0]
const midDate = prices[Math.floor(prices.length / 2)].date
const lastDate = prices[prices.length - 1].date
const cases = [
  { name: "单产品", q: { productIds: [first.productId] } },
  { name: "单市场", q: { marketIds: [first.marketId] } },
  { name: "产品+市场", q: { productIds: [first.productId], marketIds: [first.marketId] } },
  { name: "单日", q: { startDate: lastDate, endDate: lastDate } },
  {
    name: "四条件组合",
    q: { productIds: [first.productId], marketIds: [first.marketId], startDate: first.date, endDate: midDate },
  },
]
for (const { name, q } of cases) {
  const sp = new URLSearchParams()
  if (q.productIds?.length) sp.set("productIds", q.productIds.join(","))
  if (q.marketIds?.length) sp.set("marketIds", q.marketIds.join(","))
  if (q.startDate) sp.set("startDate", q.startDate)
  if (q.endDate) sp.set("endDate", q.endDate)
  const { text } = await getText(`/api/prices?${sp}`)
  check(name, text === JSON.stringify(filterLike(prices, q)), `${JSON.parse(text).length} 条`)
}

console.log("\n— 错误处理 —")
check("非法日期 2026-02-31 → 400", (await getText("/api/prices?startDate=2026-02-31")).status === 400)
check("非零填充 2026-2-3 → 400", (await getText("/api/prices?endDate=2026-2-3")).status === 400)
const unknown = await getText("/api/prices?productIds=__unknown__")
check("未知 id → 200 空数组", unknown.status === 200 && unknown.text === "[]")
check("空参数 = 全量", (await getText("/api/prices?productIds=")).text === pricesText)

// ---------- 认证与权限 ----------
console.log("\n— 认证与权限 —")
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123"

check("未带令牌 GET /api/auth/me → 401", (await req("GET", "/api/auth/me")).status === 401)
check(
  "错误密码登录 → 401",
  (await req("POST", "/api/auth/login", { body: { username: "admin", password: `${ADMIN_PASSWORD}-wrong` } })).status === 401,
)
const login = await req("POST", "/api/auth/login", { body: { username: "admin", password: ADMIN_PASSWORD } })
check("admin 登录 → 200 且返回令牌", login.status === 200 && Boolean(login.body?.token))
const adminTok = login.body?.token
const me = await req("GET", "/api/auth/me", { token: adminTok })
check("admin /me → 角色 admin", me.status === 200 && me.body?.user?.role === "admin")

// 上次中断可能留下 smoke_* 用户与哨兵行:best-effort 清理(失败不阻断,结尾回归兜底)
const stale = await req("GET", "/api/admin/users", { token: adminTok })
for (const u of Array.isArray(stale.body) ? stale.body : []) {
  if (/^smoke_\d+$/.test(u.username)) await req("DELETE", `/api/admin/users/${u.id}`, { token: adminTok })
}
const sentinel = { productId: products[0].id, marketId: markets[0].id, date: "1999-01-01" }
await req("DELETE", `/api/admin/prices?${new URLSearchParams(sentinel)}`, { token: adminTok })

const testUser = `smoke_${Date.now()}`
const reg = await req("POST", "/api/auth/register", { body: { username: testUser, password: "smoke-pass-123" } })
check(`注册 ${testUser} → 201 且角色为 user`, reg.status === 201 && reg.body?.user?.role === "user")
const userTok = reg.body?.token
check(
  "同名再注册 → 409",
  (await req("POST", "/api/auth/register", { body: { username: testUser, password: "smoke-pass-123" } })).status === 409,
)
check(
  "短密码注册 → 400",
  (await req("POST", "/api/auth/register", { body: { username: "smoke_short", password: "123" } })).status === 400,
)
check("普通用户访问 /api/admin/users → 403", (await req("GET", "/api/admin/users", { token: userTok })).status === 403)

const users1 = await req("GET", "/api/admin/users", { token: adminTok })
check(
  "管理员用户列表 → 200 且含 admin",
  users1.status === 200 && Array.isArray(users1.body) && users1.body.some((u) => u.username === "admin"),
)
check("列表不含 passwordHash", Array.isArray(users1.body) && users1.body.every((u) => !("passwordHash" in u)))

const uid = reg.body?.user?.id
check("改角色 user → admin 200", (await req("PATCH", `/api/admin/users/${uid}`, { token: adminTok, body: { role: "admin" } })).status === 200)
const users2 = await req("GET", "/api/admin/users", { token: adminTok })
check("角色变更即时生效", users2.body?.find((u) => u.id === uid)?.role === "admin")
check("非法角色 root → 400", (await req("PATCH", `/api/admin/users/${uid}`, { token: adminTok, body: { role: "root" } })).status === 400)
const adminId = users1.body?.find((u) => u.username === "admin")?.id
check("管理员不能改自己的角色 → 400", (await req("PATCH", `/api/admin/users/${adminId}`, { token: adminTok, body: { role: "user" } })).status === 400)
check("管理员不能删除自己 → 400", (await req("DELETE", `/api/admin/users/${adminId}`, { token: adminTok })).status === 400)
check("删除测试用户 → 200", (await req("DELETE", `/api/admin/users/${uid}`, { token: adminTok })).status === 200)
check("已删用户令牌立即失效 → 401", (await req("GET", "/api/auth/me", { token: userTok })).status === 401)

// ---------- 价格数据管理(哨兵行) ----------
console.log("\n— 价格数据管理(哨兵行,结尾删除并回归)—")
const dayQuery = `productIds=${sentinel.productId}&marketIds=${sentinel.marketId}&startDate=${sentinel.date}&endDate=${sentinel.date}`

check("无令牌改价 → 401", (await req("PUT", "/api/admin/prices", { body: { ...sentinel, price: 1.23 } })).status === 401)
check("改价(新增)→ 200", (await req("PUT", "/api/admin/prices", { token: adminTok, body: { ...sentinel, price: 1.23 } })).status === 200)
const day1 = JSON.parse((await getText(`/api/prices?${dayQuery}`)).text)
check("单日查询恰 1 条、real=1、值 1.23", day1.length === 1 && day1[0].real === 1 && day1[0].price === 1.23)
check("再改价 → 200", (await req("PUT", "/api/admin/prices", { token: adminTok, body: { ...sentinel, price: 4.56 } })).status === 200)
const day2 = JSON.parse((await getText(`/api/prices?${dayQuery}`)).text)
check("仍 1 条且值更新为 4.56", day2.length === 1 && day2[0].price === 4.56)
check("非法价格 -1 → 400", (await req("PUT", "/api/admin/prices", { token: adminTok, body: { ...sentinel, price: -1 } })).status === 400)
check("非法日期 1999-13-01 → 400", (await req("PUT", "/api/admin/prices", { token: adminTok, body: { ...sentinel, date: "1999-13-01" } })).status === 400)
check("未知 productId → 400", (await req("PUT", "/api/admin/prices", { token: adminTok, body: { ...sentinel, productId: "__unknown__" } })).status === 400)
check(
  "删除哨兵 → 200",
  (await req("DELETE", `/api/admin/prices?${new URLSearchParams(sentinel)}`, { token: adminTok })).status === 200,
)
check(
  "重复删除 → 404",
  (await req("DELETE", `/api/admin/prices?${new URLSearchParams(sentinel)}`, { token: adminTok })).status === 404,
)

// ---------- 回归:所有增删改之后,全量数据必须原样 ----------
console.log("\n— 回归(改动后与初始逐字节一致)—")
const finalHealth = await getJson("/api/health")
check("全量 /api/prices 仍与 prices.json 逐字节一致", (await getText("/api/prices")).text === pricesText)
check(
  "counts 复原(含 real)",
  finalHealth.counts.prices === prices.length && finalHealth.counts.real === realCount,
  JSON.stringify(finalHealth.counts),
)

console.log(failed === 0 ? "\n[smoke] ✅ 全部通过" : `\n[smoke] ❌ ${failed} 项失败`)
process.exit(failed === 0 ? 0 : 1)

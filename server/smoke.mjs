// 后端冒烟验收:需先运行 npm run server:dev(另开终端),然后 npm run server:smoke
// 断言:三端点内容与 public/mock 一致(含 prices 全量逐字节)、过滤参数与前端内存过滤语义等价、错误处理。
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

console.log(failed === 0 ? "\n[smoke] ✅ 全部通过" : `\n[smoke] ❌ ${failed} 项失败`)
process.exit(failed === 0 ? 0 : 1)

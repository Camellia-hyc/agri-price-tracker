// 农价通后端:只读行情 API(运行时无关,Hono + Repo 接口)。
// 本地由 index.ts 用 node:sqlite 驱动;未来迁移 Cloudflare Workers 时,
// 只需新写一个基于 D1 的 Repo 实现 + 一个 worker.ts 入口,本文件原样复用。
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import type { Context } from "hono"
import type { Product } from "../src/types/product.ts"
import type { Market } from "../src/types/market.ts"
import type { PriceQuery, PriceRecord } from "../src/types/price.ts"

export interface HealthStats {
  counts: { products: number; markets: number; prices: number; real: number }
  dateRange: { min: string | null; max: string | null }
}

// 数据访问接缝:任何实现只要满足这四个方法即可(全部异步,对齐 D1 的 Promise API)
export interface Repo {
  listProducts(): Promise<Product[]>
  listMarkets(): Promise<Market[]>
  listPrices(query: PriceQuery): Promise<PriceRecord[]>
  stats(): Promise<HealthStats>
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_IDS = 200

function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false
  // 仅正则不够:Date.parse("2026-02-31") 会回滚为 3 月 3 日而不是 NaN,必须往返校验
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

// 兼容 ?productIds=a,b 与 ?productIds=a&productIds=b;空串/空白项剔除(视为未提供)
function readList(c: Context, key: string): string[] {
  const raw = c.req.queries(key) ?? []
  return [...new Set(raw.flatMap((v) => v.split(",")).map((s) => s.trim()).filter(Boolean))]
}

// 与前端 PriceQuery 语义完全一致:空条件 = 不过滤(无参 = 返回全量)
function parsePriceQuery(c: Context): { query: PriceQuery } | { error: string } {
  const productIds = readList(c, "productIds")
  const marketIds = readList(c, "marketIds")
  if (productIds.length > MAX_IDS) return { error: `productIds 一次最多 ${MAX_IDS} 个` }
  if (marketIds.length > MAX_IDS) return { error: `marketIds 一次最多 ${MAX_IDS} 个` }

  const startDate = c.req.query("startDate")
  const endDate = c.req.query("endDate")
  if (startDate && !isValidDate(startDate)) return { error: "startDate 格式应为 YYYY-MM-DD" }
  if (endDate && !isValidDate(endDate)) return { error: "endDate 格式应为 YYYY-MM-DD" }

  const query: PriceQuery = {}
  if (productIds.length) query.productIds = productIds
  if (marketIds.length) query.marketIds = marketIds
  if (startDate) query.startDate = startDate
  if (endDate) query.endDate = endDate
  return { query }
}

export function createApp(repo: Repo): Hono {
  const app = new Hono()

  app.use("*", logger())
  app.use("/api/*", cors())
  // 与前端 fetch 的 cache:"no-store" 对齐:数据每日更新,禁用浏览器/中间层缓存
  app.use("/api/*", async (c, next) => {
    await next()
    c.header("Cache-Control", "no-store")
  })

  app.get("/api/health", async (c) => c.json({ ok: true, ...(await repo.stats()) }))
  app.get("/api/products", async (c) => c.json(await repo.listProducts()))
  app.get("/api/markets", async (c) => c.json(await repo.listMarkets()))

  // 无参 = 返回全量(与 public/mock/prices.json 逐字节一致),有参 = 服务端过滤
  app.get("/api/prices", async (c) => {
    const parsed = parsePriceQuery(c)
    if ("error" in parsed) return c.json({ error: parsed.error }, 400)
    return c.json(await repo.listPrices(parsed.query))
  })

  app.notFound((c) => c.json({ error: "not found" }, 404))
  app.onError((err, c) => {
    console.error("[server]", err)
    return c.json({ error: "internal error" }, 500)
  })

  return app
}

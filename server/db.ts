// 数据访问层:node:sqlite(Node 内置,零原生依赖;同步 API 用 async 包装,对齐 Repo 接口)。
// 表结构见 schema.sql;数据由 npm run server:seed 从 public/mock/*.json 导入。
import { DatabaseSync } from "node:sqlite"
import type { Product } from "../src/types/product.ts"
import type { Market } from "../src/types/market.ts"
import type { PriceQuery, PriceRecord } from "../src/types/price.ts"
import type { HealthStats, Repo } from "./app.ts"

interface PriceRow {
  productId: string
  marketId: string
  date: string
  price: number
  real: number | null
}

export function createRepo(dbPath: string): Repo {
  const db = new DatabaseSync(dbPath)
  db.exec("PRAGMA busy_timeout = 5000")

  const selProducts = db.prepare("SELECT id, name, category, basePrice FROM products ORDER BY ord")
  const selMarkets = db.prepare("SELECT id, name, city, region FROM markets ORDER BY ord")
  const countProducts = db.prepare("SELECT COUNT(*) AS n FROM products")
  const countMarkets = db.prepare("SELECT COUNT(*) AS n FROM markets")
  const selPriceStats = db.prepare(
    'SELECT COUNT(*) AS n, SUM(CASE WHEN "real" = 1 THEN 1 ELSE 0 END) AS realCount FROM prices',
  )
  const selDateRange = db.prepare("SELECT MIN(date) AS min, MAX(date) AS max FROM prices")

  // 模拟行必须"没有 real 这个 key"(前端用 r.real === 1 判断,不能输出 null)
  // 显式构造还固定了 key 顺序 = productId, marketId, date, price, [real],
  // 使 /api/prices 全量响应与 prices.json 逐字节一致。
  function toRecord(row: PriceRow): PriceRecord {
    const record: PriceRecord = {
      productId: row.productId,
      marketId: row.marketId,
      date: row.date,
      price: row.price,
    }
    if (row.real === 1) record.real = 1
    return record
  }

  return {
    async listProducts() {
      // products.json 本身不含 unit 字段,此处保持与 JSON 同构(前端从不读 unit)
      return selProducts.all() as unknown as Product[]
    },

    async listMarkets() {
      return selMarkets.all() as unknown as Market[]
    },

    async listPrices(query: PriceQuery) {
      let sql = 'SELECT productId, marketId, date, price, "real" FROM prices'
      const conditions: string[] = []
      const params: string[] = []
      // 动态拼装的只有占位符数量,值全部参数绑定(无注入面)
      if (query.productIds?.length) {
        conditions.push(`productId IN (${query.productIds.map(() => "?").join(", ")})`)
        params.push(...query.productIds)
      }
      if (query.marketIds?.length) {
        conditions.push(`marketId IN (${query.marketIds.map(() => "?").join(", ")})`)
        params.push(...query.marketIds)
      }
      if (query.startDate) {
        conditions.push("date >= ?")
        params.push(query.startDate)
      }
      if (query.endDate) {
        conditions.push("date <= ?")
        params.push(query.endDate)
      }
      if (conditions.length) sql += ` WHERE ${conditions.join(" AND ")}`
      sql += " ORDER BY date, productOrd, marketOrd" // = prices.json 的行序(date → 品种序 → 市场序)
      const rows = db.prepare(sql).all(...params) as unknown as PriceRow[]
      return rows.map(toRecord)
    },

    async stats(): Promise<HealthStats> {
      const prices = selPriceStats.get() as { n: number; realCount: number | null }
      const range = selDateRange.get() as { min: string | null; max: string | null }
      const products = countProducts.get() as { n: number }
      const markets = countMarkets.get() as { n: number }
      return {
        counts: {
          products: products.n,
          markets: markets.n,
          prices: prices.n,
          real: prices.realCount ?? 0,
        },
        dateRange: { min: range.min, max: range.max },
      }
    },
  }
}

// 数据访问层:node:sqlite(Node 内置,零原生依赖;同步 API 用 async 包装,对齐 Repo 接口)。
// 表结构见 schema.sql;数据由 npm run server:seed 从 public/mock/*.json 导入。
import { DatabaseSync } from "node:sqlite"
import type { Product } from "../src/types/product.ts"
import type { Market } from "../src/types/market.ts"
import type { PriceQuery, PriceRecord } from "../src/types/price.ts"
import type { PublicUser, Role } from "../src/types/user.ts"
import type { HealthStats, Repo } from "./app.ts"

interface PriceRow {
  productId: string
  marketId: string
  date: string
  price: number
  real: number | null
}

// 用户行(含哈希;仅服务端内部使用,绝不进入 API 响应)
interface UserRow {
  id: number
  username: string
  passwordHash: string
  role: Role
  createdAt: string
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

  // ---- 用户(注册/登录/管理员后台)----
  const selUserByUsername = db.prepare(
    "SELECT id, username, passwordHash, role, createdAt FROM users WHERE username = ?",
  )
  const selUserById = db.prepare("SELECT id, username, role, createdAt FROM users WHERE id = ?")
  const selUsers = db.prepare("SELECT id, username, role, createdAt FROM users ORDER BY id")
  const insUser = db.prepare("INSERT INTO users (username, passwordHash, role, createdAt) VALUES (?, ?, ?, ?)")
  const updUserRole = db.prepare("UPDATE users SET role = ? WHERE id = ?")
  const delUser = db.prepare("DELETE FROM users WHERE id = ?")

  // ---- 价格数据管理(管理员改价/删除;ord 取标量子查询,调用方已校验 id 存在)----
  const upsPrice = db.prepare(
    'INSERT INTO prices (productId, marketId, date, price, "real", productOrd, marketOrd)' +
      " VALUES (?, ?, ?, ?, 1, (SELECT ord FROM products WHERE id = ?), (SELECT ord FROM markets WHERE id = ?))" +
      ' ON CONFLICT(productId, marketId, date) DO UPDATE SET price = excluded.price, "real" = 1',
  )
  const delPrice = db.prepare("DELETE FROM prices WHERE productId = ? AND marketId = ? AND date = ?")

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

    // ---- 用户 ----

    async findUserByUsername(username: string) {
      const row = selUserByUsername.get(username) as UserRow | undefined
      return row ?? null
    },

    async findUserById(id: number) {
      return (selUserById.get(id) as PublicUser | undefined) ?? null
    },

    async createUser(username: string, passwordHash: string, role: Role) {
      const createdAt = new Date().toISOString()
      const r = insUser.run(username, passwordHash, role, createdAt)
      return { id: Number(r.lastInsertRowid), username, role, createdAt }
    },

    async listUsers() {
      return selUsers.all() as unknown as PublicUser[]
    },

    async updateUserRole(id: number, role: Role) {
      return updUserRole.run(role, id).changes > 0
    },

    async deleteUser(id: number) {
      return delUser.run(id).changes > 0
    },

    // ---- 价格数据管理 ----

    async upsertPrice(row) {
      upsPrice.run(row.productId, row.marketId, row.date, row.price, row.productId, row.marketId)
    },

    async deletePrice(row) {
      return delPrice.run(row.productId, row.marketId, row.date).changes > 0
    },
  }
}

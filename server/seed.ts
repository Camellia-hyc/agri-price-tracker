// 数据导入:把 public/mock/*.json 全量灌入本地 SQLite(幂等,可重复执行)。
//   npm run server:seed             全量重建(清空三表后重新导入)
//   npm run server:seed -- --reset  先 DROP 再按 schema.sql 重建(改了表结构后必须加)
// 注意:每次全量重建而非增量 —— 数据窗口是滑动的(每天增一天、掉一天),
// 增量写入会让库中越过 90 天窗口悄悄堆积过期数据而无人察觉。
import { readFileSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { hashPassword } from "./password.ts"

const MOCK_DIR = fileURLToPath(new URL("../public/mock/", import.meta.url))
const SCHEMA_FILE = fileURLToPath(new URL("./schema.sql", import.meta.url))

interface SourceProduct {
  id: string
  name: string
  category: string
  basePrice: number
}
interface SourceMarket {
  id: string
  name: string
  city: string
  region: string
}
interface SourcePrice {
  productId: string
  marketId: string
  date: string
  price: number
  real?: number
}

export function seedDatabase(dbPath: string, opts: { reset?: boolean; quiet?: boolean } = {}): void {
  const db = new DatabaseSync(dbPath)
  db.exec("PRAGMA busy_timeout = 5000")

  if (opts.reset) {
    db.exec("DROP TABLE IF EXISTS prices; DROP TABLE IF EXISTS products; DROP TABLE IF EXISTS markets;")
  }
  db.exec(readFileSync(SCHEMA_FILE, "utf8"))

  const products: SourceProduct[] = JSON.parse(readFileSync(join(MOCK_DIR, "products.json"), "utf8"))
  const markets: SourceMarket[] = JSON.parse(readFileSync(join(MOCK_DIR, "markets.json"), "utf8"))
  const prices: SourcePrice[] = JSON.parse(readFileSync(join(MOCK_DIR, "prices.json"), "utf8"))

  const productOrd = new Map(products.map((p, i) => [p.id, i] as const))
  const marketOrd = new Map(markets.map((m, i) => [m.id, i] as const))

  // 数据体检:价格记录引用的品种/市场必须在目录中存在(引用不到的记录不会被前端语义牵连)
  const orphan = prices.filter((r) => !productOrd.has(r.productId) || !marketOrd.has(r.marketId))
  if (orphan.length) {
    console.warn(`[seed] 警告:${orphan.length} 条价格记录引用未知品种/市场,示例 ${JSON.stringify(orphan[0])}`)
  }

  const insProduct = db.prepare(
    "INSERT INTO products (id, name, category, basePrice, ord) VALUES (?, ?, ?, ?, ?)",
  )
  const insMarket = db.prepare("INSERT INTO markets (id, name, city, region, ord) VALUES (?, ?, ?, ?, ?)")
  const insPrice = db.prepare(
    'INSERT INTO prices (productId, marketId, date, price, "real", productOrd, marketOrd) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )

  // 手工 BEGIN/COMMIT(不用驱动特有的事务包装,便于将来切换 D1)
  db.exec("BEGIN")
  try {
    db.exec("DELETE FROM prices; DELETE FROM products; DELETE FROM markets")
    products.forEach((p, i) => insProduct.run(p.id, p.name, p.category, p.basePrice, i))
    markets.forEach((m, i) => insMarket.run(m.id, m.name, m.city, m.region, i))
    for (const r of prices) {
      insPrice.run(
        r.productId,
        r.marketId,
        r.date,
        r.price,
        r.real ?? null,
        productOrd.get(r.productId) ?? -1,
        marketOrd.get(r.marketId) ?? -1,
      )
    }
    db.exec("COMMIT")
  } catch (err) {
    db.exec("ROLLBACK")
    throw err
  }

  if (!opts.quiet) {
    const stats = db.prepare(
      'SELECT COUNT(*) AS n, SUM(CASE WHEN "real" = 1 THEN 1 ELSE 0 END) AS realCount, MIN(date) AS minDate, MAX(date) AS maxDate FROM prices',
    ).get() as { n: number; realCount: number | null; minDate: string; maxDate: string }
    console.log(
      `[seed] products ${products.length} / markets ${markets.length} / prices ${stats.n}(real ${stats.realCount ?? 0})`,
    )
    console.log(`[seed] 日期范围 ${stats.minDate} ~ ${stats.maxDate}`)
  }
  db.close()

  // 演示环境保底:确保存在管理员账号(仅当用户名 admin 不存在时创建)
  ensureDefaultAdmin(dbPath)
}

// 幂等建表(schema.sql 全部 IF NOT EXISTS):供 index.ts 启动时给旧库补上新增的表(如 users)
export function ensureSchema(dbPath: string): void {
  const db = new DatabaseSync(dbPath)
  db.exec("PRAGMA busy_timeout = 5000")
  db.exec(readFileSync(SCHEMA_FILE, "utf8"))
  db.close()
}

// 确保管理员账号 admin 存在(密码默认 admin123,ADMIN_PASSWORD 环境变量可覆盖)。
// 仅当用户名 admin 不存在时创建;已存在则不干预(被改名/降级是使用者的选择)。
export function ensureDefaultAdmin(dbPath: string): void {
  const db = new DatabaseSync(dbPath)
  db.exec("PRAGMA busy_timeout = 5000")
  const existing = db.prepare("SELECT id FROM users WHERE username = 'admin'").get()
  if (existing) {
    console.log("[seed] 管理员账号 admin 已存在")
  } else {
    const password = process.env.ADMIN_PASSWORD ?? "admin123"
    db.prepare("INSERT INTO users (username, passwordHash, role, createdAt) VALUES (?, ?, 'admin', ?)").run(
      "admin",
      hashPassword(password),
      new Date().toISOString(),
    )
    console.log(`[seed] 已创建默认管理员:admin / ${password}(演示用,ADMIN_PASSWORD 可覆盖)`)
  }
  db.close()
}

// 直接执行本文件时运行(npm run server:seed);被 index.ts 导入时不触发
const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  const dbPath = fileURLToPath(new URL("./data.sqlite", import.meta.url))
  const reset = process.argv.includes("--reset")
  console.log(`[seed] 导入 ${MOCK_DIR} → ${dbPath}${reset ? "(--reset)" : ""}`)
  seedDatabase(dbPath, { reset })
}

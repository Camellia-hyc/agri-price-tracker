// 农价通真实数据爬虫(Crawlee)
// 数据源:农业农村部全国农产品批发市场价格信息系统 pfsc.agri.cn
// 流程:品种树匹配 → 爬 20 品种当日价格(AES 解密)→ 挑选 10 城市官方市场
//       → 当日快照存入 data/history/ → 合并最近 90 天(真实快照覆盖,mock 补齐缺口)
//       → 生成 public/mock/markets.json + prices.json(前端 api.ts 零改动)
// 用法:node scripts/crawl-pfsc.mjs(建议每日运行一次,自动积累历史)
import crypto from "node:crypto"
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { HttpCrawler, Request, log } from "crawlee"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")
const OUT = path.join(ROOT, "public", "mock")
const HISTORY = path.join(ROOT, "data", "history")
const DAYS = 90

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
const API = "https://pfsc.agri.cn/price_portal"
const KEY = "7s9K$pG2xQ8zR5mB7vA3sD9fH2jW40cV"

// ---------- AES-256-CBC 解密(与官网前端一致)----------
function decryptAes(e) {
  if (!e) return e
  const iv = e.substring(0, 16)
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(KEY, "utf8"), Buffer.from(iv, "utf8"))
  let out = decipher.update(e.substring(16), "base64", "utf8")
  out += decipher.final("utf8")
  return out
}

// ---------- 10 城市官方市场挑选配置 ----------
// 项目保持 10 城市设计,从官方当天实际有报价的市场里挑:品牌同名优先 → 按上报品种数最多
const REGION_MAP = [
  { city: "深圳", keys: ["深圳"] },
  { city: "广州", keys: ["广州", "广东"] },
  { city: "杭州", keys: ["杭州", "浙江"] },
  { city: "郑州", keys: ["郑州", "河南"] },
  { city: "武汉", keys: ["武汉", "湖北"] },
  { city: "成都", keys: ["成都", "四川"] },
  { city: "西安", keys: ["西安", "陕西"] },
  { city: "沈阳", keys: ["沈阳", "辽宁"] },
  { city: "北京", keys: ["北京"] },
  { city: "上海", keys: ["上海"] },
]
const CITY_DEFS = [
  { city: "北京", region: "华北", brand: ["新发地"] },
  { city: "上海", region: "华东", brand: ["江桥", "江杨", "上海农产品中心"] },
  { city: "广州", region: "华南", brand: ["江南"] },
  { city: "深圳", region: "华南", brand: ["海吉星"] },
  { city: "杭州", region: "华东", brand: ["农副"] },
  { city: "郑州", region: "华中", brand: ["万邦"] },
  { city: "武汉", region: "华中", brand: ["白沙洲"] },
  { city: "成都", region: "西南", brand: ["农产品中心"] },
  { city: "西安", region: "西北", brand: ["欣桥", "西安"] },
  { city: "沈阳", region: "东北", brand: ["十二线", "盛发"] },
]
const PINYIN = { 北京: "bj", 上海: "sh", 广州: "gz", 深圳: "sz", 杭州: "hz", 郑州: "zz", 武汉: "wh", 成都: "cd", 西安: "xa", 沈阳: "sy" }

function cityOf(marketName) {
  for (const { city, keys } of REGION_MAP) {
    if (keys.some((k) => marketName.startsWith(k))) return city
  }
  return null
}

function marketIdOf(city, name) {
  const hash = crypto.createHash("md5").update(name, "utf8").digest("hex").slice(0, 8)
  return `${PINYIN[city]}_${hash}`
}

// ---------- mock 补齐用的价格模型(与 generate-mock.mjs 同参数)----------
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hashSeed(s) {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}
function fmtDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

// ---------- 1. 读产品定义(public/mock/products.json,前端展示名以此为准)----------
const products = JSON.parse(readFileSync(path.join(OUT, "products.json"), "utf8"))

// ---------- 2. 品种树匹配(官方品种名 → varietyID)----------
async function fetchTree() {
  const res = await fetch(`${API}/sys-user-relation/getVarietiesTree`, {
    headers: { "User-Agent": UA, Referer: "https://pfsc.agri.cn/" },
  })
  return res.json()
}

const tree = await fetchTree()
const varieties = []
function walk(node) {
  if (!node) return
  for (const v of node.attributelist || []) {
    if (v.varietyName && v.id) varieties.push({ name: v.varietyName, id: v.id })
  }
  for (const c of node.children || []) walk(c)
}
for (const root of tree.content) walk(root.content || root)
console.log(`品种树共 ${varieties.length} 个品种`)

// 精确匹配优先;无精确时用包含匹配;可能多候选(如"猪肉"有多个分类),全部爬、取当天市场数最多的
const matched = []
for (const p of products) {
  let hits = varieties.filter((v) => v.name === p.name)
  if (!hits.length) hits = varieties.filter((v) => v.name.includes(p.name) || p.name.includes(v.name))
  if (!hits.length) {
    console.warn(`[警告] ${p.name} 在官方品种树中未找到,跳过`)
    continue
  }
  matched.push({ productId: p.id, productName: p.name, candidates: hits })
  console.log(
    `${p.name} -> ${hits.length === 1 ? `id=${hits[0].id}` : `候选 ${hits.map((h) => `${h.name}(${h.id})`).join(", ")}`}`,
  )
}

// ---------- 3. Crawlee 爬当日价格 ----------
const headers = {
  "User-Agent": UA,
  Referer: "https://pfsc.agri.cn/",
  "Content-Type": "application/json",
}
const requests = matched.flatMap((m) =>
  m.candidates.map(
    (v) =>
      new Request({
        url: `${API}/index/getMarketReportPriceChart?marketIDs=&provinceCodes=&varietyID=${v.id}`,
        method: "POST",
        payload: "{}",
        headers,
        uniqueKey: `variety:${v.id}`,
        label: `${m.productId}::${v.id}`,
      }),
  ),
)

const rawByVariety = new Map() // varietyID -> {date, x, y}
const crawler = new HttpCrawler({
  maxConcurrency: 4,
  requestHandler: async ({ request, body }) => {
    const j = JSON.parse(body.toString())
    if (!j.data) return // 该品种当天无上报数据(data:null)
    const d = JSON.parse(decryptAes(j.data))
    rawByVariety.set(request.label, { ...d, varietyId: Number(request.url.match(/varietyID=(\d+)/)[1]) })
  },
})
await crawler.run(requests)

// 每个产品在候选中选当天市场数最多的
const dayData = new Map() // productId -> {date, x, y}
for (const m of matched) {
  const best = m.candidates
    .map((v) => rawByVariety.get(`${m.productId}::${v.id}`))
    .filter(Boolean)
    .sort((a, b) => b.x.length - a.x.length)[0]
  if (!best) {
    console.warn(`[警告] ${m.productName} 当天无任何市场报价,跳过`)
    continue
  }
  dayData.set(m.productId, best)
}
if (!dayData.size) {
  console.error("错误:当天所有品种均无数据,不生成输出。")
  process.exit(1)
}

// ---------- 4. 挑选 10 城市官方市场 ----------
// 统计每个市场当天上报的品种数
const marketStats = new Map() // 市场名 -> 上报品种数
for (const d of dayData.values()) {
  for (const name of d.x) marketStats.set(name, (marketStats.get(name) || 0) + 1)
}
console.log(`\n当天共 ${marketStats.size} 个官方市场有报价,挑选 10 城市代表市场:`)

const markets = []
for (const c of CITY_DEFS) {
  const cands = [...marketStats.entries()].filter(([name]) => cityOf(name) === c.city)
  if (!cands.length) {
    console.warn(`  [跳过] ${c.city}:当天无该城市市场报价`)
    continue
  }
  const branded = cands.filter(([name]) => c.brand.some((b) => name.includes(b)))
  const [name, count] = (branded.length ? branded : cands).sort((a, b) => b[1] - a[1])[0]
  markets.push({ id: marketIdOf(c.city, name), name, city: c.city, region: c.region, factor: undefined })
  console.log(`  ${c.city}:${name}(上报 ${count} 个品种${branded.length ? ",品牌同名" : ""})`)
}
if (!markets.length) {
  console.error("错误:没有任何城市能匹配到官方市场,不生成输出。")
  process.exit(1)
}
// 市场 factor(mock 模型用):由市场 id 派生,跨运行稳定
const marketList = markets.map((m) => {
  const r = mulberry32(hashSeed(m.id))
  return { ...m, factor: 0.9 + r() * 0.25 }
})
const marketById = new Map(marketList.map((m) => [m.name, m]))

// ---------- 5. 生成当日快照并写入 data/history/ ----------
const snapDate = [...dayData.values()][0].date
const records = []
for (const [productId, d] of dayData) {
  for (let i = 0; i < d.x.length; i++) {
    const m = marketById.get(d.x[i])
    if (!m) continue // 非选中市场
    const price = Number(d.y[i])
    if (!Number.isFinite(price) || price <= 0) continue
    records.push({ productId, marketId: m.id, date: d.date, price: Math.round(price * 100) / 100 })
  }
}
mkdirSync(HISTORY, { recursive: true })
const snapshot = {
  date: snapDate,
  markets: marketList.map(({ factor, ...m }) => m),
  records,
}
writeFileSync(path.join(HISTORY, `${snapDate}.json`), JSON.stringify(snapshot, null, 2))
console.log(`\n当日快照 ${snapDate}:${dayData.size} 个品种 × ${marketList.length} 个市场 = ${records.length} 条真实记录`)

// ---------- 6. 合并最近 90 天:真实快照覆盖 + mock 补齐缺口 ----------
const today = new Date(snapDate + "T00:00:00")
const dates = []
for (let i = DAYS - 1; i >= 0; i--) {
  const d = new Date(today)
  d.setDate(d.getDate() - i)
  dates.push(fmtDate(d))
}

// 真实价格索引:productId|marketId|date -> price(只保留今天市场集合里的记录)
const realMap = new Map()
const realDates = new Set()
for (const f of readdirSync(HISTORY).filter((f) => f.endsWith(".json"))) {
  const snap = JSON.parse(readFileSync(path.join(HISTORY, f), "utf8"))
  if (!dates.includes(snap.date)) continue // 90 天窗口之外的历史快照不参与
  realDates.add(snap.date)
  for (const r of snap.records || []) {
    realMap.set(`${r.productId}|${r.marketId}|${r.date}`, r.price)
  }
}

// 产品波动参数(与 generate-mock.mjs 一致:amp/phase/drift)
const SEED = 20260917
const rand = mulberry32(SEED)
const withParams = products.map((p) => ({
  ...p,
  amp: 0.05 + rand() * 0.15,
  phase: rand() * Math.PI * 2,
  drift: (rand() - 0.5) * 0.3,
}))

// mock 基线:真实缺口用固定种子补齐(每格 (product,market,date) 独立种子,市场增删不影响其他格子)
const merged = []
let realCount = 0
let mockCount = 0
for (let di = 0; di < DAYS; di++) {
  const date = dates[di]
  const weekend = [0, 6].includes(new Date(date + "T00:00:00").getDay()) ? 1.012 : 1
  for (const p of withParams) {
    const seasonal = 1 + p.amp * Math.sin((2 * Math.PI * di) / DAYS + p.phase)
    const trend = 1 + (p.drift * di) / (DAYS - 1)
    for (const m of marketList) {
      const key = `${p.id}|${m.id}|${date}`
      const real = realMap.get(key)
      if (real !== undefined) {
        merged.push({ productId: p.id, marketId: m.id, date, price: real })
        realCount++
        continue
      }
      const r = mulberry32(hashSeed(key))
      const noise = 1 + (r() - 0.5) * 0.06
      const price = Math.round(p.basePrice * m.factor * seasonal * trend * weekend * noise * 100) / 100
      merged.push({ productId: p.id, marketId: m.id, date, price })
      mockCount++
    }
  }
}

// ---------- 7. 输出 ----------
writeFileSync(path.join(OUT, "markets.json"), JSON.stringify(marketList.map(({ factor, ...m }) => m), null, 2))
writeFileSync(path.join(OUT, "prices.json"), JSON.stringify(merged))

console.log(`\n合并完成(最近 ${DAYS} 天):`)
console.log(`  真实天数:${realDates.size} 天,真实记录 ${realCount} 条;mock 补齐 ${mockCount} 条`)
console.log(`  市场:${marketList.length} 个,产品:${products.length} 种,总记录:${merged.length} 条`)
console.log(`  输出:public/mock/markets.json、public/mock/prices.json`)
console.log(`  快照:data/history/${snapDate}.json`)

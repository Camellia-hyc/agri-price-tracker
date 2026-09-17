// 生成 mock 数据:20 种农产品 × 10 个市场 × 90 天价格记录
// 用法:node scripts/generate-mock.mjs(固定种子,结果可复现)
import { writeFileSync, mkdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, "..", "public", "mock")

const DAYS = 90
const SEED = 20260917

function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(SEED)

const products = [
  { id: "cabbage", name: "大白菜", category: "蔬菜", basePrice: 2.2 },
  { id: "tomato", name: "西红柿", category: "蔬菜", basePrice: 6.5 },
  { id: "cucumber", name: "黄瓜", category: "蔬菜", basePrice: 4.8 },
  { id: "potato", name: "土豆", category: "蔬菜", basePrice: 3.2 },
  { id: "apple", name: "苹果", category: "水果", basePrice: 8.5 },
  { id: "banana", name: "香蕉", category: "水果", basePrice: 5.6 },
  { id: "orange", name: "橙子", category: "水果", basePrice: 7.2 },
  { id: "watermelon", name: "西瓜", category: "水果", basePrice: 3.0 },
  { id: "rice", name: "大米", category: "粮油", basePrice: 5.8 },
  { id: "wheat", name: "小麦", category: "粮油", basePrice: 2.9 },
  { id: "corn", name: "玉米", category: "粮油", basePrice: 2.6 },
  { id: "peanut", name: "花生", category: "粮油", basePrice: 9.5 },
  { id: "pork", name: "猪肉", category: "肉禽蛋", basePrice: 24.0 },
  { id: "beef", name: "牛肉", category: "肉禽蛋", basePrice: 68.0 },
  { id: "mutton", name: "羊肉", category: "肉禽蛋", basePrice: 62.0 },
  { id: "egg", name: "鸡蛋", category: "肉禽蛋", basePrice: 9.8 },
  { id: "carp", name: "鲤鱼", category: "水产", basePrice: 12.0 },
  { id: "grass_carp", name: "草鱼", category: "水产", basePrice: 14.5 },
  { id: "crucian", name: "鲫鱼", category: "水产", basePrice: 16.0 },
  { id: "shrimp", name: "基围虾", category: "水产", basePrice: 55.0 },
]

const markets = [
  { id: "bj_xinfadi", name: "北京新发地批发市场", city: "北京", region: "华北", factor: 1.08 },
  { id: "sh_jiangqiao", name: "上海江桥批发市场", city: "上海", region: "华东", factor: 1.15 },
  { id: "gz_jiangnan", name: "广州江南果菜批发市场", city: "广州", region: "华南", factor: 1.05 },
  { id: "sz_haijixing", name: "深圳海吉星农批市场", city: "深圳", region: "华南", factor: 1.12 },
  { id: "hz_nongdu", name: "杭州农副产品物流中心", city: "杭州", region: "华东", factor: 1.06 },
  { id: "zz_wanbang", name: "郑州万邦国际农产品物流城", city: "郑州", region: "华中", factor: 0.97 },
  { id: "wh_baishazhou", name: "武汉白沙洲农副产品大市场", city: "武汉", region: "华中", factor: 0.95 },
  { id: "cd_sanlian", name: "成都农产品中心批发市场", city: "成都", region: "西南", factor: 0.98 },
  { id: "xa_xinqiao", name: "西安欣桥农产品批发市场", city: "西安", region: "西北", factor: 0.94 },
  { id: "sy_shierxian", name: "沈阳十二线蔬菜批发市场", city: "沈阳", region: "东北", factor: 0.92 },
]

// 每个产品独立的波动参数,让曲线形态各异
const withParams = products.map((p) => ({
  ...p,
  amp: 0.05 + rand() * 0.15, // 季节波动幅度 ±5%~20%
  phase: rand() * Math.PI * 2,
  drift: (rand() - 0.5) * 0.3, // 90 天累计涨跌幅 -15% ~ +15%
}))

function fmtDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

// 今天往前推 90 天,数据始终是"最近 90 天"
const today = new Date()
const dates = []
for (let i = DAYS - 1; i >= 0; i--) {
  const d = new Date(today)
  d.setDate(d.getDate() - i)
  dates.push(fmtDate(d))
}

const records = []
for (let di = 0; di < DAYS; di++) {
  const date = dates[di]
  // 周末采购需求略高
  const weekend = [0, 6].includes(new Date(date + "T00:00:00").getDay()) ? 1.012 : 1
  for (const p of withParams) {
    const seasonal = 1 + p.amp * Math.sin((2 * Math.PI * di) / DAYS + p.phase)
    const trend = 1 + (p.drift * di) / (DAYS - 1)
    for (const m of markets) {
      const noise = 1 + (rand() - 0.5) * 0.06
      const price =
        Math.round(p.basePrice * m.factor * seasonal * trend * weekend * noise * 100) / 100
      records.push({ productId: p.id, marketId: m.id, date, price })
    }
  }
}

mkdirSync(outDir, { recursive: true })
writeFileSync(path.join(outDir, "products.json"), JSON.stringify(products, null, 2))
// factor 只参与生成,不进前端数据
writeFileSync(
  path.join(outDir, "markets.json"),
  JSON.stringify(markets.map(({ factor, ...m }) => m), null, 2),
)
writeFileSync(path.join(outDir, "prices.json"), JSON.stringify(records))

console.log(
  `已生成:${products.length} 种产品 × ${markets.length} 个市场 × ${DAYS} 天 = ${records.length} 条价格记录`,
)
console.log(`日期范围:${dates[0]} ~ ${dates[dates.length - 1]}`)

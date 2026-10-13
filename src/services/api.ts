import type { Product } from "@/types/product"
import type { Market } from "@/types/market"
import type { PriceQuery, PriceRecord } from "@/types/price"

// 数据源开关:设置 VITE_API_BASE(如 http://localhost:8787)时走后端 API(见 server/);
// 未设置时保持原静态 mock 逻辑 —— 线上 GitHub Pages 行为完全不变。只改本文件。
const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/+$/, "")
const MOCK_BASE = `${import.meta.env.BASE_URL}mock`

let pricesCache: PriceRecord[] | null = null

async function fetchJson<T>(url: string, label: string): Promise<T> {
  // no-store:数据会被爬虫/后端更新,避免浏览器缓存旧数据
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`加载 ${label} 失败:${res.status}`)
  }
  return res.json()
}

// 后端模式下把查询条件拼成 URL 参数(无参返回 "",与服务端"无参 = 全量"语义一致)
function buildPriceSearch(query: PriceQuery): string {
  const sp = new URLSearchParams()
  if (query.productIds?.length) sp.set("productIds", query.productIds.join(","))
  if (query.marketIds?.length) sp.set("marketIds", query.marketIds.join(","))
  if (query.startDate) sp.set("startDate", query.startDate)
  if (query.endDate) sp.set("endDate", query.endDate)
  return sp.toString() ? `?${sp}` : ""
}

function filterPrices(records: PriceRecord[], query: PriceQuery): PriceRecord[] {
  const { productIds, marketIds, startDate, endDate } = query
  return records.filter((r) => {
    if (productIds?.length && !productIds.includes(r.productId)) return false
    if (marketIds?.length && !marketIds.includes(r.marketId)) return false
    if (startDate && r.date < startDate) return false
    if (endDate && r.date > endDate) return false
    return true
  })
}

export function getProducts(): Promise<Product[]> {
  if (API_BASE) return fetchJson<Product[]>(`${API_BASE}/api/products`, "products")
  return fetchJson<Product[]>(`${MOCK_BASE}/products.json`, "products.json")
}

export function getMarkets(): Promise<Market[]> {
  if (API_BASE) return fetchJson<Market[]>(`${API_BASE}/api/markets`, "markets")
  return fetchJson<Market[]>(`${MOCK_BASE}/markets.json`, "markets.json")
}

// 静态模式:prices.json 约 2.9MB,只请求一次,后续查询在内存过滤;
// 后端模式:带过滤条件交给服务端查询,无参时保持"全量 + 模块级缓存"的既有语义。
export async function getPrices(query: PriceQuery = {}): Promise<PriceRecord[]> {
  if (API_BASE) {
    const search = buildPriceSearch(query)
    if (search) return fetchJson<PriceRecord[]>(`${API_BASE}/api/prices${search}`, "prices")
    if (!pricesCache) pricesCache = await fetchJson<PriceRecord[]>(`${API_BASE}/api/prices`, "prices")
    return pricesCache
  }
  if (!pricesCache) {
    pricesCache = await fetchJson<PriceRecord[]>(`${MOCK_BASE}/prices.json`, "prices.json")
  }
  return filterPrices(pricesCache, query)
}

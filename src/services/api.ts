import type { Product } from "@/types/product"
import type { Market } from "@/types/market"
import type { PriceQuery, PriceRecord } from "@/types/price"

// 后期替换真实 API 时只需改这个文件
const MOCK_BASE = `${import.meta.env.BASE_URL}mock`

let pricesCache: PriceRecord[] | null = null

async function fetchJson<T>(path: string): Promise<T> {
  // no-store:数据文件会被爬虫更新,避免浏览器缓存旧数据
  const res = await fetch(`${MOCK_BASE}/${path}`, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`加载 ${path} 失败:${res.status}`)
  }
  return res.json()
}

export function getProducts(): Promise<Product[]> {
  return fetchJson<Product[]>("products.json")
}

export function getMarkets(): Promise<Market[]> {
  return fetchJson<Market[]>("markets.json")
}

// prices.json 约 1MB,只请求一次,后续查询在内存过滤
export async function getPrices(query: PriceQuery = {}): Promise<PriceRecord[]> {
  if (!pricesCache) {
    pricesCache = await fetchJson<PriceRecord[]>("prices.json")
  }
  const { productIds, marketIds, startDate, endDate } = query
  return pricesCache.filter((r) => {
    if (productIds?.length && !productIds.includes(r.productId)) return false
    if (marketIds?.length && !marketIds.includes(r.marketId)) return false
    if (startDate && r.date < startDate) return false
    if (endDate && r.date > endDate) return false
    return true
  })
}

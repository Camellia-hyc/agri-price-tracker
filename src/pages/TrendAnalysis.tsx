import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { getMarkets, getPrices, getProducts } from "@/services/api"
import type { Product } from "@/types/product"
import type { Market } from "@/types/market"
import type { PriceRecord } from "@/types/price"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { shiftDate } from "@/lib/date"
import TrendFilter, { type RangeDays } from "@/components/trend/TrendFilter"
import StatCards, { type StatCardData } from "@/components/trend/StatCards"
import TrendChart from "@/components/trend/TrendChart"

const DEFAULT_PRODUCTS = ["pork", "egg", "cabbage"]
const DEFAULT_MARKET = "bj_xinfadi"

export default function TrendAnalysis() {
  const [products, setProducts] = useState<Product[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [allPrices, setAllPrices] = useState<PriceRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [selectedProductIds, setSelectedProductIds] =
    useState<string[]>(DEFAULT_PRODUCTS)
  const [selectedMarketId, setSelectedMarketId] = useState(DEFAULT_MARKET)
  const [rangeDays, setRangeDays] = useState<RangeDays>(30)

  useEffect(() => {
    let cancelled = false
    Promise.all([getProducts(), getMarkets(), getPrices()])
      .then(([ps, ms, prices]) => {
        if (cancelled) return
        setProducts(ps)
        setMarkets(ms)
        setAllPrices(prices)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "数据加载失败"))
    return () => {
      cancelled = true
    }
  }, [])

  const [searchParams] = useSearchParams()

  // 首页搜索/分类入口跳转时,按 URL 参数初始化选择
  useEffect(() => {
    if (products.length === 0) return
    const productId = searchParams.get("product")
    const category = searchParams.get("category")
    if (productId && products.some((p) => p.id === productId)) {
      setSelectedProductIds([productId])
    } else if (category) {
      // 上限 3 与 TrendFilter 的 MAX_PRODUCTS 一致
      const ids = products
        .filter((p) => p.category === category)
        .slice(0, 3)
        .map((p) => p.id)
      if (ids.length > 0) setSelectedProductIds(ids)
    }
  }, [products, searchParams])

  const maxDate = useMemo(() => {
    if (!allPrices) return ""
    return allPrices.reduce((a, r) => (r.date > a ? r.date : a), allPrices[0].date)
  }, [allPrices])

  const toggleProduct = (id: string) =>
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )

  const selectedProducts = useMemo(
    () =>
      selectedProductIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is Product => p !== undefined),
    [selectedProductIds, products],
  )

  const selectedMarket = useMemo(
    () => markets.find((m) => m.id === selectedMarketId),
    [markets, selectedMarketId],
  )

  const startDate = maxDate ? shiftDate(maxDate, -(rangeDays - 1)) : ""

  const { dates, stats } = useMemo(() => {
    const dates: string[] = []
    const stats: StatCardData[] = []
    if (!allPrices || !startDate || !selectedMarketId) {
      return { dates, stats }
    }

    // 按日期聚合选中市场+产品的价格
    const byDate = new Map<string, Map<string, number>>()
    for (const r of allPrices) {
      if (r.date < startDate) continue
      if (r.marketId !== selectedMarketId) continue
      if (!selectedProductIds.includes(r.productId)) continue
      let m = byDate.get(r.date)
      if (!m) {
        m = new Map()
        byDate.set(r.date, m)
      }
      m.set(r.productId, r.price)
    }
    const sortedDates = [...byDate.keys()].sort()
    dates.push(...sortedDates)

    for (const p of selectedProducts) {
      const values = sortedDates.map((d) => byDate.get(d)?.get(p.id) ?? null)
      const nums = values.filter((v): v is number => v !== null)
      if (nums.length === 0) continue
      const first = nums[0]
      const last = nums[nums.length - 1]
      stats.push({
        product: p,
        values,
        latest: last,
        max: Math.max(...nums),
        min: Math.min(...nums),
        avg: nums.reduce((s, v) => s + v, 0) / nums.length,
        changePct: ((last - first) / first) * 100,
      })
    }
    return { dates, stats }
  }, [allPrices, startDate, selectedMarketId, selectedProductIds, selectedProducts])

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-destructive">
        数据加载失败:{error}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">趋势分析</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          对比所选市场内不同农产品的价格走势(当前数据覆盖最近 90 天)
        </p>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            数据加载中…
          </CardContent>
        </Card>
      ) : (
        <>
          <TrendFilter
            products={products}
            markets={markets}
            selectedProductIds={selectedProductIds}
            selectedMarketId={selectedMarketId}
            rangeDays={rangeDays}
            onProductToggle={toggleProduct}
            onMarketChange={setSelectedMarketId}
            onRangeChange={setRangeDays}
          />

          {stats.length > 0 && dates.length > 0 ? (
            <>
              <StatCards data={stats} />

              <Card>
                <CardHeader>
                  <CardTitle>价格走势</CardTitle>
                  <CardDescription>
                    {selectedMarket?.name ?? ""} · {dates[0]} ~{" "}
                    {dates[dates.length - 1]} · 单位:元/公斤
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TrendChart dates={dates} series={stats} />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                请至少选择 1 个产品
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

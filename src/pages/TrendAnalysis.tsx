import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowUpRight } from "lucide-react"
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
import { parseIdList } from "@/lib/urlParams"
import {
  ALL_MARKETS_ID,
  ALL_MARKETS_LABEL,
  TREND_MAX_MARKETS,
  seriesName,
} from "@/lib/marketScope"
import TrendFilter, {
  MAX_PRODUCTS,
  type RangeDays,
} from "@/components/trend/TrendFilter"
import StatCards, { type StatCardData } from "@/components/trend/StatCards"
import TrendChart, { type TrendSeries } from "@/components/trend/TrendChart"

const DEFAULT_PRODUCTS = ["pork", "egg", "cabbage"]

export default function TrendAnalysis() {
  const [products, setProducts] = useState<Product[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [allPrices, setAllPrices] = useState<PriceRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [selectedProductIds, setSelectedProductIds] =
    useState<string[]>(DEFAULT_PRODUCTS)
  // 默认「全国均价」:虚拟 id 不随爬虫重写 markets.json 漂移,口径与首页口径一致
  const [selectedMarketIds, setSelectedMarketIds] = useState<string[]>([
    ALL_MARKETS_ID,
  ])
  const [rangeDays, setRangeDays] = useState<RangeDays>(30)

  useEffect(() => {
    let cancelled = false
    Promise.all([getProducts(), getMarkets(), getPrices()])
      .then(([ps, ms, prices]) => {
        if (cancelled) return
        setProducts(ps)
        setMarkets(ms)
        setAllPrices(prices)
        // 真实市场 id 由爬虫生成、可能变化:「全国均价」恒有效,失效的剔除,全失效回退默认
        setSelectedMarketIds((prev) => {
          const valid = prev.filter(
            (id) => id === ALL_MARKETS_ID || ms.some((m) => m.id === id),
          )
          return valid.length > 0 ? valid : [ALL_MARKETS_ID]
        })
      })
      .catch((e) => setError(e instanceof Error ? e.message : "数据加载失败"))
    return () => {
      cancelled = true
    }
  }, [])

  const [searchParams] = useSearchParams()

  // URL 参数初始化(只读一次):markets/products 多值优先,fallback 旧的单值 product/category。
  // 指纹 = 参数串,同一串只应用一次;数据未就绪时不应用也不打指纹(StrictMode 双跑安全)
  const appliedUrlRef = useRef<string | null>(null)
  useEffect(() => {
    if (products.length === 0 || markets.length === 0) return
    const fp = searchParams.toString()
    if (appliedUrlRef.current === fp) return
    appliedUrlRef.current = fp

    const marketIds = parseIdList(
      searchParams.get("markets"),
      (id) => id === ALL_MARKETS_ID || markets.some((m) => m.id === id),
      TREND_MAX_MARKETS,
    )
    if (marketIds.length > 0) {
      // 「全国均价」与真实城市互斥
      setSelectedMarketIds(
        marketIds.includes(ALL_MARKETS_ID) ? [ALL_MARKETS_ID] : marketIds,
      )
    }

    const prodIds = parseIdList(
      searchParams.get("products"),
      (id) => products.some((p) => p.id === id),
      MAX_PRODUCTS,
    )
    if (prodIds.length > 0) {
      setSelectedProductIds(prodIds)
      return
    }
    const productId = searchParams.get("product")
    const category = searchParams.get("category")
    if (productId && products.some((p) => p.id === productId)) {
      setSelectedProductIds([productId])
    } else if (category) {
      const ids = products
        .filter((p) => p.category === category)
        .slice(0, MAX_PRODUCTS)
        .map((p) => p.id)
      if (ids.length > 0) setSelectedProductIds(ids)
    }
  }, [products, markets, searchParams])

  const maxDate = useMemo(() => {
    if (!allPrices) return ""
    return allPrices.reduce((a, r) => (r.date > a ? r.date : a), allPrices[0].date)
  }, [allPrices])

  /** 数据实际覆盖天数(distinct 日期数),用于「近1年」档位置灰 */
  const availableDays = useMemo(
    () => (allPrices ? new Set(allPrices.map((r) => r.date)).size : 0),
    [allPrices],
  )

  const toggleProduct = (id: string) =>
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )

  // 「全国均价」是模式开关:点选即整体替换,再点取消;选真实城市时与它互斥
  const toggleMarket = (id: string) =>
    setSelectedMarketIds((prev) => {
      if (id === ALL_MARKETS_ID) {
        return prev.includes(ALL_MARKETS_ID) ? [] : [ALL_MARKETS_ID]
      }
      const next = prev.filter((x) => x !== ALL_MARKETS_ID)
      if (next.includes(id)) return next.filter((x) => x !== id)
      if (next.length >= TREND_MAX_MARKETS) return next // chips 已置灰,兜底
      return [...next, id]
    })

  const selectedProducts = useMemo(
    () =>
      selectedProductIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is Product => p !== undefined),
    [selectedProductIds, products],
  )

  const selectedMarkets = useMemo(
    () =>
      selectedMarketIds
        .filter((id) => id !== ALL_MARKETS_ID)
        .map((id) => markets.find((m) => m.id === id))
        .filter((m): m is Market => m !== undefined),
    [selectedMarketIds, markets],
  )

  const isAllMarkets = selectedMarketIds.includes(ALL_MARKETS_ID)

  const startDate = maxDate ? shiftDate(maxDate, -(rangeDays - 1)) : ""

  const { dates, stats, series } = useMemo(() => {
    const dates: string[] = []
    const stats: StatCardData[] = []
    const series: TrendSeries[] = []
    if (
      !allPrices ||
      !startDate ||
      selectedMarketIds.length === 0 ||
      selectedProducts.length === 0
    ) {
      return { dates, stats, series }
    }

    // 口径市场:全国均价 = 全部市场;否则 = 所选真实市场
    const scopeMarkets = isAllMarkets ? markets : selectedMarkets
    const scopeMarketIds = new Set(scopeMarkets.map((m) => m.id))

    // date -> productId -> marketId -> price(三层嵌套,多市场不能互相覆盖)
    const byDate = new Map<string, Map<string, Map<string, number>>>()
    for (const r of allPrices) {
      if (r.date < startDate) continue
      if (!scopeMarketIds.has(r.marketId)) continue
      if (!selectedProductIds.includes(r.productId)) continue
      let byProduct = byDate.get(r.date)
      if (!byProduct) {
        byProduct = new Map()
        byDate.set(r.date, byProduct)
      }
      let byMarket = byProduct.get(r.productId)
      if (!byMarket) {
        byMarket = new Map()
        byProduct.set(r.productId, byMarket)
      }
      byMarket.set(r.marketId, r.price)
    }
    const sortedDates = [...byDate.keys()].sort()
    dates.push(...sortedDates)

    // 某产品某日在口径市场内的均价;单市场时天然退化为该市场价
    const avgOf = (perMarket: Map<string, number> | undefined) => {
      if (!perMarket) return null
      let sum = 0
      let n = 0
      for (const id of scopeMarketIds) {
        const v = perMarket.get(id)
        if (v !== undefined) {
          sum += v
          n++
        }
      }
      return n > 0 ? sum / n : null
    }

    for (const p of selectedProducts) {
      const prodValues = sortedDates.map((d) => avgOf(byDate.get(d)?.get(p.id)))
      const nums = prodValues.filter((v): v is number => v !== null)
      if (nums.length === 0) continue

      const first = nums[0]
      const last = nums[nums.length - 1]
      stats.push({
        product: p,
        values: prodValues,
        latest: last,
        max: Math.max(...nums),
        min: Math.min(...nums),
        avg: nums.reduce((s, v) => s + v, 0) / nums.length,
        changePct: ((last - first) / first) * 100,
      })

      if (isAllMarkets) {
        // 全国口径:每产品一条均价线
        series.push({
          name: seriesName(p.name, ALL_MARKETS_LABEL, selectedProducts.length, 1),
          values: prodValues,
        })
      } else {
        // 具体市场口径:每产品 × 每市场一条,全空的系列跳过
        for (const m of selectedMarkets) {
          const values = sortedDates.map(
            (d) => byDate.get(d)?.get(p.id)?.get(m.id) ?? null,
          )
          if (values.every((v) => v === null)) continue
          series.push({
            name: seriesName(
              p.name,
              m.city,
              selectedProducts.length,
              selectedMarkets.length,
            ),
            values,
          })
        }
      }
    }

    return { dates, stats, series }
  }, [
    allPrices,
    startDate,
    selectedMarketIds,
    selectedProductIds,
    selectedProducts,
    selectedMarkets,
    markets,
    isAllMarkets,
  ])

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-destructive">
        数据加载失败:{error}
      </div>
    )
  }

  // 跳到对比页:全国口径不传 markets(不是真实市场 id,对比页走默认)
  const compareHref =
    isAllMarkets || selectedMarketIds.length === 0
      ? `/compare?products=${selectedProductIds.join(",")}`
      : `/compare?products=${selectedProductIds.join(",")}&markets=${selectedMarketIds.join(",")}`
  const scopeText = isAllMarkets
    ? ALL_MARKETS_LABEL
    : selectedMarkets.map((m) => m.city).join("、")
  const statCaption = isAllMarkets
    ? `按全国 ${markets.length} 个市场的每日期均价统计`
    : `按所选 ${selectedMarkets.length} 个市场的每日期均价统计`

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">趋势分析</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          对比所选市场内不同农产品的价格走势
          {availableDays > 0 ? `(当前数据覆盖最近 ${availableDays} 天)` : ""}
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
            selectedMarketIds={selectedMarketIds}
            rangeDays={rangeDays}
            availableDays={availableDays}
            onProductToggle={toggleProduct}
            onMarketToggle={toggleMarket}
            onRangeChange={setRangeDays}
          />

          {series.length > 0 && dates.length > 0 ? (
            <>
              <StatCards data={stats} caption={statCaption} />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    价格走势
                    <Link
                      to={compareHref}
                      title="在价格对比页按所选市场横向比价"
                      className="inline-flex items-center gap-0.5 text-sm font-normal text-muted-foreground transition-colors hover:text-foreground"
                    >
                      价格对比
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    {scopeText} · {dates[0]} ~ {dates[dates.length - 1]} ·
                    单位:元/公斤
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TrendChart dates={dates} series={series} />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                请至少选择 1 个产品和 1 个市场
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

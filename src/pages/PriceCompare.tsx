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
import ProductMarketPicker from "@/components/compare/ProductMarketPicker"
import CompareChart, { type CompareDatum } from "@/components/compare/CompareChart"
import CompareTable from "@/components/compare/CompareTable"

const DEFAULT_PRODUCTS = ["pork", "egg", "cabbage"]
const DEFAULT_MARKETS = [
  "bj_xinfadi",
  "sh_jiangqiao",
  "gz_jiangnan",
  "cd_sanlian",
  "xa_xinqiao",
]

export default function PriceCompare() {
  const [products, setProducts] = useState<Product[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [allPrices, setAllPrices] = useState<PriceRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [selectedProductIds, setSelectedProductIds] =
    useState<string[]>(DEFAULT_PRODUCTS)
  const [selectedMarketIds, setSelectedMarketIds] =
    useState<string[]>(DEFAULT_MARKETS)
  const [date, setDate] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([getProducts(), getMarkets(), getPrices()])
      .then(([ps, ms, prices]) => {
        if (cancelled) return
        setProducts(ps)
        setMarkets(ms)
        setAllPrices(prices)
        // 默认展示最新一天
        setDate(prices.reduce((a, r) => (r.date > a ? r.date : a), prices[0].date))
      })
      .catch((e) => setError(e instanceof Error ? e.message : "数据加载失败"))
    return () => {
      cancelled = true
    }
  }, [])

  const [searchParams] = useSearchParams()

  // 首页搜索市场时,按 URL 参数初始化选中市场
  useEffect(() => {
    if (markets.length === 0) return
    const marketId = searchParams.get("market")
    if (marketId && markets.some((m) => m.id === marketId)) {
      setSelectedMarketIds([marketId])
    }
  }, [markets, searchParams])

  // 数据日期范围,限制日期选择器
  const [minDate, maxDate] = useMemo(() => {
    if (!allPrices) return ["", ""]
    let min = allPrices[0].date
    let max = min
    for (const r of allPrices) {
      if (r.date < min) min = r.date
      if (r.date > max) max = r.date
    }
    return [min, max]
  }, [allPrices])

  const toggleProduct = (id: string) =>
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  const toggleMarket = (id: string) =>
    setSelectedMarketIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )

  // 保持选择顺序,图表系列与表格列按此排序
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
        .map((id) => markets.find((m) => m.id === id))
        .filter((m): m is Market => m !== undefined),
    [selectedMarketIds, markets],
  )

  // 选中日期的价格:marketId -> productId -> price
  const priceMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    if (!allPrices || !date) return map
    for (const r of allPrices) {
      if (r.date !== date) continue
      if (!selectedProductIds.includes(r.productId)) continue
      if (!selectedMarketIds.includes(r.marketId)) continue
      let m = map.get(r.marketId)
      if (!m) {
        m = new Map()
        map.set(r.marketId, m)
      }
      m.set(r.productId, r.price)
    }
    return map
  }, [allPrices, date, selectedProductIds, selectedMarketIds])

  const compareData = useMemo<CompareDatum[]>(
    () =>
      selectedMarkets.map((m) => ({
        market: m,
        prices: selectedProducts.map((p) => ({
          product: p,
          price: priceMap.get(m.id)?.get(p.id) ?? null,
        })),
      })),
    [selectedMarkets, selectedProducts, priceMap],
  )

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
        <h1 className="text-2xl font-bold">价格对比</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          对比不同市场同一日期的农产品价格
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
          <ProductMarketPicker
            products={products}
            markets={markets}
            selectedProductIds={selectedProductIds}
            selectedMarketIds={selectedMarketIds}
            date={date}
            minDate={minDate}
            maxDate={maxDate}
            onProductToggle={toggleProduct}
            onMarketToggle={toggleMarket}
            onDateChange={setDate}
          />

          {selectedProducts.length > 0 && selectedMarkets.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>各市场价格柱状对比</CardTitle>
                  <CardDescription>{date} · 单位:元/公斤</CardDescription>
                </CardHeader>
                <CardContent>
                  <CompareChart data={compareData} products={selectedProducts} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>价格明细</CardTitle>
                  <CardDescription>
                    绿色为当日最低价,红色为当日最高价
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CompareTable data={compareData} products={selectedProducts} />
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

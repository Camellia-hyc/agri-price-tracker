import { useEffect, useMemo, useState } from "react"
import { getMarkets, getPrices, getProducts } from "@/services/api"
import type { Product } from "@/types/product"
import type { Market } from "@/types/market"
import type { PriceRecord } from "@/types/price"
import { Card, CardContent } from "@/components/ui/card"
import SearchBar from "@/components/home/SearchBar"
import CategoryGrid from "@/components/home/CategoryGrid"
import MoverList, { type MoverRow } from "@/components/home/MoverList"

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [allPrices, setAllPrices] = useState<PriceRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  // 异动榜:最新两日的全市场均价涨跌
  const { gainers, losers } = useMemo(() => {
    const empty = { gainers: [] as MoverRow[], losers: [] as MoverRow[] }
    if (!allPrices || allPrices.length === 0 || products.length === 0) return empty

    // date -> productId -> prices
    const byDate = new Map<string, Map<string, number[]>>()
    for (const r of allPrices) {
      let m = byDate.get(r.date)
      if (!m) {
        m = new Map()
        byDate.set(r.date, m)
      }
      let arr = m.get(r.productId)
      if (!arr) {
        arr = []
        m.set(r.productId, arr)
      }
      arr.push(r.price)
    }
    const dates = [...byDate.keys()].sort()
    const last = dates[dates.length - 1]
    const prev = dates[dates.length - 2]
    if (!last || !prev) return empty

    const avg = (prices: number[] | undefined) =>
      prices && prices.length > 0
        ? prices.reduce((s, v) => s + v, 0) / prices.length
        : null

    const rows: MoverRow[] = []
    for (const p of products) {
      const today = avg(byDate.get(last)?.get(p.id))
      const yesterday = avg(byDate.get(prev)?.get(p.id))
      if (today === null || yesterday === null) continue
      rows.push({
        product: p,
        latest: today,
        changePct: ((today - yesterday) / yesterday) * 100,
      })
    }
    rows.sort((a, b) => b.changePct - a.changePct)
    return {
      gainers: rows.filter((r) => r.changePct > 0).slice(0, 5),
      // rows 降序,取负数部分再反转 → 跌幅最大在前
      losers: rows
        .filter((r) => r.changePct < 0)
        .reverse()
        .slice(0, 5),
    }
  }, [allPrices, products])

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-destructive">
        数据加载失败:{error}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <section className="space-y-4 py-4 text-center">
        <h1 className="text-3xl font-bold">农价通</h1>
        <p className="text-sm text-muted-foreground">
          全国主要批发市场农产品价格对比与趋势分析
        </p>
        <div className="mx-auto max-w-xl">
          <SearchBar products={products} markets={markets} />
        </div>
      </section>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            数据加载中…
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">按分类浏览</h2>
            <CategoryGrid products={products} />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">价格异动</h2>
            <MoverList gainers={gainers} losers={losers} />
          </section>
        </>
      )}
    </div>
  )
}

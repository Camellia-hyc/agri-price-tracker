import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowDown, ArrowUp, ChevronsUpDown, TrendingUp } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { TREND_MAX_MARKETS } from "@/lib/marketScope"
import type { Product } from "@/types/product"
import type { CompareDatum } from "./CompareChart"

interface CompareTableProps {
  data: CompareDatum[]
  products: Product[]
}

type SortDir = "asc" | "desc"

export default function CompareTable({ data, products }: CompareTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  // 取消勾选品种后,排序键自动失效(派生即可,不用 effect)
  const activeKey =
    sortKey && products.some((p) => p.id === sortKey) ? sortKey : null

  // 行序:按所选品种列的价格排序。必须复制后排序——
  // data 是 PriceCompare 的 memo 数组,原地 sort 会污染父缓存(图表 x 轴顺序会被改掉)
  const rows = useMemo(() => {
    if (!activeKey) return data
    const dir = sortDir === "asc" ? 1 : -1
    const priceOf = (d: CompareDatum) =>
      d.prices.find((x) => x.product.id === activeKey)?.price ?? null
    return [...data].sort((a, b) => {
      const pa = priceOf(a)
      const pb = priceOf(b)
      if (pa === null && pb === null) return 0
      if (pa === null) return 1 // 无数据恒排最后,与方向无关
      if (pb === null) return -1
      return (pa - pb) * dir
    })
  }, [data, activeKey, sortDir])

  const toggleSort = (productId: string) => {
    if (activeKey === productId) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(productId)
      setSortDir("asc") // 首次点击升序:直接看见最便宜的市场
    }
  }

  // 趋势页可视化的市场:按当前选择顺序截断到趋势页上限,URL 里写的就是落地后看到的
  const trendMarketIds = data
    .slice(0, TREND_MAX_MARKETS)
    .map((d) => d.market.id)
    .join(",")

  const ariaSort = (id: string): "ascending" | "descending" | "none" =>
    activeKey === id ? (sortDir === "asc" ? "ascending" : "descending") : "none"

  const sortTitle = (p: Product) =>
    activeKey === p.id
      ? `按${p.name}价格${sortDir === "asc" ? "降序" : "升序"}排列`
      : `按${p.name}价格排序(升序,最便宜在前)`

  // 每列的最低价/最高价,用于标色
  const colMinMax = useMemo(
    () =>
      products.map((p) => {
        const prices = data.map(
          (d) => d.prices.find((x) => x.product.id === p.id)?.price ?? 0,
        )
        return {
          min: Math.min(...prices),
          max: Math.max(...prices),
        }
      }),
    [data, products],
  )

  const colAvg = useMemo(
    () =>
      products.map((p) => {
        const prices = data.map(
          (d) => d.prices.find((x) => x.product.id === p.id)?.price ?? 0,
        )
        return prices.reduce((s, v) => s + v, 0) / prices.length
      }),
    [data, products],
  )

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>市场</TableHead>
          {products.map((p) => (
            <TableHead key={p.id} className="text-right" aria-sort={ariaSort(p.id)}>
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => toggleSort(p.id)}
                  title={sortTitle(p)}
                  className="inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {p.name}
                  {activeKey === p.id ? (
                    sortDir === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )
                  ) : (
                    <ChevronsUpDown className="h-3 w-3 opacity-40" />
                  )}
                </button>
                <Link
                  to={`/trend?products=${p.id}&markets=${trendMarketIds}`}
                  aria-label={`在趋势页查看${p.name}的价格走势`}
                  title={`在趋势页查看${p.name}的价格走势`}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                </Link>
              </div>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((d) => (
          <TableRow key={d.market.id}>
            {/* 城市为主(与筛选 chip 一致),市场全名次行:窄屏不再挤占价格列 */}
            <TableCell className="min-w-24 max-w-32 sm:max-w-none">
              <div className="whitespace-nowrap font-medium">{d.market.city}</div>
              <div
                className="truncate text-xs font-normal text-muted-foreground"
                title={`${d.market.name} · ${d.market.region}`}
              >
                {d.market.name} · {d.market.region}
              </div>
            </TableCell>
            {d.prices.map((x, i) => {
              const { min, max } = colMinMax[i]
              const highlight = min !== max && x.price !== null
              const isMin = highlight && x.price === min
              const isMax = highlight && x.price === max
              return (
                <TableCell key={x.product.id} className="text-right">
                  {x.price === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span
                      className={cn(
                        "inline-block min-w-[3.75rem] rounded-md px-2 py-0.5 tabular-nums",
                        isMin && "bg-fall/10 font-semibold text-fall",
                        isMax && "bg-rise/10 font-semibold text-rise",
                        !isMin && !isMax && "px-2",
                      )}
                    >
                      {x.price.toFixed(2)}
                    </span>
                  )}
                </TableCell>
              )
            })}
          </TableRow>
        ))}
      </TableBody>
      <TableFooter className="bg-muted/60">
        <TableRow>
          <TableCell className="whitespace-nowrap font-semibold">
            均价
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              (所选市场)
            </span>
          </TableCell>
          {colAvg.map((avg, i) => (
            <TableCell
              key={products[i].id}
              className="text-right font-semibold tabular-nums"
            >
              {avg.toFixed(2)}
            </TableCell>
          ))}
        </TableRow>
      </TableFooter>
    </Table>
  )
}

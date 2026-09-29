import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
// BarSeriesOption 与 EChartsOption 必须同源导入,否则 5.6 的 zrender 类型声明冲突
import type { BarSeriesOption, EChartsOption } from "echarts"
import EChart from "@/components/charts/EChart"
import { CHART_COLORS } from "@/lib/chartColors"
import type { Product } from "@/types/product"
import type { Market } from "@/types/market"

export interface CompareDatum {
  market: Market
  prices: { product: Product; price: number | null }[]
}

interface CompareChartProps {
  data: CompareDatum[]
  products: Product[]
}

/** 以产品在所选市场集的均价为基准归一化(均价=100,与表格 footer 同口径);无数据或基准为 0 时原样返回 */
function normalizeByAvg(values: (number | null)[]): (number | null)[] {
  const nums = values.filter((v): v is number => v !== null)
  if (nums.length === 0) return values
  const base = nums.reduce((s, v) => s + v, 0) / nums.length
  if (!base) return values
  return values.map((v) => (v === null ? null : (v / base) * 100))
}

export default function CompareChart({ data, products }: CompareChartProps) {
  const [normalized, setNormalized] = useState(false)

  const shown = useMemo(
    () =>
      products.map((p) => {
        const values = data.map(
          (d) => d.prices.find((x) => x.product.id === p.id)?.price ?? null,
        )
        return {
          name: p.name,
          values: normalized ? normalizeByAvg(values) : values,
        }
      }),
    [data, products, normalized],
  )

  const option = useMemo<EChartsOption>(
    () => ({
      color: CHART_COLORS,
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (v) =>
          v === null || v === undefined
            ? "—"
            : normalized
              ? Number(v).toFixed(1)
              : `${Number(v).toFixed(2)} 元/公斤`,
      },
      legend: { data: shown.map((s) => s.name) },
      grid: { left: 8, right: 16, bottom: 8, top: 44, containLabel: true },
      xAxis: {
        type: "category",
        data: data.map((d) => d.market.city),
        axisTick: { alignWithLabel: true },
      },
      // 柱长编码"从 0 起的量",两种模式都不加 scale,避免把最小柱压成 0 高
      yAxis: {
        type: "value",
        name: normalized ? "指数(均价=100)" : "元/公斤",
      },
      series: shown.map((s): BarSeriesOption => ({
        name: s.name,
        type: "bar",
        data: s.values,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 36,
      })),
    }),
    [data, shown, normalized],
  )

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant={normalized ? "default" : "outline"}
          aria-pressed={normalized}
          onClick={() => setNormalized((n) => !n)}
          title="以各品种在所选市场的均价为 100 展示高低指数,不影响真实价格口径"
          className="h-7 px-2.5 text-xs"
        >
          归一化 均价=100
        </Button>
      </div>
      <EChart option={option} height={380} />
    </div>
  )
}

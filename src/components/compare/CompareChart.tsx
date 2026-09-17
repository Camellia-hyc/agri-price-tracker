import { useMemo } from "react"
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

export default function CompareChart({ data, products }: CompareChartProps) {
  const option = useMemo<EChartsOption>(
    () => ({
      color: CHART_COLORS,
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (v) => `${v} 元/公斤`,
      },
      legend: { data: products.map((p) => p.name) },
      grid: { left: 8, right: 16, bottom: 8, top: 44, containLabel: true },
      xAxis: {
        type: "category",
        data: data.map((d) => d.market.city),
        axisTick: { alignWithLabel: true },
      },
      yAxis: { type: "value", name: "元/公斤" },
      series: products.map((p): BarSeriesOption => ({
        name: p.name,
        type: "bar",
        data: data.map(
          (d) =>
            d.prices.find((x) => x.product.id === p.id)?.price ?? null,
        ),
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 36,
      })),
    }),
    [data, products],
  )

  return <EChart option={option} height={380} />
}

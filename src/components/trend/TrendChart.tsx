import { useMemo } from "react"
// LineSeriesOption 与 EChartsOption 必须同源导入,否则 5.6 的 zrender 类型声明冲突
import type { EChartsOption, LineSeriesOption } from "echarts"
import EChart from "@/components/charts/EChart"
import { CHART_COLORS } from "@/lib/chartColors"

export interface TrendSeries {
  /** 系列名(如"猪肉" / "北京" / "猪肉 · 北京"),由页面侧经 seriesName() 生成 */
  name: string
  values: (number | null)[]
}

interface TrendChartProps {
  dates: string[]
  series: TrendSeries[]
}

export default function TrendChart({ dates, series }: TrendChartProps) {
  const option = useMemo<EChartsOption>(
    () => ({
      color: CHART_COLORS,
      tooltip: {
        trigger: "axis",
        valueFormatter: (v) =>
          v === null || v === undefined ? "—" : `${Number(v).toFixed(2)} 元/公斤`,
      },
      legend: { data: series.map((s) => s.name) },
      grid: { left: 8, right: 16, bottom: 8, top: 44, containLabel: true },
      xAxis: { type: "category", data: dates, boundaryGap: false },
      yAxis: {
        type: "value",
        name: "元/公斤",
        // 不从 0 起,让走势形状更清晰(各产品绝对值差异大)
        scale: true,
      },
      series: series.map((s): LineSeriesOption => ({
        name: s.name,
        type: "line",
        smooth: true,
        showSymbol: false,
        data: s.values,
        lineStyle: { width: 2 },
      })),
    }),
    [dates, series],
  )

  return <EChart option={option} height={380} />
}

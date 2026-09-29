import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
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

/** 以每个系列首个非空值为基准归一化(首日=100);全空或基准为 0 时原样返回 */
function normalizeByFirst(values: (number | null)[]): (number | null)[] {
  const base = values.find((v): v is number => v !== null)
  if (!base) return values
  return values.map((v) => (v === null ? null : (v / base) * 100))
}

export default function TrendChart({ dates, series }: TrendChartProps) {
  const [normalized, setNormalized] = useState(false)

  const shown = useMemo(
    () =>
      normalized
        ? series.map((s) => ({
            name: s.name,
            values: normalizeByFirst(s.values),
          }))
        : series,
    [series, normalized],
  )

  const option = useMemo<EChartsOption>(
    () => ({
      color: CHART_COLORS,
      tooltip: {
        trigger: "axis",
        valueFormatter: (v) =>
          v === null || v === undefined
            ? "—"
            : normalized
              ? Number(v).toFixed(1)
              : `${Number(v).toFixed(2)} 元/公斤`,
      },
      legend: { data: shown.map((s) => s.name) },
      grid: { left: 8, right: 16, bottom: 8, top: 44, containLabel: true },
      xAxis: { type: "category", data: dates, boundaryGap: false },
      yAxis: {
        type: "value",
        name: normalized ? "指数(首日=100)" : "元/公斤",
        // 不从 0 起:各产品绝对值差异大,归一化后指数约 61~118,0 基轴同样会压扁走势
        scale: true,
      },
      series: shown.map((s): LineSeriesOption => ({
        name: s.name,
        type: "line",
        smooth: true,
        showSymbol: false,
        data: s.values,
        lineStyle: { width: 2 },
      })),
    }),
    [dates, shown, normalized],
  )

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant={normalized ? "default" : "outline"}
          aria-pressed={normalized}
          onClick={() => setNormalized((n) => !n)}
          title="以各线首日价格为 100 展示涨跌幅度,不影响真实价格口径"
          className="h-7 px-2.5 text-xs"
        >
          归一化 首日=100
        </Button>
      </div>
      <EChart option={option} height={380} />
    </div>
  )
}

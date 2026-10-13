import { useMemo, useState } from "react"
// LineSeriesOption 与 EChartsOption 必须同源导入,否则 5.6 的 zrender 类型声明冲突
import type { EChartsOption, LineSeriesOption } from "echarts"
import EChart from "@/components/charts/EChart"
import ChartModeSwitch from "@/components/shared/ChartModeSwitch"
import { CHART_COLORS, LINE_STYLES } from "@/lib/chartColors"

export interface TrendSeries {
  /** 系列名(如"猪肉" / "北京" / "猪肉 · 北京"),由页面侧经 seriesName() 生成 */
  name: string
  values: (number | null)[]
  /** 色相槽位(产品序号):颜色跟随产品实体,筛选变化不重排 */
  colorIndex?: number
  /** 线型槽位(市场序号):多市场时以线型区分,避免颜色循环 */
  dashIndex?: number
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

  const option = useMemo<EChartsOption>(() => {
    const shownSeries = series.map((s, i) => ({
      name: s.name,
      values: normalized ? normalizeByFirst(s.values) : s.values,
      color: CHART_COLORS[(s.colorIndex ?? i) % CHART_COLORS.length],
      lineType: LINE_STYLES[(s.dashIndex ?? 0) % LINE_STYLES.length],
    }))
    return {
      tooltip: {
        trigger: "axis",
        // 十字准星:多点折线用竖线定位更利落
        axisPointer: {
          type: "line",
          lineStyle: { color: "#b9c3bb", width: 1 },
        },
        valueFormatter: (v) =>
          v === null || v === undefined
            ? "—"
            : normalized
              ? Number(v).toFixed(1)
              : `${Number(v).toFixed(2)} 元/公斤`,
      },
      // 单系列不需要图例;9 条线时图例折行,给图例多留一行的高度
      legend: {
        show: shownSeries.length > 1,
        data: shownSeries.map((s) => s.name),
      },
      grid: {
        left: 8,
        right: 16,
        bottom: 8,
        top: shownSeries.length > 4 ? 72 : 48,
        containLabel: true,
      },
      xAxis: { type: "category", data: dates, boundaryGap: false },
      yAxis: {
        type: "value",
        name: normalized ? "指数(首日=100)" : "元/公斤",
        // 不从 0 起:各产品绝对值差异大,归一化后指数约 61~118,0 基轴同样会压扁走势
        scale: true,
      },
      series: shownSeries.map(
        (s): LineSeriesOption => ({
          name: s.name,
          type: "line",
          smooth: true,
          showSymbol: false,
          data: s.values,
          itemStyle: { color: s.color },
          lineStyle: { color: s.color, type: s.lineType },
          // 悬停重点:加粗 + 其它线淡出
          emphasis: { focus: "series", lineStyle: { width: 3 } },
        }),
      ),
    }
  }, [dates, series, normalized])

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ChartModeSwitch
          value={normalized ? "index" : "price"}
          onChange={(v) => setNormalized(v === "index")}
          options={[
            {
              value: "price",
              label: "真实价格",
              title: "按元/公斤展示真实价格",
            },
            {
              value: "index",
              label: "指数对比",
              title:
                "以各线首日价格为 100 展示涨跌幅度,适合不同价位的品种比走势",
            },
          ]}
        />
      </div>
      <EChart option={option} height={380} />
    </div>
  )
}

import { useMemo, useState } from "react"
import { TriangleAlert } from "lucide-react"
// BarSeriesOption 与 EChartsOption 必须同源导入,否则 5.6 的 zrender 类型声明冲突
import type { BarSeriesOption, EChartsOption } from "echarts"
import EChart from "@/components/charts/EChart"
import ChartModeSwitch from "@/components/shared/ChartModeSwitch"
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

  // 品种间均价的最大倍数差;≥4 倍时默认柱高不可比,提示切换指数
  const magnitude = useMemo(() => {
    const means = products
      .map((p) => {
        const nums = data
          .map((d) => d.prices.find((x) => x.product.id === p.id)?.price)
          .filter((v): v is number => v !== null && v !== undefined)
        return nums.length > 0
          ? nums.reduce((s, v) => s + v, 0) / nums.length
          : null
      })
      .filter((v): v is number => v !== null)
    if (means.length < 2) return null
    const max = Math.max(...means)
    const min = Math.min(...means)
    return min > 0 && max / min >= 4 ? max / min : null
  }, [data, products])

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
      // 单系列不需要图例(标题已说明),≥2 条才出现
      legend: { show: shown.length > 1, data: shown.map((s) => s.name) },
      grid: { left: 8, right: 16, bottom: 8, top: 48, containLabel: true },
      xAxis: {
        type: "category",
        data: data.map((d) => d.market.city),
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
        // 柱不超过 24px,给 band 留呼吸;圆角在主题里已统一
        barMaxWidth: 24,
      })),
    }),
    [data, shown, normalized],
  )

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
              title: "以各品种在所选市场的均价为 100 展示高低指数,不影响真实价格口径",
            },
          ]}
        />
      </div>

      {/* 量级差过大时,低价品种的柱子几乎不可见 —— 主动提示并一键切换 */}
      {magnitude !== null && !normalized && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-[#eda100]/30 bg-[#eda100]/10 px-3 py-2 text-xs">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-[#a16207]" />
          <span className="text-muted-foreground">
            所选品种价格量级相差约 {magnitude.toFixed(0)} 倍,低价品种的柱子会显得很矮
          </span>
          <button
            type="button"
            onClick={() => setNormalized(true)}
            className="font-medium text-primary hover:underline"
          >
            改用指数对比
          </button>
        </div>
      )}

      <EChart option={option} height={380} />
    </div>
  )
}

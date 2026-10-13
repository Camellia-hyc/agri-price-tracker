import { useMemo } from "react"
import { cn } from "@/lib/utils"

interface SparklineProps {
  values: (number | null)[]
  /** 末端点点缀色(涨跌方向,如 "bg-rise" / "bg-fall") */
  accentClassName?: string
  /** 折线颜色,默认弱化的墨色 */
  strokeClassName?: string
  height?: number
  className?: string
}

const VW = 100
const VH = 32
const PAD = 4

/** 迷你走势线:弱化折线 + 方向色端点(文字始终由旁边标签承担) */
export default function Sparkline({
  values,
  accentClassName = "bg-muted-foreground",
  strokeClassName = "stroke-muted-foreground/40",
  height = 36,
  className,
}: SparklineProps) {
  const { d, last } = useMemo(() => {
    const nums = values.filter((v): v is number => v !== null)
    if (nums.length < 2 || values.length < 2)
      return { d: "", last: null as { x: number; y: number } | null }
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    const span = max - min || 1
    const pts: { x: number; y: number }[] = []
    values.forEach((v, i) => {
      if (v === null) return
      pts.push({
        x: (i / (values.length - 1)) * VW,
        y: VH - PAD - ((v - min) / span) * (VH - PAD * 2),
      })
    })
    return {
      d: pts
        .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
        .join(" "),
      last: pts[pts.length - 1],
    }
  }, [values])

  if (!d || !last) return <div className={className} style={{ height }} />

  return (
    <div className={cn("relative w-full", className)} style={{ height }}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full overflow-visible"
        aria-hidden="true"
      >
        <path
          d={d}
          fill="none"
          strokeWidth={1.75}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={strokeClassName}
        />
      </svg>
      {/* 端点:当前值的方向色 + 2px 表面色圆环(卡片上为白) */}
      <span
        className={cn(
          "absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card",
          accentClassName,
        )}
        style={{ left: `${last.x}%`, top: `${(last.y / VH) * 100}%` }}
      />
    </div>
  )
}

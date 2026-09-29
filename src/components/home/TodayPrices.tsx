import { useNavigate } from "react-router-dom"
import { Minus, TrendingDown, TrendingUp } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { MoverRow } from "./MoverList"

interface TodayPricesProps {
  /** 已按展示顺序排好的热门品种行(缺数据的品种由上层过滤掉) */
  rows: MoverRow[]
  /** 最新数据日,YYYY-MM-DD;空串表示未知 */
  lastDate: string
  /** 均价覆盖的市场数(0 表示数据未就绪) */
  marketCount: number
  loading: boolean
  error: string | null
}

/** 首页"今日行情":让首屏直接回答"现在多少钱" */
export default function TodayPrices({
  rows,
  lastDate,
  marketCount,
  loading,
  error,
}: TodayPricesProps) {
  return (
    <Card>
      <CardHeader>
        {/* 日期并入标题行:CardHeader 是 flex-col,不能直接塞第二个子节点 */}
        <CardTitle className="flex items-baseline justify-between text-base">
          <span>今日行情</span>
          {lastDate && (
            <span className="text-xs font-normal text-muted-foreground">
              {lastDate} 更新
            </span>
          )}
        </CardTitle>
        <CardDescription>
          {marketCount > 0 ? `${marketCount} 个市场均价` : "全市场均价"} ·
          环比前一日 · 单位:元/公斤
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-muted-foreground">
            今日行情暂不可用,详情见下方价格异动区
          </p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">价格数据加载中…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无行情数据</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3 lg:grid-cols-5">
            {rows.map((row) => (
              <PriceCell key={row.product.id} row={row} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PriceCell({ row }: { row: MoverRow }) {
  const navigate = useNavigate()
  const up = row.changePct > 0
  const down = row.changePct < 0
  return (
    <button
      type="button"
      aria-label={`查看${row.product.name}价格走势`}
      onClick={() => navigate(`/trend?product=${row.product.id}`)}
      className="flex w-full flex-col gap-0.5 rounded-md border border-border/60 px-3 py-2 text-left transition-colors hover:bg-accent"
    >
      <span className="truncate text-sm font-medium">{row.product.name}</span>
      <span className="text-lg font-bold tabular-nums">
        {row.latest.toFixed(2)}
      </span>
      {/* 国内行情习惯:红涨绿跌(与 MoverList 一致) */}
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
          up && "text-destructive",
          down && "text-primary",
          !up && !down && "text-muted-foreground",
        )}
      >
        {up ? (
          <TrendingUp className="h-3.5 w-3.5" />
        ) : down ? (
          <TrendingDown className="h-3.5 w-3.5" />
        ) : (
          <Minus className="h-3.5 w-3.5" />
        )}
        {up ? "+" : ""}
        {row.changePct.toFixed(1)}%
      </span>
    </button>
  )
}

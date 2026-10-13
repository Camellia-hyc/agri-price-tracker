import { useNavigate } from "react-router-dom"
import { TrendingDown, TrendingUp } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Product } from "@/types/product"

export interface MoverRow {
  product: Product
  /** 最新日全市场均价 */
  latest: number
  /** 较前一日的涨跌幅百分比 */
  changePct: number
}

interface MoverListProps {
  gainers: MoverRow[]
  losers: MoverRow[]
}

function Row({
  row,
  rank,
  maxAbs,
  tone,
}: {
  row: MoverRow
  rank: number
  /** 本榜最大涨跌幅绝对值,用于幅度条按比例 */
  maxAbs: number
  tone: "rise" | "fall"
}) {
  const navigate = useNavigate()
  const up = row.changePct > 0
  const width = maxAbs > 0 ? Math.max(8, (Math.abs(row.changePct) / maxAbs) * 100) : 0
  return (
    <button
      type="button"
      onClick={() => navigate(`/trend?product=${row.product.id}`)}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-accent/60"
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums",
          rank <= 3
            ? tone === "rise"
              ? "bg-rise/10 text-rise"
              : "bg-fall/10 text-fall"
            : "text-muted-foreground",
        )}
      >
        {rank}
      </span>
      <span className="w-16 shrink-0 truncate font-medium">
        {row.product.name}
      </span>
      {/* 幅度条:轨道用同色浅档,一眼看出"涨得有多狠"(桌面显示) */}
      <span
        className={cn(
          "hidden h-1.5 min-w-0 flex-1 overflow-hidden rounded-full sm:block",
          up ? "bg-rise/10" : "bg-fall/10",
        )}
      >
        <span
          className={cn(
            "block h-full rounded-full",
            up ? "bg-rise/80" : "bg-fall/80",
          )}
          style={{ width: `${width}%` }}
        />
      </span>
      <span className="ml-auto text-xs tabular-nums text-muted-foreground sm:ml-0">
        {row.latest.toFixed(2)}
      </span>
      {/* 国内行情习惯:红涨绿跌 */}
      <span
        className={cn(
          "inline-flex w-16 shrink-0 items-center justify-end gap-0.5 font-semibold tabular-nums",
          up ? "text-rise" : "text-fall",
        )}
      >
        {up ? (
          <TrendingUp className="h-3.5 w-3.5" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5" />
        )}
        {up ? "+" : ""}
        {row.changePct.toFixed(1)}%
      </span>
    </button>
  )
}

export default function MoverList({ gainers, losers }: MoverListProps) {
  const maxGain = gainers.length > 0 ? Math.abs(gainers[0].changePct) : 0
  const maxLoss = losers.length > 0 ? Math.abs(losers[0].changePct) : 0
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base">
            <TrendingUp className="h-4 w-4 text-rise" />
            涨幅榜 Top5
          </CardTitle>
          <CardDescription>最新日较前一日,全市场均价</CardDescription>
        </CardHeader>
        <CardContent className="space-y-0.5 pt-0">
          {gainers.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              暂无上涨品种
            </div>
          ) : (
            gainers.map((r, i) => (
              <Row
                key={r.product.id}
                row={r}
                rank={i + 1}
                maxAbs={maxGain}
                tone="rise"
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base">
            <TrendingDown className="h-4 w-4 text-fall" />
            跌幅榜 Top5
          </CardTitle>
          <CardDescription>最新日较前一日,全市场均价</CardDescription>
        </CardHeader>
        <CardContent className="space-y-0.5 pt-0">
          {losers.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              暂无下跌品种
            </div>
          ) : (
            losers.map((r, i) => (
              <Row
                key={r.product.id}
                row={r}
                rank={i + 1}
                maxAbs={maxLoss}
                tone="fall"
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

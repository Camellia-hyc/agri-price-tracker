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

function Row({ row, rank }: { row: MoverRow; rank: number }) {
  const navigate = useNavigate()
  const up = row.changePct > 0
  return (
    <button
      type="button"
      onClick={() => navigate(`/trend?product=${row.product.id}`)}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
    >
      <span className="w-4 text-center text-xs text-muted-foreground">{rank}</span>
      <span className="flex-1 truncate font-medium">{row.product.name}</span>
      <span className="tabular-nums text-xs text-muted-foreground">
        {row.latest.toFixed(2)} 元/公斤
      </span>
      {/* 国内行情习惯:红涨绿跌 */}
      <span
        className={cn(
          "inline-flex w-16 items-center justify-end gap-0.5 font-medium tabular-nums",
          up ? "text-destructive" : "text-primary",
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
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base">
            <TrendingUp className="h-4 w-4 text-destructive" />
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
            gainers.map((r, i) => <Row key={r.product.id} row={r} rank={i + 1} />)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base">
            <TrendingDown className="h-4 w-4 text-primary" />
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
            losers.map((r, i) => <Row key={r.product.id} row={r} rank={i + 1} />)
          )}
        </CardContent>
      </Card>
    </div>
  )
}

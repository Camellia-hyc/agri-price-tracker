import { Minus, TrendingDown, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Product } from "@/types/product"

export interface StatCardData {
  product: Product
  values: (number | null)[]
  latest: number
  max: number
  min: number
  avg: number
  /** 区间涨跌幅百分比,如 3.2 / -1.5 */
  changePct: number
}

export default function StatCards({ data }: { data: StatCardData[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((d) => {
        const up = d.changePct > 0
        const down = d.changePct < 0
        return (
          <Card key={d.product.id}>
            <CardContent className="space-y-3 pt-6">
              <div className="flex items-center justify-between">
                <span className="font-medium">{d.product.name}</span>
                <span className="text-xs text-muted-foreground">
                  {d.product.category}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums">
                  {d.latest.toFixed(2)}
                </span>
                <span className="text-xs text-muted-foreground">元/公斤</span>
              </div>

              {/* 国内行情习惯:红涨绿跌 */}
              <div
                className={cn(
                  "inline-flex items-center gap-1 text-sm font-medium",
                  up && "text-destructive",
                  down && "text-primary",
                  !up && !down && "text-muted-foreground",
                )}
              >
                {up ? (
                  <TrendingUp className="h-4 w-4" />
                ) : down ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
                {up ? "+" : ""}
                {d.changePct.toFixed(1)}%
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  区间涨跌
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
                <div>
                  <div className="text-xs text-muted-foreground">最高</div>
                  <div className="mt-0.5 text-sm font-medium tabular-nums">
                    {d.max.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">最低</div>
                  <div className="mt-0.5 text-sm font-medium tabular-nums">
                    {d.min.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">均价</div>
                  <div className="mt-0.5 text-sm font-medium tabular-nums">
                    {d.avg.toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

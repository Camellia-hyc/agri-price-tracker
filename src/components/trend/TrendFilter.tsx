import { CalendarRange, Store } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Product } from "@/types/product"
import type { Market } from "@/types/market"
import ProductPicker from "@/components/shared/ProductPicker"
import { cn } from "@/lib/utils"

const MAX_PRODUCTS = 3

const RANGES = [
  { days: 7, label: "近7天" },
  { days: 30, label: "近30天" },
  { days: 90, label: "近90天" },
  { days: 365, label: "近1年" },
] as const

export type RangeDays = (typeof RANGES)[number]["days"]

interface TrendFilterProps {
  products: Product[]
  markets: Market[]
  selectedProductIds: string[]
  selectedMarketId: string
  rangeDays: RangeDays
  onProductToggle: (id: string) => void
  onMarketChange: (id: string) => void
  onRangeChange: (days: RangeDays) => void
}

export default function TrendFilter({
  products,
  markets,
  selectedProductIds,
  selectedMarketId,
  rangeDays,
  onProductToggle,
  onMarketChange,
  onRangeChange,
}: TrendFilterProps) {
  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <ProductPicker
          products={products}
          selectedIds={selectedProductIds}
          max={MAX_PRODUCTS}
          onToggle={onProductToggle}
        />

        {/* 市场单选 */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            <Store className="h-4 w-4 text-primary" />
            选择市场
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              单选
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {markets.map((m) => (
              <Button
                key={m.id}
                size="sm"
                variant={selectedMarketId === m.id ? "default" : "outline"}
                onClick={() => onMarketChange(m.id)}
                title={m.name}
                className="h-7 px-2.5 text-xs"
              >
                {m.city}
              </Button>
            ))}
          </div>
        </div>

        {/* 时间范围 */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            <CalendarRange className="h-4 w-4 text-primary" />
            时间范围
          </div>
          <div className="inline-flex rounded-md bg-muted p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => onRangeChange(r.days)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  rangeDays === r.days
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

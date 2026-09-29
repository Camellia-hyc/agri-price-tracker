import { CalendarRange, Store } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Product } from "@/types/product"
import type { Market } from "@/types/market"
import ProductPicker from "@/components/shared/ProductPicker"
import { cn } from "@/lib/utils"
import {
  ALL_MARKETS_ID,
  ALL_MARKETS_LABEL,
  TREND_MAX_MARKETS,
} from "@/lib/marketScope"

export const MAX_PRODUCTS = 3

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
  selectedMarketIds: string[]
  rangeDays: RangeDays
  /** 数据实际覆盖天数(0 = 价格数据未就绪,此时不置灰,避免加载期闪烁) */
  availableDays: number
  onProductToggle: (id: string) => void
  onMarketToggle: (id: string) => void
  onRangeChange: (days: RangeDays) => void
}

export default function TrendFilter({
  products,
  markets,
  selectedProductIds,
  selectedMarketIds,
  rangeDays,
  availableDays,
  onProductToggle,
  onMarketToggle,
  onRangeChange,
}: TrendFilterProps) {
  const allMarketsSelected = selectedMarketIds.includes(ALL_MARKETS_ID)

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <ProductPicker
          products={products}
          selectedIds={selectedProductIds}
          max={MAX_PRODUCTS}
          onToggle={onProductToggle}
        />

        {/* 市场多选:「全国均价」与真实城市互斥(页面侧保证),上限 3 */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            <Store className="h-4 w-4 text-primary" />
            选择市场
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {allMarketsSelected
                ? `覆盖 ${markets.length} 个市场`
                : `已选 ${selectedMarketIds.length}/${TREND_MAX_MARKETS}`}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={allMarketsSelected ? "default" : "outline"}
              aria-pressed={allMarketsSelected}
              onClick={() => onMarketToggle(ALL_MARKETS_ID)}
              title={`全部 ${markets.length} 个市场的每日期均价`}
              className="h-7 px-2.5 text-xs"
            >
              {ALL_MARKETS_LABEL}
            </Button>
            {markets.map((m) => {
              const selected = selectedMarketIds.includes(m.id)
              const disabled =
                !selected && selectedMarketIds.length >= TREND_MAX_MARKETS
              return (
                <Button
                  key={m.id}
                  size="sm"
                  variant={selected ? "default" : "outline"}
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => onMarketToggle(m.id)}
                  title={
                    disabled
                      ? `最多选择 ${TREND_MAX_MARKETS} 个市场,先取消一个再选`
                      : m.name
                  }
                  className="h-7 px-2.5 text-xs"
                >
                  {m.city}
                </Button>
              )
            })}
          </div>
        </div>

        {/* 时间范围:超出数据实际覆盖天数的档位置灰 */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            <CalendarRange className="h-4 w-4 text-primary" />
            时间范围
          </div>
          <div className="inline-flex rounded-md bg-muted p-0.5">
            {RANGES.map((r) => {
              const disabled = availableDays > 0 && r.days > availableDays
              return (
                <button
                  key={r.days}
                  onClick={() => onRangeChange(r.days)}
                  disabled={disabled}
                  title={disabled ? `数据仅覆盖最近 ${availableDays} 天` : undefined}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    rangeDays === r.days
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                    disabled &&
                      "cursor-not-allowed opacity-40 hover:text-muted-foreground",
                  )}
                >
                  {r.label}
                  {disabled && <span className="ml-1 opacity-80">数据不足</span>}
                </button>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

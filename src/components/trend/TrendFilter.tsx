import { CalendarRange, Store } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { Product } from "@/types/product"
import type { Market } from "@/types/market"
import ProductPicker from "@/components/shared/ProductPicker"
import PickerChip from "@/components/shared/PickerChip"
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

        <div className="border-t border-border/60 pt-5">
          {/* 市场多选:「全国均价」与真实城市互斥(页面侧保证),上限 3 */}
          <div className="mb-2.5 flex items-center gap-1.5 text-sm font-medium">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Store className="h-3.5 w-3.5" />
            </span>
            选择市场
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {allMarketsSelected
                ? `覆盖 ${markets.length} 个市场`
                : `已选 ${selectedMarketIds.length}/${TREND_MAX_MARKETS}`}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <PickerChip
              selected={allMarketsSelected}
              onClick={() => onMarketToggle(ALL_MARKETS_ID)}
              title={`全部 ${markets.length} 个市场的每日期均价`}
            >
              {ALL_MARKETS_LABEL}
            </PickerChip>
            {markets.map((m) => {
              const selected = selectedMarketIds.includes(m.id)
              const disabled =
                !selected && selectedMarketIds.length >= TREND_MAX_MARKETS
              return (
                <PickerChip
                  key={m.id}
                  selected={selected}
                  disabled={disabled}
                  onClick={() => onMarketToggle(m.id)}
                  title={
                    disabled
                      ? `最多选择 ${TREND_MAX_MARKETS} 个市场,先取消一个再选`
                      : m.name
                  }
                >
                  {m.city}
                </PickerChip>
              )
            })}
          </div>
        </div>

        <div className="border-t border-border/60 pt-5">
          {/* 时间范围:超出数据实际覆盖天数的档位置灰 */}
          <div className="mb-2.5 flex items-center gap-1.5 text-sm font-medium">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
              <CalendarRange className="h-3.5 w-3.5" />
            </span>
            时间范围
          </div>
          <div className="inline-flex rounded-lg border border-border/70 bg-muted/70 p-0.5">
            {RANGES.map((r) => {
              const disabled = availableDays > 0 && r.days > availableDays
              return (
                <button
                  key={r.days}
                  onClick={() => onRangeChange(r.days)}
                  disabled={disabled}
                  title={disabled ? `数据仅覆盖最近 ${availableDays} 天` : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                    rangeDays === r.days
                      ? "bg-card text-foreground shadow-sm"
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

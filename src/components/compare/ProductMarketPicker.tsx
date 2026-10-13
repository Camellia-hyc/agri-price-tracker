import { CalendarDays, Store } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { Product } from "@/types/product"
import type { Market } from "@/types/market"
import ProductPicker from "@/components/shared/ProductPicker"
import PickerChip from "@/components/shared/PickerChip"

// 导出供 URL 参数解析时截断使用
export const MAX_PRODUCTS = 3
export const MAX_MARKETS = 6

interface ProductMarketPickerProps {
  products: Product[]
  markets: Market[]
  selectedProductIds: string[]
  selectedMarketIds: string[]
  date: string
  minDate: string
  maxDate: string
  onProductToggle: (id: string) => void
  onMarketToggle: (id: string) => void
  onDateChange: (date: string) => void
}

function SectionLabel({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode
  title: string
  hint: string
}) {
  return (
    <div className="mb-2.5 flex items-center gap-1.5 text-sm font-medium">
      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      {title}
      <span className="ml-auto text-xs font-normal text-muted-foreground">
        {hint}
      </span>
    </div>
  )
}

export default function ProductMarketPicker({
  products,
  markets,
  selectedProductIds,
  selectedMarketIds,
  date,
  minDate,
  maxDate,
  onProductToggle,
  onMarketToggle,
  onDateChange,
}: ProductMarketPickerProps) {
  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        {/* 产品选择 */}
        <ProductPicker
          products={products}
          selectedIds={selectedProductIds}
          max={MAX_PRODUCTS}
          onToggle={onProductToggle}
        />

        <div className="border-t border-border/60 pt-5">
          {/* 市场选择 */}
          <SectionLabel
            icon={<Store className="h-3.5 w-3.5" />}
            title="选择市场"
            hint={`已选 ${selectedMarketIds.length}/${MAX_MARKETS}`}
          />
          <div className="flex flex-wrap gap-1.5">
            {markets.map((m) => {
              const selected = selectedMarketIds.includes(m.id)
              const disabled =
                !selected && selectedMarketIds.length >= MAX_MARKETS
              return (
                <PickerChip
                  key={m.id}
                  selected={selected}
                  disabled={disabled}
                  onClick={() => onMarketToggle(m.id)}
                  title={
                    disabled
                      ? `最多选择 ${MAX_MARKETS} 个市场,先取消一个再选`
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
          {/* 日期选择 */}
          <SectionLabel
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            title="价格日期"
            hint=""
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <input
              type="date"
              value={date}
              min={minDate}
              max={maxDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm shadow-sm transition-colors focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            />
            {minDate && maxDate && (
              <span className="text-xs text-muted-foreground">
                可选范围 {minDate} ~ {maxDate}(数据日)
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

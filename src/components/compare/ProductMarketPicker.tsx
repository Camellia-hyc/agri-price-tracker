import { CalendarDays, Store } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Product } from "@/types/product"
import type { Market } from "@/types/market"
import ProductPicker from "@/components/shared/ProductPicker"

const MAX_PRODUCTS = 3
const MAX_MARKETS = 6

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
  count,
  max,
}: {
  icon: React.ReactNode
  title: string
  count: number
  max: number
}) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
      {icon}
      {title}
      <span className="ml-auto text-xs font-normal text-muted-foreground">
        已选 {count}/{max}
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

        {/* 市场选择 */}
        <div>
          <SectionLabel
            icon={<Store className="h-4 w-4 text-primary" />}
            title="选择市场"
            count={selectedMarketIds.length}
            max={MAX_MARKETS}
          />
          <div className="flex flex-wrap gap-1.5">
            {markets.map((m) => {
              const selected = selectedMarketIds.includes(m.id)
              const disabled =
                !selected && selectedMarketIds.length >= MAX_MARKETS
              return (
                <Button
                  key={m.id}
                  size="sm"
                  variant={selected ? "default" : "outline"}
                  disabled={disabled}
                  onClick={() => onMarketToggle(m.id)}
                  title={m.name}
                  className="h-7 px-2.5 text-xs"
                >
                  {m.city}
                </Button>
              )
            })}
          </div>
        </div>

        {/* 日期选择 */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            <CalendarDays className="h-4 w-4 text-primary" />
            价格日期
          </div>
          <input
            type="date"
            value={date}
            min={minDate}
            max={maxDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </CardContent>
    </Card>
  )
}

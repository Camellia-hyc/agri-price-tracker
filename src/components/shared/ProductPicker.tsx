import { useState } from "react"
import { Apple } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PRODUCT_CATEGORIES, type Product } from "@/types/product"
import { cn } from "@/lib/utils"

interface ProductPickerProps {
  products: Product[]
  selectedIds: string[]
  max: number
  onToggle: (id: string) => void
}

// 分类 Tab + 产品 chips 多选,价格对比页与趋势页共用
export default function ProductPicker({
  products,
  selectedIds,
  max,
  onToggle,
}: ProductPickerProps) {
  const [category, setCategory] = useState<string>("全部")

  const visibleProducts =
    category === "全部"
      ? products
      : products.filter((p) => p.category === category)

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
        <Apple className="h-4 w-4 text-primary" />
        选择产品
        <span className="ml-auto text-xs font-normal text-muted-foreground">
          已选 {selectedIds.length}/{max}
        </span>
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {["全部", ...PRODUCT_CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              category === c
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visibleProducts.map((p) => {
          const selected = selectedIds.includes(p.id)
          // 达到上限后,未选中的产品不可再选
          const disabled = !selected && selectedIds.length >= max
          return (
            <Button
              key={p.id}
              size="sm"
              variant={selected ? "default" : "outline"}
              disabled={disabled}
              onClick={() => onToggle(p.id)}
              className="h-7 px-2.5 text-xs"
            >
              {p.name}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

import { useState } from "react"
import { Apple } from "lucide-react"
import { PRODUCT_CATEGORIES, type Product } from "@/types/product"
import { cn } from "@/lib/utils"
import PickerChip from "@/components/shared/PickerChip"

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
      <div className="mb-2.5 flex items-center gap-1.5 text-sm font-medium">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Apple className="h-3.5 w-3.5" />
        </span>
        选择产品
        <span className="ml-auto text-xs font-normal text-muted-foreground">
          已选 {selectedIds.length}/{max}
        </span>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {["全部", ...PRODUCT_CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              category === c
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/80 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
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
            <PickerChip
              key={p.id}
              selected={selected}
              disabled={disabled}
              onClick={() => onToggle(p.id)}
              title={disabled ? `最多选择 ${max} 个产品,先取消一个再选` : p.name}
            >
              {p.name}
            </PickerChip>
          )
        })}
      </div>
    </div>
  )
}

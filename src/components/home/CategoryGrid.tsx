import { Link } from "react-router-dom"
import {
  Apple,
  Carrot,
  ChevronRight,
  Drumstick,
  Fish,
  Wheat,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/types/product"
import type { Product } from "@/types/product"
import { cn } from "@/lib/utils"

/** 分类识别色:仅用于图标底(装饰),图表数据色不受影响 */
const CATEGORY_META: Record<
  ProductCategory,
  { icon: LucideIcon; chip: string }
> = {
  蔬菜: { icon: Carrot, chip: "bg-[#16a34a]/10 text-[#15803d]" },
  水果: { icon: Apple, chip: "bg-[#eb6834]/10 text-[#c2410c]" },
  粮油: { icon: Wheat, chip: "bg-[#eda100]/15 text-[#a16207]" },
  肉禽蛋: { icon: Drumstick, chip: "bg-[#e34948]/10 text-[#b91c1c]" },
  水产: { icon: Fish, chip: "bg-[#2563eb]/10 text-[#1d4ed8]" },
}

export default function CategoryGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {PRODUCT_CATEGORIES.map((c) => {
        const { icon: Icon, chip } = CATEGORY_META[c]
        const members = products.filter((p) => p.category === c)
        return (
          <Link key={c} to={`/trend?category=${encodeURIComponent(c)}`}>
            <Card className="group h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card-hover">
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      chip,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{c}</div>
                    <div className="text-xs text-muted-foreground">
                      {members.length} 种产品
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                {/* 列出分类成员,不再是五张一模一样的信息空卡 */}
                <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {members.map((p) => p.name).join("、")}
                </p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

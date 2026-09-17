import { Link } from "react-router-dom"
import {
  Apple,
  Carrot,
  Drumstick,
  Fish,
  Wheat,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/types/product"
import type { Product } from "@/types/product"

const CATEGORY_ICONS: Record<ProductCategory, LucideIcon> = {
  蔬菜: Carrot,
  水果: Apple,
  粮油: Wheat,
  肉禽蛋: Drumstick,
  水产: Fish,
}

export default function CategoryGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {PRODUCT_CATEGORIES.map((c) => {
        const Icon = CATEGORY_ICONS[c]
        const count = products.filter((p) => p.category === c).length
        return (
          <Link key={c} to={`/trend?category=${encodeURIComponent(c)}`}>
            <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium">{c}</div>
                  <div className="text-xs text-muted-foreground">{count} 种产品</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

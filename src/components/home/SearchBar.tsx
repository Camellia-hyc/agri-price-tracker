import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search } from "lucide-react"
import type { Product } from "@/types/product"
import type { Market } from "@/types/market"

const MAX_RESULTS = 5

interface SearchBarProps {
  products: Product[]
  markets: Market[]
}

export default function SearchBar({ products, markets }: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const { productHits, marketHits } = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return { productHits: [], marketHits: [] }
    return {
      productHits: products
        .filter((p) => p.name.toLowerCase().includes(q) || p.id.includes(q))
        .slice(0, MAX_RESULTS),
      marketHits: markets
        .filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.city.toLowerCase().includes(q) ||
            m.id.includes(q),
        )
        .slice(0, MAX_RESULTS),
    }
  }, [query, products, markets])

  const noMatch = productHits.length === 0 && marketHits.length === 0

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 shadow-sm focus-within:ring-1 focus-within:ring-ring">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          // 建议项用 onMouseDown 触发,先于 input 的 blur 完成跳转
          onBlur={() => setOpen(false)}
          placeholder="搜索产品或市场,如:猪肉、新发地"
          className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {open && query.trim() !== "" && (
        <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-80 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {noMatch ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              暂无匹配
            </div>
          ) : (
            <>
              {productHits.length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs text-muted-foreground">产品</div>
                  {productHits.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={() => navigate(`/trend?product=${p.id}`)}
                      className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                    >
                      <span>{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.category}</span>
                    </button>
                  ))}
                </>
              )}
              {marketHits.length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs text-muted-foreground">市场</div>
                  {marketHits.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onMouseDown={() => navigate(`/compare?market=${m.id}`)}
                      className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                    >
                      <span>{m.name}</span>
                      <span className="text-xs text-muted-foreground">{m.city}</span>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

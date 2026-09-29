import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import type { KeyboardEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Product } from "@/types/product"
import { PRODUCT_CATEGORIES } from "@/types/product"
import type { Market } from "@/types/market"

const MAX_RESULTS = 5
const MAX_ACTION_RESULTS = 2
/** 空框推荐的热门产品,与趋势页/对比页的默认选中保持一致 */
const HOT_PRODUCT_IDS = ["pork", "egg", "cabbage"]
const HOT_MARKET_COUNT = 3

interface ActionDef {
  keywords: string[]
  label: string
  sub: string
  /** "#xxx" 为首页锚点,其余为路由路径 */
  to: string
}

/** 功能快捷入口:让"对比""趋势"这类功能词可被搜索到 */
const ACTIONS: ActionDef[] = [
  { keywords: ["对比", "比价"], label: "价格对比", sub: "多市场比价", to: "/compare" },
  { keywords: ["趋势", "走势"], label: "趋势分析", sub: "价格走势图", to: "/trend" },
  { keywords: ["涨跌", "异动", "榜"], label: "价格异动榜", sub: "今日涨跌排行", to: "#movers" },
  { keywords: ["分类", "浏览"], label: "分类浏览", sub: "按类别查看", to: "#categories" },
]

type SuggestionKind = "action" | "product" | "market" | "category"

interface Suggestion {
  key: string
  kind: SuggestionKind
  group: string
  label: string
  sub?: string
  run: () => void
}

/** 前缀命中的排前面;JS sort 稳定,组内原顺序不变 */
function prefixFirst<T>(items: T[], text: (t: T) => string, q: string): T[] {
  return [...items].sort((a, b) => {
    const av = text(a).toLowerCase().startsWith(q) ? 0 : 1
    const bv = text(b).toLowerCase().startsWith(q) ? 0 : 1
    return av - bv
  })
}

interface SearchBarProps {
  products: Product[]
  markets: Market[]
  /** 首页内锚点跳转(目标区块的 id,如 "movers" / "categories") */
  onJumpTo: (anchor: string) => void
}

export default function SearchBar({
  products,
  markets,
  onJumpTo,
}: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const navigate = useNavigate()
  const listRef = useRef<HTMLDivElement>(null)

  const items = useMemo<Suggestion[]>(() => {
    const q = query.trim().toLowerCase()

    const action = (a: ActionDef): Suggestion => ({
      key: `action-${a.to}`,
      kind: "action",
      group: "功能",
      label: a.label,
      sub: a.sub,
      run: () =>
        a.to.startsWith("#") ? onJumpTo(a.to.slice(1)) : navigate(a.to),
    })
    const product = (p: Product): Suggestion => ({
      key: `product-${p.id}`,
      kind: "product",
      group: "产品",
      label: p.name,
      sub: p.category,
      run: () => navigate(`/trend?product=${p.id}`),
    })
    const market = (m: Market): Suggestion => ({
      key: `market-${m.id}`,
      kind: "market",
      group: "市场",
      label: m.name,
      sub: m.city,
      run: () => navigate(`/compare?market=${m.id}`),
    })
    const category = (c: string): Suggestion => ({
      key: `category-${c}`,
      kind: "category",
      group: "分类",
      label: c,
      sub: `${products.filter((p) => p.category === c).length} 种产品`,
      run: () => navigate(`/trend?category=${encodeURIComponent(c)}`),
    })

    // 空框:功能快捷入口 + 热门产品 + 热门市场
    if (!q) {
      const out = ACTIONS.map(action)
      for (const id of HOT_PRODUCT_IDS) {
        const p = products.find((x) => x.id === id)
        if (p) out.push(product(p))
      }
      for (const m of markets.slice(0, HOT_MARKET_COUNT)) out.push(market(m))
      return out
    }

    const out: Suggestion[] = []
    for (const a of ACTIONS.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.keywords.some((kw) => kw.includes(q)),
    ).slice(0, MAX_ACTION_RESULTS)) {
      out.push(action(a))
    }
    for (const p of prefixFirst(
      products.filter(
        (p) => p.name.toLowerCase().includes(q) || p.id.includes(q),
      ),
      (p) => p.name,
      q,
    ).slice(0, MAX_RESULTS)) {
      out.push(product(p))
    }
    for (const m of prefixFirst(
      markets.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.city.toLowerCase().includes(q) ||
          m.id.includes(q),
      ),
      (m) => m.name,
      q,
    ).slice(0, MAX_RESULTS)) {
      out.push(market(m))
    }
    for (const c of PRODUCT_CATEGORIES.filter((c) => c.includes(q))) {
      out.push(category(c))
    }
    return out
  }, [query, products, markets, navigate, onJumpTo])

  // 数据异步到达会改变列表长度,防止 activeIndex 越界
  useEffect(() => {
    if (activeIndex >= items.length) setActiveIndex(-1)
  }, [items.length, activeIndex])

  // 高亮项在面板内跟随滚动;不用 scrollIntoView,避免连带滚动整个页面
  useEffect(() => {
    const list = listRef.current
    if (!list || activeIndex < 0) return
    const el = list.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    if (!el) return
    const top = el.offsetTop
    const bottom = top + el.offsetHeight
    if (top < list.scrollTop) list.scrollTop = top
    else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight
    }
  }, [activeIndex])

  const select = (item: Suggestion) => {
    item.run()
    setOpen(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // 中文输入法合成期:确认候选的回车、候选框的上下键都不能当导航用
    if (e.nativeEvent.isComposing || e.keyCode === 229) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        setActiveIndex(items.length > 0 ? 0 : -1)
        return
      }
      if (items.length === 0) return
      setActiveIndex((i) => (i + 1) % items.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        setActiveIndex(items.length > 0 ? items.length - 1 : -1)
        return
      }
      if (items.length === 0) return
      setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1))
    } else if (e.key === "Enter") {
      const target = activeIndex >= 0 ? items[activeIndex] : undefined
      if (target) {
        e.preventDefault()
        select(target)
      } else if (query.trim() !== "" && items.length > 0) {
        // 无高亮时回车选第一条(空框回车不动作,避免误跳转)
        e.preventDefault()
        select(items[0])
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault()
        setOpen(false)
      }
    }
  }

  const highlight = (text: string) => {
    const q = query.trim().toLowerCase()
    if (!q) return text
    const idx = text.toLowerCase().indexOf(q)
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-transparent font-semibold text-primary">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    )
  }

  const noMatch = items.length === 0

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 shadow-sm focus-within:ring-1 focus-within:ring-ring">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActiveIndex(-1)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          // 关面板后焦点仍在输入框,再点一次要能重新打开
          onClick={() => setOpen(true)}
          // 建议项用 onMouseDown 触发,先于 input 的 blur 完成跳转
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
          placeholder="搜索产品、市场或功能,如:猪肉、比价"
          className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          role="combobox"
          aria-expanded={open}
          aria-controls="home-search-listbox"
          aria-activedescendant={
            open && activeIndex >= 0 ? `search-item-${activeIndex}` : undefined
          }
          aria-autocomplete="list"
          aria-label="搜索产品、市场或功能"
        />
        {query !== "" && (
          <button
            type="button"
            aria-label="清空"
            // 防止点击时 input 失焦导致面板先关
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQuery("")
              setActiveIndex(-1)
              setOpen(true)
            }}
            className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div
          ref={listRef}
          id="home-search-listbox"
          role="listbox"
          className="absolute inset-x-0 top-full z-10 mt-1 max-h-80 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {noMatch ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              {products.length === 0 ? "数据加载中…" : "暂无匹配"}
            </div>
          ) : (
            items.map((item, i) => (
              <Fragment key={item.key}>
                {items[i - 1]?.group !== item.group && (
                  <div
                    role="presentation"
                    className="px-2 py-1 text-xs text-muted-foreground"
                  >
                    {item.group}
                  </div>
                )}
                <button
                  type="button"
                  id={`search-item-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  data-index={i}
                  onMouseDown={() => select(item)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                    i === activeIndex && "bg-accent",
                  )}
                >
                  <span className="truncate">{highlight(item.label)}</span>
                  {item.sub && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.sub}
                    </span>
                  )}
                </button>
              </Fragment>
            ))
          )}
        </div>
      )}
    </div>
  )
}

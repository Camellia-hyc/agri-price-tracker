import { Wheat } from "lucide-react"

export default function Footer() {
  return (
    <footer className="mt-6 border-t border-border/70 bg-card/60">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-8 text-center">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Wheat className="h-3.5 w-3.5" />
          </span>
          农价通
        </div>
        <p className="text-xs text-muted-foreground">
          全国主要批发市场农产品价格对比与趋势分析
        </p>
        <p className="text-xs text-muted-foreground/80">
          数据为本地演示数据,仅供参考,不构成交易依据 · © 2026 农价通
        </p>
      </div>
    </footer>
  )
}

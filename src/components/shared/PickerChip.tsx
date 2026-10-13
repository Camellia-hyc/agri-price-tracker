import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** 选择器 chip:产品/市场/口径共用,圆角胶囊,选中 = 品牌绿实底 */
export default function PickerChip({
  selected,
  disabled,
  onClick,
  title,
  children,
}: {
  selected: boolean
  disabled?: boolean
  onClick: () => void
  title?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-all",
        selected
          ? "border-transparent bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-foreground/80 hover:border-primary/40 hover:bg-accent/60",
        disabled &&
          "cursor-not-allowed opacity-40 hover:border-border hover:bg-card",
      )}
    >
      {children}
    </button>
  )
}

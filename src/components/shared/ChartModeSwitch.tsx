import { cn } from "@/lib/utils"

export interface ChartModeOption<T extends string> {
  value: T
  label: string
  title?: string
}

/** 图表展示模式分段开关(真实价格 / 指数对比),替代易被忽略的小按钮 */
export default function ChartModeSwitch<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ChartModeOption<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div
      role="group"
      className="inline-flex rounded-lg border border-border/70 bg-muted/70 p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
            value === o.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

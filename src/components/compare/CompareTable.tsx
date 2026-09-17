import { useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { Product } from "@/types/product"
import type { CompareDatum } from "./CompareChart"

interface CompareTableProps {
  data: CompareDatum[]
  products: Product[]
}

export default function CompareTable({ data, products }: CompareTableProps) {
  // 每列的最低价/最高价,用于标色
  const colMinMax = useMemo(
    () =>
      products.map((p) => {
        const prices = data.map(
          (d) => d.prices.find((x) => x.product.id === p.id)?.price ?? 0,
        )
        return {
          min: Math.min(...prices),
          max: Math.max(...prices),
        }
      }),
    [data, products],
  )

  const colAvg = useMemo(
    () =>
      products.map((p) => {
        const prices = data.map(
          (d) => d.prices.find((x) => x.product.id === p.id)?.price ?? 0,
        )
        return prices.reduce((s, v) => s + v, 0) / prices.length
      }),
    [data, products],
  )

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>市场</TableHead>
          {products.map((p) => (
            <TableHead key={p.id} className="text-right">
              {p.name}
              <span className="ml-1 text-xs font-normal">(元/公斤)</span>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((d) => (
          <TableRow key={d.market.id}>
            <TableCell className="font-medium">
              {d.market.name}
              <span className="ml-1.5 text-xs text-muted-foreground">
                {d.market.region}
              </span>
            </TableCell>
            {d.prices.map((x, i) => {
              const { min, max } = colMinMax[i]
              const highlight = min !== max && x.price !== null
              return (
                <TableCell
                  key={x.product.id}
                  className={cn(
                    "text-right tabular-nums",
                    highlight && x.price === min && "font-semibold text-primary",
                    highlight && x.price === max && "font-semibold text-destructive",
                  )}
                >
                  {x.price === null ? "—" : x.price.toFixed(2)}
                </TableCell>
              )
            })}
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>均价</TableCell>
          {colAvg.map((avg, i) => (
            <TableCell key={products[i].id} className="text-right tabular-nums">
              {avg.toFixed(2)}
            </TableCell>
          ))}
        </TableRow>
      </TableFooter>
    </Table>
  )
}

export type ProductCategory = "蔬菜" | "水果" | "粮油" | "肉禽蛋" | "水产"

export interface Product {
  id: string
  name: string
  category: ProductCategory
  unit: string
  /** 基准价(元/公斤),仅用于 mock 数据生成 */
  basePrice: number
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "蔬菜",
  "水果",
  "粮油",
  "肉禽蛋",
  "水产",
]

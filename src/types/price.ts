export interface PriceRecord {
  productId: string
  marketId: string
  /** YYYY-MM-DD */
  date: string
  /** 元/公斤 */
  price: number
}

export interface PriceQuery {
  productIds?: string[]
  marketIds?: string[]
  /** YYYY-MM-DD,含边界 */
  startDate?: string
  /** YYYY-MM-DD,含边界 */
  endDate?: string
}

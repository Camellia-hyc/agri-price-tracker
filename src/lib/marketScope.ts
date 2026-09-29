/** 虚拟市场:全国均价(全部市场每日期均值的口径)。不是真实市场 id,只出现在趋势页选择器/URL 参数里 */
export const ALL_MARKETS_ID = "all"
export const ALL_MARKETS_LABEL = "全国均价"
/** 趋势页市场上限:3 市场 × 3 产品 = 9 系列(超出 6 色板容量,不再放宽) */
export const TREND_MAX_MARKETS = 3

/** 折线系列名:只有"多产品 × 多市场"同图才需要消歧 */
export function seriesName(
  productName: string,
  marketLabel: string,
  productCount: number,
  marketCount: number,
): string {
  if (productCount > 1 && marketCount > 1) return `${productName} · ${marketLabel}`
  if (productCount > 1) return productName
  if (marketCount > 1) return marketLabel
  return productName
}

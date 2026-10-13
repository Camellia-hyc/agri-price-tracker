// 全站 ECharts 统一主题("agri"):发丝级实线网格、克制的轴文字、圆角浮层 tooltip。
// 规则来源:图表网格/轴用一档灰、实线、绝不虚线;文字用墨色,不穿数据色;
// 图例图标保持 ECharts 默认(线系列显示线型,复合编码需要它展示虚线差异)。
import * as echarts from "echarts/core"
import { CHART_COLORS } from "./chartColors"

/** 轴/图例/次要文字(与 index.css --muted-foreground 同族) */
export const CHART_MUTED = "#6f7d72"
/** 网格发丝线(比卡片底色深一档) */
export const CHART_GRID = "#e8ede7"
/** 图例主文字 */
export const CHART_LEGEND = "#3d4a41"

echarts.registerTheme("agri", {
  color: CHART_COLORS,
  textStyle: {
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif',
  },
  legend: {
    itemWidth: 14,
    itemHeight: 8,
    itemGap: 16,
    textStyle: { color: CHART_LEGEND, fontSize: 12 },
    inactiveColor: "#b9c3bb",
  },
  tooltip: {
    backgroundColor: "rgba(255,255,255,0.98)",
    borderColor: CHART_GRID,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: "#26332a", fontSize: 12 },
    extraCssText:
      "border-radius:10px;box-shadow:0 12px 32px -12px rgba(24,48,28,.28);",
  },
  categoryAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: CHART_MUTED, fontSize: 11, margin: 12 },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: CHART_MUTED, fontSize: 11 },
    // 网格:实线发丝,绝不用虚线(虚线会被误读为阈值/预测)
    splitLine: { show: true, lineStyle: { color: CHART_GRID, width: 1, type: "solid" } },
    nameTextStyle: { color: CHART_MUTED, fontSize: 11, padding: [0, 0, 6, 0] },
  },
  bar: {
    itemStyle: { borderRadius: [4, 4, 0, 0] },
  },
  line: {
    symbol: "circle",
    symbolSize: 8,
    lineStyle: { width: 2, cap: "round", join: "round" },
  },
})

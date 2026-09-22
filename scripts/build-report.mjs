// 生成 docs/实验报告.docx:合并 docs/ 下 6 份 Markdown 文档为一份 Word 实验报告
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
} from "docx"
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const OUT = join(ROOT, "docs", "实验报告.docx")

// ---------- 字数统计 ----------
let cnChars = 0
let totalChars = 0
function count(text) {
  const plain = text.replace(/\*\*/g, "").replace(/`/g, "")
  totalChars += plain.length
  cnChars += (plain.match(/[一-鿿　-〿＀-￯]/g) || []).length
}

// ---------- 字体 ----------
const F_BODY = { ascii: "Times New Roman", hAnsi: "Times New Roman", eastAsia: "宋体" }
const F_HEAD = { ascii: "Times New Roman", hAnsi: "Times New Roman", eastAsia: "黑体" }
const F_CODE = { ascii: "Consolas", hAnsi: "Consolas", eastAsia: "宋体" }
const BLACK = "000000"

// ---------- 元素工厂 ----------
// 行内标记:**加粗**、`等宽`
function inline(text, runOpts = {}) {
  const runs = []
  for (const part of text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)) {
    if (!part) continue
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, ...runOpts }))
    } else if (part.startsWith("`") && part.endsWith("`")) {
      runs.push(
        new TextRun({
          text: part.slice(1, -1),
          font: F_CODE,
          size: (runOpts.size ?? 24) - 2,
          ...runOpts,
        }),
      )
    } else {
      runs.push(new TextRun({ text: part, ...runOpts }))
    }
  }
  return runs
}

const bodyRun = { font: F_BODY, size: 24, color: BLACK }

// 正文段落(首行缩进 2 字符,1.5 倍行距)
function p(text, opts = {}) {
  count(text)
  return new Paragraph({
    indent: { firstLine: 480 },
    spacing: { line: 360, after: 60 },
    children: inline(text, { ...bodyRun, ...(opts.run ?? {}) }),
  })
}

// 无缩进段落(说明、引用等)
function plain(text, opts = {}) {
  count(text)
  return new Paragraph({
    spacing: { line: 360, after: 60 },
    children: inline(text, { ...bodyRun, ...(opts.run ?? {}) }),
    ...(opts.alignment ? { alignment: opts.alignment } : {}),
  })
}

// 项目符号列表
function bullet(text) {
  count(text)
  return new Paragraph({
    indent: { left: 480 },
    spacing: { line: 360, after: 30 },
    children: [new TextRun({ text: "•  ", font: F_BODY, size: 24 }), ...inline(text, bodyRun)],
  })
}

// 编号列表(手动序号)
function numbered(no, text) {
  count(text)
  return new Paragraph({
    indent: { left: 480 },
    spacing: { line: 360, after: 30 },
    children: [
      new TextRun({ text: `${no}. `, font: F_BODY, size: 24 }),
      ...inline(text, bodyRun),
    ],
  })
}

function h1(text) {
  count(text)
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 160, line: 360 },
    children: inline(text, { font: F_HEAD, size: 32, bold: true, color: BLACK }),
  })
}

function h2(text) {
  count(text)
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 160, after: 100, line: 360 },
    children: inline(text, { font: F_HEAD, size: 28, bold: true, color: BLACK }),
  })
}

// 等宽代码块:浅灰底纹,单倍行距
function code(lines) {
  const list = Array.isArray(lines) ? lines : lines.split("\n")
  const paras = []
  for (const line of list) {
    paras.push(
      new Paragraph({
        shading: { type: ShadingType.CLEAR, fill: "F5F5F5" },
        spacing: { line: 240, after: 0 },
        children: [
          new TextRun({ text: line === "" ? " " : line, font: F_CODE, size: 18, color: BLACK }),
        ],
      }),
    )
  }
  return paras
}

// 表格
const TB = { style: BorderStyle.SINGLE, size: 4, color: "999999" }
const cellBorders = { top: TB, bottom: TB, left: TB, right: TB }
const cellBase = {
  borders: cellBorders,
  margins: { top: 60, bottom: 60, left: 100, right: 100 },
}

function tbl(headers, rows) {
  const mkRow = (cells, isHead) =>
    new TableRow({
      children: cells.map((c) => {
        count(String(c))
        return new TableCell({
          ...cellBase,
          shading: isHead ? { type: ShadingType.CLEAR, fill: "EFEFEF" } : undefined,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { line: 240, after: 0 },
              children: inline(String(c), {
                font: F_BODY,
                size: 21,
                bold: isHead,
                color: BLACK,
              }),
            }),
          ],
        })
      }),
    })
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [mkRow(headers, true), ...rows.map((r) => mkRow(r, false))],
  })
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] })
}

function spacer() {
  return new Paragraph({ children: [], spacing: { line: 240, after: 0 } })
}

// ---------- 内容 ----------
const children = []

// ===== 封面 =====
for (let i = 0; i < 4; i++) children.push(spacer())
count("农价通")
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240, line: 360 },
    children: [new TextRun({ text: "农价通", font: F_HEAD, size: 56, bold: true, color: BLACK })],
  }),
)
count("农产品价格对比与趋势分析系统")
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 480, line: 360 },
    children: [
      new TextRun({
        text: "—— 农产品价格对比与趋势分析系统 ——",
        font: F_HEAD,
        size: 28,
        color: BLACK,
      }),
    ],
  }),
)
count("实验报告")
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 960, line: 360 },
    children: [new TextRun({ text: "实验报告", font: F_HEAD, size: 36, bold: true, color: BLACK })],
  }),
)
for (let i = 0; i < 3; i++) children.push(spacer())

const infoRows = [
  ["姓    名", "请填写"],
  ["学    号", "请填写"],
  ["班    级", "请填写"],
  ["指导教师", "请填写"],
  ["完成日期", "2026 年 9 月 17 日"],
]
children.push(
  new Table({
    width: { size: 60, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.CENTER,
    rows: infoRows.map(([k, v]) => {
      count(`${k}${v}`)
      const mk = (text, bold) =>
        new TableCell({
          ...cellBase,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { line: 360, after: 0 },
              children: [
                new TextRun({ text, font: F_BODY, size: 24, bold, color: BLACK }),
              ],
            }),
          ],
        })
      return new TableRow({ children: [mk(k, true), mk(v, false)] })
    }),
  }),
)
children.push(pageBreak())

// ===== 目录 =====
count("目    录")
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 240, line: 360 },
    children: [new TextRun({ text: "目    录", font: F_HEAD, size: 32, bold: true, color: BLACK })],
  }),
)
// TOC 域:打开文档后全选(Ctrl+A)再按 F9 可更新页码
children.push(
  new TableOfContents({
    summary: { heading: HeadingLevel.HEADING_1 },
    hyperlink: true,
    headingStyleRange: "1-2",
  }),
)
children.push(pageBreak())

// ===== 一、项目背景与意义 =====
children.push(h1("一、项目背景与意义"))

children.push(
  p(
    "农产品价格直接关系生产者收益与消费者支出,但价格信息分散在全国各地批发市场,存在明显的信息不对称问题:同一农产品在不同市场的价差可达 20% 以上,普通消费者难以比较;价格波动缺乏直观的展示手段,从业者难以快速判断走势。",
  ),
)
children.push(
  p(
    "针对上述问题,本项目设计并实现“农价通”——一个农产品价格对比与趋势分析 Web 应用,汇总 20 种常见农产品在全国 10 个主要批发市场的每日价格(覆盖最近 90 天,共 18000 条价格记录),提供两大核心能力:",
  ),
)
children.push(bullet("**比价**:同一日期、不同市场之间横向对比,哪里最便宜一目了然;"))
children.push(bullet("**走势**:单一市场内纵向观察,近 7 天至近 1 年的涨跌与趋势可视化。"))
children.push(
  p(
    "在技术层面,项目是一个纯前端单页应用(SPA),采用“数据层与展示层分离”的架构:演示数据本地化存放,所有请求经由统一的接口层,替换为真实行情 API 时只需修改一个文件。开发过程中实践了组件化开发、类型系统设计、ECharts 可视化、构建体积优化与自动化部署等工程能力,可作为前端工程化的一个完整实践案例。",
  ),
)

// ===== 二、开发环境与技术栈 =====
children.push(h1("二、开发环境与技术栈"))

children.push(h2("2.1 开发环境"))
children.push(
  tbl(
    ["类别", "工具 / 环境", "说明"],
    [
      ["操作系统", "Windows 11", "开发与构建环境"],
      ["运行时", "Node.js 24.21.0 + npm", "依赖管理与脚本执行"],
      ["构建工具", "Vite 7.3.6", "开发服务器(热更新)与生产打包"],
      ["版本管理", "Git", "本地仓库,分阶段提交"],
      ["部署平台", "Netlify", "Netlify Drop 静态托管"],
      ["数据来源", "自研 mock 生成脚本", "固定随机种子,数据可复现"],
    ],
  ),
)

children.push(h2("2.2 技术栈与版本"))
children.push(
  tbl(
    ["技术", "版本", "用途"],
    [
      ["React / React DOM", "18.3.1", "UI 框架(函数组件 + Hooks)"],
      ["TypeScript", "5.8.3", "类型安全;类型集中于 src/types/,代码中禁止 any"],
      ["Vite", "7.0.0(实测 7.3.6)", "开发服务器与构建"],
      ["@vitejs/plugin-react", "5.0.0", "Vite 的 React 插件"],
      ["Tailwind CSS", "4.1.0", "原子化样式(v4,经 @tailwindcss/vite 接入,无需配置文件)"],
      ["shadcn/ui", "—", "基础组件(button / card / table),基于 Radix Slot + CVA"],
      ["lucide-react", "0.525.0", "图标"],
      ["ECharts", "5.6.0", "图表渲染(按需引入,仅注册 Bar / Line 等)"],
      ["react-router-dom", "7.7.0", "路由与跨页参数传递"],
    ],
  ),
)

children.push(h2("2.3 工程规范"))
children.push(
  plain(
    "项目遵循统一的工程规范:函数组件 + Hooks;类型定义集中在 `src/types/`,代码中禁止 `any`;所有接口请求统一封装在 `src/services/api.ts`;组件按页面分目录,通用组件放在 `src/components/ui/`;界面为中文,代码标识符为英文。",
  ),
)

// ===== 三、系统设计 =====
children.push(h1("三、系统设计"))

children.push(h2("3.1 整体架构"))
children.push(
  p(
    "项目采用经典的前端分层架构:数据层 → 服务层 → 页面层 → 组件层。各层职责单一、单向依赖(上层不反向依赖下层实现),整体结构如下图所示:",
  ),
)
children.push(
  ...code([
    "┌────────────────────────────────────────────────┐",
    "│  组件层 src/components/   (纯展示 + 回调)       │",
    "│  SearchBar  CategoryGrid  MoverList            │",
    "│  ProductPicker(共用)  CompareChart  CompareTable│",
    "│  StatCards  TrendChart  EChart(图表底层封装)    │",
    "└───────────────────────┬────────────────────────┘",
    "                        │ props / events",
    "┌───────────────────────┴────────────────────────┐",
    "│  页面层 src/pages/                             │",
    "│  Home  PriceCompare  TrendAnalysis             │",
    "│  (数据加载、选中状态、useMemo 聚合)             │",
    "└───────────────────────┬────────────────────────┘",
    "                        │ getProducts/getMarkets/getPrices",
    "┌───────────────────────┴────────────────────────┐",
    "│  服务层 src/services/api.ts                    │",
    "│  fetch  ·  模块级缓存  ·  内存过滤              │",
    "└───────────────────────┬────────────────────────┘",
    "                        │ fetch",
    "┌───────────────────────┴────────────────────────┐",
    "│  数据层 public/mock/                           │",
    "│  products.json(20)  markets.json(10)           │",
    "│  prices.json(18000 条,约 1.4MB)                │",
    "└────────────────────────────────────────────────┘",
  ]),
)
children.push(
  tbl(
    ["层", "位置", "职责"],
    [
      ["数据层", "public/mock/*.json", "原始数据,构建时原样复制进 dist,由浏览器直接 fetch"],
      ["服务层", "src/services/api.ts", "唯一的数据入口:请求、缓存、按条件过滤,对上层暴露 Promise 接口"],
      ["页面层", "src/pages/", "加载数据、管理选中状态、用 useMemo 把原始记录聚合成组件可用的结构"],
      ["组件层", "src/components/", "纯展示 + 事件回调,不直接 fetch 数据;图表组件只接受 option / 数据 props"],
    ],
  ),
)

children.push(h2("3.2 数据流向"))
children.push(p("以趋势分析页为例,一次完整的请求与渲染链路如下:"))
children.push(
  numbered(
    1,
    "页面挂载后调用 `getProducts()` / `getMarkets()` / `getPrices()` 三个接口函数;",
  ),
)
children.push(
  numbered(2, "`api.ts` 首次调用时 fetch prices.json(约 1.4MB、18000 条),结果写入模块级缓存 `pricesCache`;"),
)
children.push(
  numbered(3, "后续所有查询不再发请求,直接在内存中按产品 / 市场 / 日期条件 `filter`;"),
)
children.push(
  numbered(
    4,
    "页面在 `useMemo` 中按市场、产品、日期区间聚合平铺记录,得到 `dates[]`(日期轴)与 `StatCardData[]`(每个产品一组统计);",
  ),
)
children.push(
  numbered(5, "统计卡片与折线图组件接收聚合结果,折线图构造 `EChartsOption` 传给通用封装 `EChart`;"),
)
children.push(
  numbered(6, "`EChart` 调用 `setOption(option, { notMerge: true })` 完成渲染。"),
)

children.push(h2("3.3 关键设计决策"))
children.push(
  p(
    "**决策一:数据层与展示层分离,api.ts 是唯一数据入口。**所有数据请求集中在 `src/services/api.ts`,页面与组件一律不直接写 `fetch`。当前数据来自本地 mock,后续要换成真实行情 API 时,只要 API 返回结构保持不变,替换数据源只需修改 api.ts 一个文件,页面零改动;同时便于统一处理错误、加缓存。",
  ),
)
children.push(
  p(
    "**决策二:全量下载 + 内存过滤,而不是按需请求。**prices.json 一次下载并缓存,查询在内存里 `filter`。18000 条记录约 1.4MB,一次性成本可接受;换来筛选切换零延迟(无网络往返),三个页面共享同一份数据,代码简单。若接入真实 API(数据量可能大得多),此策略可在 api.ts 内改为按查询参数请求服务端接口,页面同样不受影响。",
  ),
)
children.push(
  p(
    "**决策三:路由懒加载(React.lazy)。**三个页面全部 `React.lazy(() => import(...))`,`MainLayout` 的内容区外包 `Suspense`。图表相关代码(ECharts 及两个图表组件)只被对比页 / 趋势页使用,懒加载后首页首屏不加载它们;Suspense 放在内容区而不是包裹整个布局,切换页面时 Header/Footer 不闪烁。优化后构建产物入口 chunk 从 748KB 降到 41KB,三个页面各约 8KB 按需加载。",
  ),
)
children.push(
  ...code([
    "// src/App.tsx(节选)",
    "const Home = lazy(() => import(\"@/pages/Home\"))",
    "const PriceCompare = lazy(() => import(\"@/pages/PriceCompare\"))",
    "const TrendAnalysis = lazy(() => import(\"@/pages/TrendAnalysis\"))",
  ]),
)
children.push(
  p(
    "**决策四:ECharts 按需引入 + 依赖分包。**从 `echarts/core` 引入,只注册用到的 Bar/Line 图表与 Grid/Legend/Tooltip 组件、Canvas 渲染器;同时在 `vite.config.ts` 中把 echarts 与 react 系拆成独立 chunk。全量引入 echarts 体积约 1MB,按需注册后本体仍约 500KB(Canvas 渲染器占大头),拆成独立 chunk 后与业务代码、React 运行时彻底分离——react chunk(约 180KB)长期不变可被浏览器长期缓存,echarts chunk 只在首次进入图表页时下载。",
  ),
)
children.push(
  ...code([
    "// vite.config.ts(节选)",
    "build: {",
    "  chunkSizeWarningLimit: 600,",
    "  rollupOptions: {",
    "    output: {",
    "      manualChunks: {",
    "        echarts: [\"echarts\"],",
    "        react: [\"react\", \"react-dom\", \"react-router-dom\"],",
    "      },",
    "    },",
    "  },",
    "},",
  ]),
)
children.push(
  p(
    "**决策五:纯展示组件 + 回调(props down, events up)。**组件不持有全局数据、不直接请求,通过 props 接收数据,通过回调上报交互。对比页与趋势页因此得以复用同一个 `ProductPicker` 组件(仅上限参数不同),图表组件完全与业务解耦,可独立测试与复用。",
  ),
)
children.push(
  p(
    "**决策六:跨页传参用 URL 查询参数。**首页 → 分析页的跳转携带 `?product=ID`、`?category=分类`、`?market=ID`,目标页用 `useSearchParams` 读取并初始化选择。URL 即状态:用户刷新页面后选择不丢失,链接可直接分享,且无需引入全局状态库,符合项目规模。",
  ),
)

children.push(h2("3.4 类型系统设计"))
children.push(
  p("三个核心类型集中在 `src/types/`,分别对应三份数据文件:"),
)
children.push(
  ...code([
    "// src/types/product.ts",
    "export type ProductCategory = \"蔬菜\" | \"水果\" | \"粮油\" | \"肉禽蛋\" | \"水产\"",
    "",
    "export interface Product {",
    "  id: string",
    "  name: string",
    "  category: ProductCategory",
    "  unit: string",
    "  /** 基准价(元/公斤),仅用于 mock 数据生成 */",
    "  basePrice: number",
    "}",
    "",
    "// src/types/market.ts",
    "export interface Market {",
    "  id: string",
    "  name: string",
    "  city: string",
    "  region: string",
    "}",
    "",
    "// src/types/price.ts",
    "export interface PriceRecord {",
    "  productId: string",
    "  marketId: string",
    "  /** YYYY-MM-DD */",
    "  date: string",
    "  /** 元/公斤 */",
    "  price: number",
    "}",
    "",
    "export interface PriceQuery {",
    "  productIds?: string[]",
    "  marketIds?: string[]",
    "  /** YYYY-MM-DD,含边界 */",
    "  startDate?: string",
    "  /** YYYY-MM-DD,含边界 */",
    "  endDate?: string",
    "}",
  ]),
)
children.push(
  p(
    "实体关系:Product 与 PriceRecord 是一对多(productId 关联),Market 与 PriceRecord 是一对多(marketId 关联)。设计要点:",
  ),
)
children.push(
  bullet(
    "`PriceRecord` 是事实表:通过 productId / marketId 关联产品与市场,不冗余名称等信息,展示时由页面按 ID 回查;",
  ),
)
children.push(
  bullet(
    "`ProductCategory` 用字符串字面量联合类型而非 `string`,分类写错会在编译期报错;配套的常量数组供分类 Tab 与分类卡片遍历;",
  ),
)
children.push(
  bullet(
    "`PriceQuery` 是 api.ts 的查询入参,全部字段可选(不传即不过滤),字段名与真实 API 常见查询参数对齐,便于后续替换;",
  ),
)
children.push(
  bullet(
    "日期统一为 `YYYY-MM-DD` 字符串:同格式字符串可直接按字典序比较大小,无需反复 `new Date()`(api.ts 与页面聚合中大量使用此特性)。",
  ),
)

// ===== 四、功能实现 =====
children.push(h1("四、功能实现"))

children.push(
  p(
    "系统包含三个页面:首页、价格对比页、趋势分析页,由顶部导航联通;首页通过 URL 参数向两个分析页传递初始选择。本节按页面说明功能与关键实现。",
  ),
)

children.push(h2("4.1 首页"))
children.push(
  p(
    "首页自上而下三段:品牌区(标题 + 搜索框)、按分类浏览、价格异动榜。",
  ),
)
children.push(p("**(1)搜索框**。匹配规则(不区分大小写):产品按名称或 ID 匹配,市场按名称、城市或 ID 匹配;每组最多展示 5 条建议,两组均无结果时显示“暂无匹配”。点击产品建议跳转 `/trend?product=产品ID`,点击市场建议跳转 `/compare?market=市场ID`。"))
children.push(
  p(
    "实现细节:建议项使用 `onMouseDown` 而非 `onClick` 触发跳转——点击建议项时输入框会先触发 `blur` 收起下拉,`onClick` 将永远无法执行;`onMouseDown` 先于 `blur` 触发,保证跳转可靠完成。",
  ),
)
children.push(
  ...code([
    "// src/components/home/SearchBar.tsx(节选)",
    "const { productHits, marketHits } = useMemo(() => {",
    "  const q = query.trim().toLowerCase()",
    "  if (!q) return { productHits: [], marketHits: [] }",
    "  return {",
    "    productHits: products",
    "      .filter((p) => p.name.toLowerCase().includes(q) || p.id.includes(q))",
    "      .slice(0, MAX_RESULTS),",
    "    marketHits: markets",
    "      .filter(",
    "        (m) =>",
    "          m.name.toLowerCase().includes(q) ||",
    "          m.city.toLowerCase().includes(q) ||",
    "          m.id.includes(q),",
    "      )",
    "      .slice(0, MAX_RESULTS),",
    "  }",
    "}, [query, products, markets])",
    "",
    "// 建议项:onMouseDown 先于 input 的 blur 完成跳转",
    "onMouseDown={() => navigate(`/trend?product=${p.id}`)}",
  ]),
)
children.push(
  p(
    "**(2)分类入口**。蔬菜、水果、粮油、肉禽蛋、水产五大分类,每张卡片显示该分类下的产品数量(每类 4 种)。点击分类跳转 `/trend?category=分类名`,趋势页自动选中该分类的前 3 种产品。",
  ),
)
children.push(
  p(
    "**(3)价格异动榜**。并排两张卡片:涨幅榜 Top5、跌幅榜 Top5。计算口径:取数据中最新一天与前一天;对每个产品计算这两天的全市场均价;涨跌幅 = (最新日均价 − 前一日均价) / 前一日均价 × 100%;按涨跌幅排序取前 5。每行显示排名、产品名、最新日均价、涨跌幅,红色向上箭头为涨、绿色向下箭头为跌(国内行情习惯),点击行跳转该产品的趋势页。",
  ),
)
children.push(
  ...code([
    "// src/pages/Home.tsx(节选)— 异动榜聚合",
    "// date -> productId -> prices",
    "const byDate = new Map<string, Map<string, number[]>>()",
    "for (const r of allPrices) {",
    "  let m = byDate.get(r.date)",
    "  if (!m) { m = new Map(); byDate.set(r.date, m) }",
    "  let arr = m.get(r.productId)",
    "  if (!arr) { arr = []; m.set(r.productId, arr) }",
    "  arr.push(r.price)",
    "}",
    "const dates = [...byDate.keys()].sort()",
    "const last = dates[dates.length - 1]",
    "const prev = dates[dates.length - 2]",
    "",
    "const avg = (prices: number[] | undefined) =>",
    "  prices && prices.length > 0",
    "    ? prices.reduce((s, v) => s + v, 0) / prices.length",
    "    : null",
    "",
    "for (const p of products) {",
    "  const today = avg(byDate.get(last)?.get(p.id))",
    "  const yesterday = avg(byDate.get(prev)?.get(p.id))",
    "  if (today === null || yesterday === null) continue",
    "  rows.push({",
    "    product: p,",
    "    latest: today,",
    "    changePct: ((today - yesterday) / yesterday) * 100,",
    "  })",
    "}",
    "rows.sort((a, b) => b.changePct - a.changePct)",
    "// rows 降序,取负数部分再反转 → 跌幅最大在前",
    "losers: rows.filter((r) => r.changePct < 0).reverse().slice(0, 5)",
  ]),
)

children.push(h2("4.2 价格对比页"))
children.push(
  p(
    "价格对比页回答“同一天、不同市场,哪里最便宜”的问题。页面由筛选器(产品 / 市场 / 日期)、分组柱状图、价格明细表三部分组成。",
  ),
)
children.push(p("**筛选规则**:"))
children.push(
  tbl(
    ["筛选项", "规则"],
    [
      [
        "产品",
        "多选,上限 3 个;达上限后未选中的产品置灰不可再选;按“全部 + 五分类”Tab 过滤产品列表",
      ],
      [
        "市场",
        "多选,上限 6 个;按钮显示城市名(悬停可见全称);达上限后同样置灰",
      ],
      [
        "日期",
        "单选,原生日期选择器;可选范围被限制在数据实际日期范围内;默认选中最新一天",
      ],
    ],
  ),
)
children.push(
  p(
    "默认选中猪肉、鸡蛋、大白菜 3 种产品与北京新发地、上海江桥、广州江南、成都农产品中心、西安欣桥 5 个市场,保证首次进入即有内容。选择顺序被保留,图表系列与表格列均按选择顺序排列;产品与市场全部取消时显示“请至少选择 1 个产品和 1 个市场”。",
  ),
)
children.push(
  p("上限禁用的实现(市场部分,产品同理,复用共享的 `ProductPicker` 组件):"),
)
children.push(
  ...code([
    "// src/components/compare/ProductMarketPicker.tsx(节选)",
    "const MAX_PRODUCTS = 3",
    "const MAX_MARKETS = 6",
    "",
    "const selected = selectedMarketIds.includes(m.id)",
    "const disabled =",
    "  !selected && selectedMarketIds.length >= MAX_MARKETS",
    "<Button",
    "  key={m.id}",
    "  variant={selected ? \"default\" : \"outline\"}",
    "  disabled={disabled}",
    "  onClick={() => onMarketToggle(m.id)}",
    "  title={m.name}",
    ">",
    "  {m.city}",
    "</Button>",
  ]),
)
children.push(
  p(
    "**分组柱状图**:X 轴为市场(城市名),每个产品一条系列;悬停显示数值与“元/公斤”后缀;柱顶圆角;最多 3 产品 × 6 市场 = 每组最多 3 根柱。某市场当日无某产品报价时,该位置不画柱(数据为 `null`)。",
  ),
)
children.push(
  p(
    "**价格明细表**:行 = 市场(显示全称与所属地区),列 = 产品。高亮规则:对每一产品列,该列所有市场中的最低价标绿色加粗、最高价标红色加粗;当整列价格相同(最低 = 最高)时不做高亮,避免整列全亮。缺数据显示“—”;表格底部有一行“均价”,为每列所有市场价格的算术平均。",
  ),
)
children.push(
  ...code([
    "// src/components/compare/CompareTable.tsx(节选)",
    "// 每列的最低价/最高价,用于标色",
    "const colMinMax = useMemo(",
    "  () =>",
    "    products.map((p) => {",
    "      const prices = data.map(",
    "        (d) => d.prices.find((x) => x.product.id === p.id)?.price ?? 0,",
    "      )",
    "      return { min: Math.min(...prices), max: Math.max(...prices) }",
    "    }),",
    "  [data, products],",
    ")",
    "",
    "// 单元格判定:min !== max 防止整列全亮",
    "const { min, max } = colMinMax[i]",
    "const highlight = min !== max && x.price !== null",
    "className={cn(",
    "  \"text-right tabular-nums\",",
    "  highlight && x.price === min && \"font-semibold text-primary\",     // 最低 → 绿",
    "  highlight && x.price === max && \"font-semibold text-destructive\", // 最高 → 红",
    ")}",
  ]),
)

children.push(h2("4.3 趋势分析页"))
children.push(
  p(
    "趋势分析页回答“某个市场内,产品价格近期怎么走”的问题,由筛选器(产品 / 市场 / 时间范围)、统计卡片、多产品折线图组成。",
  ),
)
children.push(p("**筛选规则**:"))
children.push(
  tbl(
    ["筛选项", "规则"],
    [
      ["产品", "多选,上限 3 个;交互与对比页一致(共用 ProductPicker 组件)"],
      ["市场", "单选(一次只看一个市场的走势)"],
      [
        "时间范围",
        "单选:近 7 天 / 近 30 天 / 近 90 天 / 近 1 年,默认近 30 天;以数据最新一天为终点向前截取",
      ],
    ],
  ),
)
children.push(
  p(
    "首页跳转带来的 URL 参数会自动初始化选择:`product=ID` 选中单个产品;`category=分类` 选中该分类前 3 种产品(与 3 个上限保持一致)。时间范围的起点由 `maxDate` 倒推:`startDate = shiftDate(maxDate, -(rangeDays - 1))`。",
  ),
)
children.push(
  ...code([
    "// src/pages/TrendAnalysis.tsx(节选)",
    "// 首页搜索/分类入口跳转时,按 URL 参数初始化选择",
    "useEffect(() => {",
    "  if (products.length === 0) return",
    "  const productId = searchParams.get(\"product\")",
    "  const category = searchParams.get(\"category\")",
    "  if (productId && products.some((p) => p.id === productId)) {",
    "    setSelectedProductIds([productId])",
    "  } else if (category) {",
    "    // 上限 3 与 TrendFilter 的 MAX_PRODUCTS 一致",
    "    const ids = products",
    "      .filter((p) => p.category === category)",
    "      .slice(0, 3)",
    "      .map((p) => p.id)",
    "    if (ids.length > 0) setSelectedProductIds(ids)",
    "  }",
    "}, [products, searchParams])",
    "",
    "// 时间范围起点:最新日 -(rangeDays - 1)",
    "const startDate = maxDate ? shiftDate(maxDate, -(rangeDays - 1)) : \"\"",
  ]),
)
children.push(p("**统计卡片**:每个选中的产品一张卡片,指标含义如下:"))
children.push(
  tbl(
    ["指标", "含义", "计算方式"],
    [
      ["最新价(大号数字)", "区间内最后一天的报价", "时间范围内最后一条记录"],
      [
        "区间涨跌",
        "区间首日 → 末日的涨跌幅",
        "(末价 − 首价) / 首价 × 100%,红涨绿跌,持平显示灰色横线",
      ],
      ["最高 / 最低", "区间内报价的最高值 / 最低值", "区间内所有记录取 max / min"],
      ["均价", "区间内所有报价的算术平均", "区间记录求和 ÷ 天数"],
    ],
  ),
)
children.push(
  p(
    "**价格走势折线图**:多产品折线图,X 轴为日期,每条产品线一种颜色(与柱状图共用同一色板,同一产品在两个页面颜色一致)。设计要点:曲线平滑(`smooth`)、不显示数据点标记(避免 90 个点过于密集);Y 轴不从 0 起(`scale: true`)——各产品单价差异大(如鸡蛋约 10 元 vs 牛肉约 68 元),从 0 起会导致低价产品走势被压平;某产品在某日期缺数据时,曲线在该处断开(`null`)。卡片标题显示市场名、起止日期与单位(元/公斤)。",
  ),
)

children.push(h2("4.4 页面间跳转关系"))
children.push(
  tbl(
    ["起点", "动作", "目标页面", "URL 参数"],
    [
      ["首页搜索框", "点击产品建议", "趋势分析", "product=产品ID"],
      ["首页搜索框", "点击市场建议", "价格对比", "market=市场ID"],
      ["首页分类卡片", "点击分类", "趋势分析", "category=分类名"],
      ["首页异动榜", "点击行", "趋势分析", "product=产品ID"],
      ["顶部导航", "点击", "三个页面直达", "无"],
    ],
  ),
)

children.push(h2("4.5 其他状态与移动端适配"))
children.push(
  plain(
    "**加载与错误状态**:数据未返回时内容区显示“数据加载中…”并附带骨架卡片;请求失败显示“数据加载失败:{原因}”;路由懒加载切换页面时内容区显示“页面加载中…”(Header/Footer 不闪烁);访问不存在的地址进入 404 页,可一键返回首页。",
  ),
)
children.push(
  plain(
    "**移动端适配**:Header 折叠为汉堡菜单(点击后自动收起);价格明细表在窄屏下容器横向滚动;产品 / 市场选择按钮自动换行;统计卡片栅格自适应(手机 1 列 → 平板 2 列 → 桌面 3 列);图表监听窗口 resize 自动重绘。",
  ),
)

// ===== 五、核心代码讲解 =====
children.push(h1("五、核心代码讲解"))
children.push(
  p(
    "本节挑选四个关键文件逐段讲解,按“输入是什么 → 做了什么处理 → 输出是什么”组织。",
  ),
)

children.push(h2("5.1 src/services/api.ts — 数据服务层"))
children.push(
  plain(
    "**输入**:`PriceQuery`(可选的产品 ID 列表、市场 ID 列表、起止日期);数据源为 `public/mock/` 下三个 JSON 文件。",
  ),
)
children.push(
  ...code([
    "// 后期替换真实 API 时只需改这个文件",
    "const MOCK_BASE = `${import.meta.env.BASE_URL}mock`",
    "",
    "let pricesCache: PriceRecord[] | null = null",
    "",
    "async function fetchJson<T>(path: string): Promise<T> {",
    "  const res = await fetch(`${MOCK_BASE}/${path}`)",
    "  if (!res.ok) {",
    "    throw new Error(`加载 ${path} 失败:${res.status}`)",
    "  }",
    "  return res.json()",
    "}",
    "",
    "export function getProducts(): Promise<Product[]> {",
    "  return fetchJson<Product[]>(\"products.json\")",
    "}",
    "",
    "export function getMarkets(): Promise<Market[]> {",
    "  return fetchJson<Market[]>(\"markets.json\")",
    "}",
    "",
    "// prices.json 约 1.4MB,只请求一次,后续查询在内存过滤",
    "export async function getPrices(query: PriceQuery = {}): Promise<PriceRecord[]> {",
    "  if (!pricesCache) {",
    "    pricesCache = await fetchJson<PriceRecord[]>(\"prices.json\")",
    "  }",
    "  const { productIds, marketIds, startDate, endDate } = query",
    "  return pricesCache.filter((r) => {",
    "    if (productIds?.length && !productIds.includes(r.productId)) return false",
    "    if (marketIds?.length && !marketIds.includes(r.marketId)) return false",
    "    if (startDate && r.date < startDate) return false",
    "    if (endDate && r.date > endDate) return false",
    "    return true",
    "  })",
    "}",
  ]),
)
children.push(p("三个要点:"))
children.push(
  bullet(
    "**通用请求函数 `fetchJson<T>`**:统一拼接路径、检查 `res.ok` 并抛出中文错误信息,泛型保证返回类型;",
  ),
)
children.push(
  bullet(
    "**模块级缓存 `pricesCache`**:prices.json(约 1.4MB)只在第一次调用时下载,之后所有查询直接对内存数组 `filter`,三个页面共享这一份缓存,价格数据整个会话只请求一次;",
  ),
)
children.push(
  bullet(
    "**内存过滤**:四个条件依次判断,未提供的条件自动跳过;日期比较直接使用字符串比较——日期统一为 `YYYY-MM-DD` 格式,字典序即时间序。",
  ),
)
children.push(
  plain(
    "**输出**:`Promise<Product[]>` / `Promise<Market[]>` / `Promise<PriceRecord[]>`(过滤后的价格记录)。",
  ),
)

children.push(h2("5.2 src/components/charts/EChart.tsx — 图表底层封装"))
children.push(
  plain(
    "**输入**:`option: EChartsOption`(图表配置)与 `height`(默认 360)。",
  ),
)
children.push(
  ...code([
    "// 按需注册,控制打包体积",
    "echarts.use([BarChart, LineChart, GridComponent, LegendComponent,",
    "  TooltipComponent, CanvasRenderer])",
    "",
    "export default function EChart({ option, height = 360 }: EChartProps) {",
    "  const containerRef = useRef<HTMLDivElement>(null)",
    "  const chartRef = useRef<echarts.ECharts | null>(null)",
    "",
    "  // 初始化/销毁:整个生命周期只执行一次",
    "  useEffect(() => {",
    "    const el = containerRef.current",
    "    if (!el) return",
    "    const chart = echarts.init(el)",
    "    chartRef.current = chart",
    "    const onResize = () => chart.resize()",
    "    window.addEventListener(\"resize\", onResize)",
    "    return () => {",
    "      window.removeEventListener(\"resize\", onResize)",
    "      chart.dispose()",
    "      chartRef.current = null",
    "    }",
    "  }, [])",
    "",
    "  // option 变化时更新",
    "  useEffect(() => {",
    "    // notMerge 避免筛选切换时旧系列残留",
    "    chartRef.current?.setOption(option, { notMerge: true })",
    "  }, [option])",
    "",
    "  return <div ref={containerRef} style={{ height, width: \"100%\" }} />",
    "}",
  ]),
)
children.push(p("设计意图:"))
children.push(
  bullet(
    "**按需注册**:只 import 本项目用到的 Bar/Line 图表与 Grid/Legend/Tooltip 组件,避免全量 echarts 进包;",
  ),
)
children.push(
  bullet(
    "**init 与 setOption 分离**:`echarts.init` 开销大,放在空依赖 effect 中只执行一次;筛选变化只触发第二个 effect 更新 option;",
  ),
)
children.push(
  bullet(
    "**`notMerge: true`**:默认的 setOption 是合并模式,切换筛选条件时(如产品从 3 个变 1 个)旧系列会残留在图上,`notMerge` 让每次配置整体替换;",
  ),
)
children.push(
  bullet(
    "**resize 监听 + dispose 清理**:窗口缩放自动重绘;组件卸载时移除监听、销毁实例,防止内存泄漏。",
  ),
)
children.push(plain("**输出**:一个自适应的 ECharts 画布(div),业务层只关心 option。"))

children.push(h2("5.3 趋势统计:TrendAnalysis.tsx 聚合 + StatCards.tsx 展示"))
children.push(
  plain(
    "统计卡片的数值不在卡片组件内计算——`StatCards.tsx` 是纯展示组件,聚合发生在趋势页。",
  ),
)
children.push(
  plain(
    "**输入(聚合部分)**:`allPrices`(全量记录)+ 选中产品 / 市场 + `startDate`(由时间范围倒推)。",
  ),
)
children.push(
  ...code([
    "// src/pages/TrendAnalysis.tsx(节选)",
    "const { dates, stats } = useMemo(() => {",
    "  // 按日期聚合选中市场+产品的价格",
    "  const byDate = new Map<string, Map<string, number>>()",
    "  for (const r of allPrices) {",
    "    if (r.date < startDate) continue",
    "    if (r.marketId !== selectedMarketId) continue",
    "    if (!selectedProductIds.includes(r.productId)) continue",
    "    let m = byDate.get(r.date)",
    "    if (!m) { m = new Map(); byDate.set(r.date, m) }",
    "    m.set(r.productId, r.price)",
    "  }",
    "  const sortedDates = [...byDate.keys()].sort()",
    "  dates.push(...sortedDates)",
    "",
    "  for (const p of selectedProducts) {",
    "    const values = sortedDates.map((d) => byDate.get(d)?.get(p.id) ?? null)",
    "    const nums = values.filter((v): v is number => v !== null)",
    "    if (nums.length === 0) continue",
    "    const first = nums[0]",
    "    const last = nums[nums.length - 1]",
    "    stats.push({",
    "      product: p,",
    "      values,",
    "      latest: last,",
    "      max: Math.max(...nums),",
    "      min: Math.min(...nums),",
    "      avg: nums.reduce((s, v) => s + v, 0) / nums.length,",
    "      changePct: ((last - first) / first) * 100,",
    "    })",
    "  }",
    "  return { dates, stats }",
    "}, [allPrices, startDate, selectedMarketId, selectedProductIds, selectedProducts])",
  ]),
)
children.push(p("处理要点:"))
children.push(
  bullet(
    "单次遍历 `allPrices`,按“日期 → (产品 → 价格)”两级 Map 聚合,把 18000 条记录压成小结构;",
  ),
)
children.push(
  bullet(
    "每个产品得到与 `sortedDates` 对齐的 `values` 数组,缺数据的日期为 `null`(折线图断点);",
  ),
)
children.push(
  bullet(
    "`changePct = (末价 − 首价) / 首价 × 100`,即区间涨跌幅;max / min / avg 是区间统计。",
  ),
)
children.push(
  plain(
    "**输入(展示部分)**:`data: StatCardData[]`。红涨绿跌的实现(`cn()` 合并条件类名,`text-destructive` 为红、`text-primary` 为绿,本项目 primary 为绿色系):",
  ),
)
children.push(
  ...code([
    "// src/components/trend/StatCards.tsx(节选)",
    "const up = d.changePct > 0",
    "const down = d.changePct < 0",
    "// 国内行情习惯:红涨绿跌",
    "className={cn(",
    "  \"inline-flex items-center gap-1 text-sm font-medium\",",
    "  up && \"text-destructive\",              // 红",
    "  down && \"text-primary\",                 // 绿",
    "  !up && !down && \"text-muted-foreground\", // 持平灰",
    ")}",
  ]),
)
children.push(
  plain(
    "**输出**:每产品一张卡片——最新价(大号)、区间涨跌(带涨跌箭头与颜色)、最高 / 最低 / 均价三格,响应式栅格(1 / 2 / 3 列)。",
  ),
)

children.push(h2("5.4 src/components/compare/CompareTable.tsx — 列内最低 / 最高高亮"))
children.push(
  plain(
    "**输入**:`data: CompareDatum[]`(每项 = 市场 + 该市场各产品价格)、`products: Product[]`(列)。核心逻辑(完整代码见 4.2 节):先按列求出该产品在所有市场中的最低价与最高价,渲染单元格时与最低 / 最高值比对并加类名。设计要点:",
  ),
)
children.push(
  bullet(
    "**按列计算**:最高 / 最低是“同一产品在不同市场间”的列内比较(而非全表),符合“哪里最便宜 / 最贵”的业务语义;",
  ),
)
children.push(
  bullet(
    "**`min !== max` 防全亮**:若某列所有市场价格完全相同,整列既是最低也是最高,此时不高亮,避免满屏颜色;",
  ),
)
children.push(bullet("`tabular-nums` 等宽数字保证价格列对齐。"))
children.push(
  plain(
    "**输出**:市场行 × 产品列的明细表,含底部“均价”行(`colAvg` 对每列求算术平均)。",
  ),
)

children.push(h2("5.5 其他支撑代码"))
children.push(
  plain("**src/lib/date.ts** — 日期工具。输入 `YYYY-MM-DD` 字符串与偏移天数,输出同格式字符串:"),
)
children.push(
  ...code([
    "// YYYY-MM-DD 加减天数,返回同格式字符串",
    "export function shiftDate(dateStr: string, days: number): string {",
    "  const d = new Date(dateStr + \"T00:00:00\")",
    "  d.setDate(d.getDate() + days)",
    "  const y = d.getFullYear()",
    "  const m = String(d.getMonth() + 1).padStart(2, \"0\")",
    "  const day = String(d.getDate()).padStart(2, \"0\")",
    "  return `${y}-${m}-${day}`",
    "}",
  ]),
)
children.push(
  plain(
    "拼接 `T00:00:00` 按本地时区解析,避免 `new Date(\"YYYY-MM-DD\")` 被按 UTC 解析导致跨日偏移。用途:趋势页由“最新日 − (rangeDays − 1)”倒推区间起点。",
  ),
)
children.push(
  plain(
    "**src/lib/chartColors.ts** — 图表统一色板(6 色:绿 / 蓝 / 琥珀 / 红 / 紫 / 青),柱状图与折线图共用,保证同一产品在两个页面颜色一致;最多选 3 种产品,6 色足够。**src/lib/utils.ts** 的 `cn()` 是 shadcn/ui 约定工具(`clsx` + `tailwind-merge`),用于合并条件类名。",
  ),
)

// ===== 六、数据设计 =====
children.push(h1("六、数据设计"))

children.push(h2("6.1 数据规模(实测)"))
children.push(
  tbl(
    ["项", "值"],
    [
      ["产品数", "20 种(5 个分类 × 4 种)"],
      ["市场数", "10 个(覆盖华北 / 华东 / 华南 / 华中 / 西南 / 西北 / 东北)"],
      ["时间跨度", "最近 90 天(以生成当天为终点)"],
      ["记录总数", "20 × 10 × 90 = 18000 条"],
      ["prices.json 大小", "约 1.4MB(1,458,822 字节)"],
    ],
  ),
)
children.push(
  p(
    "产品清单(基准价,元/公斤):大白菜 2.2、西红柿 6.5、黄瓜 4.8、土豆 3.2、苹果 8.5、香蕉 5.6、橙子 7.2、西瓜 3.0、大米 5.8、小麦 2.9、玉米 2.6、花生 9.5、猪肉 24.0、牛肉 68.0、羊肉 62.0、鸡蛋 9.8、鲤鱼 12.0、草鱼 14.5、鲫鱼 16.0、基围虾 55.0。",
  ),
)
children.push(
  p(
    "市场清单:北京新发地、上海江桥、广州江南、深圳海吉星、杭州农副产品物流中心、郑州万邦、武汉白沙洲、成都农产品中心、西安欣桥、沈阳十二线。",
  ),
)

children.push(h2("6.2 数据生成逻辑"))
children.push(
  p(
    "脚本 `scripts/generate-mock.mjs` 使用 mulberry32 伪随机数发生器 + 固定种子(20260917),每次运行生成的数据完全一致,便于演示与测试复现。每条价格记录的计算公式为:",
  ),
)
children.push(
  ...code(["价格 = 基准价 × 市场因子 × 季节波动 × 长期趋势 × 周末因子 × 随机噪声"]),
)
children.push(
  tbl(
    ["因子", "取值", "含义"],
    [
      ["基准价 basePrice", "2.2 ~ 68.0", "每个产品固定的参考价,贴近真实市场水平"],
      [
        "市场因子 factor",
        "0.92 ~ 1.15",
        "市场间价差:一线城市偏高(上海 1.15、北京 1.08),中西部偏低(沈阳 0.92、西安 0.94)",
      ],
      [
        "季节波动 seasonal",
        "幅度 ±5% ~ 20%",
        "每个产品随机分配振幅 amp 与相位 phase,按正弦函数在 90 天内波动,让各产品曲线形态不同",
      ],
      [
        "长期趋势 trend",
        "90 天累计 −15% ~ +15%",
        "每个产品随机分配漂移率 drift,在 90 天内线性演进,制造上涨 / 下跌品种",
      ],
      ["周末因子 weekend", "1 或 1.012", "周六周日采购需求略高,价格上浮 1.2%"],
      ["随机噪声 noise", "±3%", "每市场每产品每天的独立抖动"],
    ],
  ),
)
children.push(p("关键实现(节选):"))
children.push(
  ...code([
    "const withParams = products.map((p) => ({",
    "  ...p,",
    "  amp: 0.05 + rand() * 0.15, // 季节波动幅度 ±5%~20%",
    "  phase: rand() * Math.PI * 2,",
    "  drift: (rand() - 0.5) * 0.3, // 90 天累计涨跌幅 -15% ~ +15%",
    "}))",
    "",
    "// 今天往前推 90 天,数据始终是“最近 90 天”",
    "const today = new Date()",
    "const dates = []",
    "for (let i = DAYS - 1; i >= 0; i--) {",
    "  const d = new Date(today)",
    "  d.setDate(d.getDate() - i)",
    "  dates.push(fmtDate(d))",
    "}",
    "",
    "for (let di = 0; di < DAYS; di++) {",
    "  const date = dates[di]",
    "  // 周末采购需求略高",
    "  const weekend = [0, 6].includes(new Date(date + \"T00:00:00\").getDay()) ? 1.012 : 1",
    "  for (const p of withParams) {",
    "    const seasonal = 1 + p.amp * Math.sin((2 * Math.PI * di) / DAYS + p.phase)",
    "    const trend = 1 + (p.drift * di) / (DAYS - 1)",
    "    for (const m of markets) {",
    "      const noise = 1 + (rand() - 0.5) * 0.06",
    "      const price =",
    "        Math.round(p.basePrice * m.factor * seasonal * trend * weekend * noise * 100) / 100",
    "      records.push({ productId: p.id, marketId: m.id, date, price })",
    "    }",
    "  }",
    "}",
  ]),
)
children.push(p("最终价格四舍五入保留 2 位小数。"))

children.push(h2("6.3 数据文件结构"))
children.push(
  p(
    "三个 JSON 文件位于 `public/mock/`,构建时原样复制进 dist。products.json(20 项)与 markets.json(10 项)为格式化输出,保留缩进便于人读;字段如下:",
  ),
)
children.push(
  tbl(
    ["文件", "字段", "说明"],
    [
      [
        "products.json",
        "id / name / category / basePrice",
        "唯一标识(英文,作为关联键与 URL 参数)/ 中文名 / 分类 / 基准价(仅用于 mock 生成)",
      ],
      [
        "markets.json",
        "id / name / city / region",
        "唯一标识 / 市场全称 / 城市 / 地区",
      ],
      [
        "prices.json",
        "productId / marketId / date / price",
        "产品 ID / 市场 ID / YYYY-MM-DD 日期 / 价格(元/公斤)",
      ],
    ],
  ),
)
children.push(
  p(
    "prices.json(18000 条)采用紧凑单行格式(无缩进换行)以减小文件体积,记录按“日期 → 产品 → 市场”顺序排列。两个细节:生成脚本中市场还有 `factor` 字段(价格因子),但它只参与生成,写入 markets.json 前被剥离,前端 `Market` 类型中也不存在该字段;`date` 为 `YYYY-MM-DD` 字符串,可直接按字典序比较大小。",
  ),
)

children.push(h2("6.4 重新生成"))
children.push(
  ...code(["node scripts/generate-mock.mjs"]),
)
children.push(
  p(
    "脚本将覆盖 `public/mock/` 下三个文件,并打印统计信息(产品数 × 市场数 × 天数、日期范围)。注意:日期以运行当天的日期为终点,隔一段时间重新生成后,趋势页“近 90 天”区间会整体平移。",
  ),
)

children.push(h2("6.5 如何替换为真实 API(只改 api.ts)"))
children.push(
  p(
    "项目的数据入口集中在 `src/services/api.ts`,页面层只依赖三个函数的返回结构(`Product[]`、`Market[]`、`PriceRecord[]`),因此替换数据源不需要改动任何页面代码。步骤:",
  ),
)
children.push(
  numbered(
    1,
    "**改 `getProducts` / `getMarkets`**:把 `fetchJson` 的地址指向真实 API,字段名若不一致,在函数内做一次映射转换(如把接口的 `product_name` 映射为 `name`),保证返回值仍是 `Product[]` / `Market[]`;",
  ),
)
children.push(
  numbered(
    2,
    "**改 `getPrices`**:真实行情接口通常支持按日期 / 市场 / 产品查询,应把 `PriceQuery` 的条件拼接到请求参数,由服务端过滤,而不是把全量数据拉到前端(真实数据量远超 mock);",
  ),
)
children.push(
  numbered(
    3,
    "**处理缓存**:若接口支持服务端过滤,`pricesCache` 的“全量缓存 + 内存 filter”策略不再适用,改为按查询条件请求;页面层对 `getPrices` 的调用方式不变,仍可照常工作;",
  ),
)
children.push(
  numbered(
    4,
    "**保持类型不变**:只要返回结构仍是 `Product` / `Market` / `PriceRecord`(或经映射转换后一致),全部页面、图表、聚合逻辑零改动。",
  ),
)
children.push(p("示意代码(仅为说明思路,非项目实际代码):"))
children.push(
  ...code([
    "const API_BASE = \"https://api.example.com/v1\"",
    "",
    "export async function getPrices(query: PriceQuery = {}): Promise<PriceRecord[]> {",
    "  const params = new URLSearchParams()",
    "  if (query.productIds?.length) params.set(\"productIds\", query.productIds.join(\",\"))",
    "  if (query.marketIds?.length) params.set(\"marketIds\", query.marketIds.join(\",\"))",
    "  if (query.startDate) params.set(\"start\", query.startDate)",
    "  if (query.endDate) params.set(\"end\", query.endDate)",
    "  const res = await fetch(`${API_BASE}/prices?${params}`)",
    "  if (!res.ok) throw new Error(`加载价格数据失败:${res.status}`)",
    "  return res.json()",
    "}",
  ]),
)
children.push(p("已知说明(如实记录的两处现状):"))
children.push(
  bullet(
    "`types/product.ts` 中 `Product` 声明了 `unit: string`(计量单位)字段,但当前 mock 数据未填充该字段,界面统一显示“元/公斤”,该字段为后续接入真实数据预留;",
  ),
)
children.push(
  bullet(
    "日期字符串 `YYYY-MM-DD` 在全项目中按字符串比较(api.ts 过滤、页面取最大 / 最小日期),因此任何新数据源必须保持此格式,否则比较结果会出错。",
  ),
)

// ===== 七、遇到的问题与解决方案 =====
children.push(h1("七、遇到的问题与解决方案"))
children.push(p("开发过程中遇到的主要问题及解决方案:"))
children.push(
  tbl(
    ["#", "问题", "现象 / 原因", "解决方案"],
    [
      [
        "1",
        "ECharts 5.6 类型声明冲突",
        "BarSeriesOption 等类型若与 EChartsOption 不同源导入,TS 编译报 zrender 类型声明冲突",
        "所有 series 类型与 EChartsOption 从同一入口 echarts 同源导入",
      ],
      [
        "2",
        "构建产物体积过大",
        "初始单 chunk 748KB,超出警告阈值;ECharts 全量引入体积大",
        "① 按需引入(仅注册 Bar/Line 等);② React.lazy 页面懒加载;③ manualChunks 拆 echarts / react 独立 chunk。优化后入口仅 41KB,图表页按需加载",
      ],
      [
        "3",
        "切换筛选后图表残留旧系列",
        "ECharts setOption 默认为合并模式,产品数变少时旧系列不消失",
        "调用 setOption(option, { notMerge: true }) 整体替换",
      ],
      [
        "4",
        "搜索下拉建议点击无效",
        "点击建议项时 input 先触发 blur 收起下拉,onClick 未触发",
        "建议项改用 onMouseDown 处理跳转(先于 blur 执行)",
      ],
      [
        "5",
        "直接刷新子路由返回 404",
        "静态托管默认按文件路径查找,/compare 无对应文件",
        "添加 public/_redirects(内容 /* /index.html 200),由前端路由接管",
      ],
      [
        "6",
        "1.4MB 价格数据被重复请求",
        "每次查询都重新 fetch 全量 prices.json",
        "api.ts 模块级缓存,全量下载一次后内存过滤",
      ],
      [
        "7",
        "Netlify 部署链接访客打不开(401)",
        "Drop 首次生成的带哈希前缀链接是 draft 部署,仅登录者可见",
        "在控制台执行 Promote to production 获得正式公开链接",
      ],
    ],
  ),
)
children.push(p("其他工程防护措施(非故障,但同样值得记录):"))
children.push(
  bullet(
    "React 18 StrictMode 下 effect 会执行两次,数据加载统一使用 `cancelled` 标志,组件卸载后不再 setState,防止竞态;",
  ),
)
children.push(
  bullet(
    "日期统一为 `YYYY-MM-DD` 字符串,全项目按字典序比较,避免时区相关的 Date 解析问题(`shiftDate` 中拼接 `T00:00:00` 按本地时区解析);",
  ),
)
children.push(
  bullet(
    "全站配色遵循国内行情习惯“红涨绿跌”,与通用图表库默认(红跌绿涨)相反,需在组件层显式指定。",
  ),
)

// ===== 八、系统测试与验证 =====
children.push(h1("八、系统测试与验证"))

children.push(h2("8.1 构建验证"))
children.push(
  p(
    "执行 `npm run build`(`tsc -b && vite build`):TypeScript 类型检查零错误通过,Vite 7.3.6 完成 2240 个模块的转换与打包,耗时 2.81 秒。2026 年 9 月 17 日实测产物清单:",
  ),
)
children.push(
  tbl(
    ["产物文件", "体积", "gzip 后", "说明"],
    [
      ["index.html", "0.58 kB", "0.39 kB", "入口页面"],
      ["assets/index-*.css", "27.08 kB", "5.44 kB", "全局样式"],
      ["assets/index-*.js", "41.09 kB", "14.22 kB", "入口 chunk(优化前为 748KB)"],
      ["assets/Home-*.js", "8.42 kB", "3.23 kB", "首页(懒加载)"],
      ["assets/PriceCompare-*.js", "8.09 kB", "3.17 kB", "价格对比页(懒加载)"],
      ["assets/TrendAnalysis-*.js", "7.30 kB", "2.99 kB", "趋势分析页(懒加载)"],
      ["assets/react-*.js", "180.18 kB", "59.44 kB", "React 运行时(独立分包)"],
      ["assets/echarts-*.js", "500.60 kB", "167.58 kB", "ECharts(独立分包,仅图表页加载)"],
    ],
  ),
)
children.push(
  p(
    "验证结论:入口 chunk 41KB,达到体积优化目标(优化前 748KB);ECharts 与 React 运行时被拆为独立 chunk,图表库只在进入图表页时下载;构建无任何报错。",
  ),
)

children.push(h2("8.2 线上页面访问验证"))
children.push(
  p(
    "项目已部署至 Netlify(https://startling-sawine-2b2720.netlify.app)。2026 年 9 月 17 日使用 curl 对四个地址逐一验证,HTTP 状态码均为 200:",
  ),
)
children.push(
  tbl(
    ["验证地址", "预期", "实测"],
    [
      ["/(首页)", "200", "200"],
      ["/compare(价格对比页,深链接)", "200(不因 SPA 刷新而 404)", "200"],
      ["/trend(趋势分析页,深链接)", "200(不因 SPA 刷新而 404)", "200"],
      ["/mock/prices.json(数据文件)", "200(1.4MB 数据可正常获取)", "200"],
    ],
  ),
)
children.push(
  p(
    "验证结论:SPA 深链接刷新正常(`public/_redirects` 生效)、静态数据资源可访问、全站路由可用。",
  ),
)

children.push(h2("8.3 功能验收要点"))
children.push(
  p("依据功能设计,逐项核对线上演示站点的验收要点(对照预期结果检查即可):"),
)
children.push(
  tbl(
    ["#", "验收项", "预期结果"],
    [
      ["1", "首页数据加载", "标题区、五大分类卡片、涨幅榜 / 跌幅榜正常渲染,无报错"],
      ["2", "搜索“猪肉”", "下拉“产品”组出现猪肉,点击跳转 /trend?product=pork 且已选中猪肉"],
      ["3", "搜索“北京”", "下拉“市场”组出现北京新发地,点击跳转 /compare?market=bj_xinfadi 且已选中该市场"],
      ["4", "点击“蔬菜”分类卡片", "跳转 /trend?category=蔬菜,自动选中该分类前 3 种产品"],
      ["5", "异动榜", "涨跌幅与最新两天全市场均价的计算结果一致,涨红跌绿"],
      ["6", "对比页默认状态", "默认 3 产品 5 市场,日期为数据最新一天,图表与表格同步渲染"],
      ["7", "筛选上限", "产品选满 3 个 / 市场选满 6 个后,未选项置灰不可再选"],
      ["8", "明细表高亮", "每列最低价绿、最高价红;整列价格相同(最低 = 最高)时全列不高亮"],
      ["9", "趋势页时间范围", "切换 7 / 30 / 90 天时,统计卡片与折线图随区间重算;Y 轴不从 0 起"],
      ["10", "URL 参数与刷新", "带参数访问 /trend?product=egg 刷新后选择不丢失"],
      ["11", "404 兜底", "访问不存在路径显示 404 页,可一键返回首页"],
      ["12", "移动端(375px)", "汉堡菜单可展开收起;明细表横向滚动;统计卡片单列;图表缩放正常"],
    ],
  ),
)

children.push(h2("8.4 报告插图建议(截图清单)"))
children.push(
  p(
    "报告建议至少包含以下截图(括号内为截图要点),使用 Chrome / Edge 开发者工具的设备模式模拟手机宽度(375px),桌面截图使用 1280px 以上宽度;项目已部署至 Netlify,可直接截线上站点:",
  ),
)
children.push(
  numbered(1, "**首页全貌**:标题区(搜索框)+ 五大分类卡片 + 涨幅榜 / 跌幅榜,展示信息架构;"),
)
children.push(
  numbered(
    2,
    "**搜索交互**:搜索框输入“猪肉”,下拉显示“产品”组(猪肉)与“市场”组建议,体现分组与直达跳转;",
  ),
)
children.push(
  numbered(
    3,
    "**价格对比页全貌**:筛选器(产品 3 个已选、市场 5 个已选、日期)+ 柱状对比图 + 价格明细表;",
  ),
)
children.push(
  numbered(
    4,
    "**明细表高亮细节**:放大表格某一产品列,标出绿色最低价与红色最高价单元格;",
  ),
)
children.push(
  numbered(
    5,
    "**趋势分析页全貌**:筛选器(市场单选 + 时间范围)+ 统计卡片 + 多产品折线图;",
  ),
)
children.push(
  numbered(
    6,
    "**统计卡片细节**:放大一张卡片,标出红色“+”涨幅(或绿色跌幅)、最新价、最高 / 最低 / 均价三格;",
  ),
)
children.push(
  numbered(
    7,
    "**移动端适配**(可选):浏览器设备模拟模式下,首页汉堡菜单展开状态、对比页表格横向滚动;",
  ),
)
children.push(numbered(8, "**404 页面**(可选):访问不存在路径的兜底页面。"))

// ===== 九、总结与展望 =====
children.push(h1("九、总结与展望"))
children.push(
  p(
    "**已实现**:本项目完成了完整的三页面 SPA(搜索 / 比价 / 走势)、18000 条演示数据的生成与管理、ECharts 可视化(分组柱状图 / 平滑折线图)、跨页面参数化跳转(URL 即状态)、移动端响应式适配、构建优化(路由懒加载 + 分包,入口 748KB → 41KB)与线上部署。项目体现了“数据层与展示层分离”的设计——未来接入真实数据只需修改 `api.ts` 一个文件,页面层零改动。",
  ),
)
children.push(p("**不足与展望**:"))
children.push(
  numbered(
    1,
    "**真实数据接入**:当前为演示数据;已预留接口层,可对接新发地、农业农村部等公开行情,或第三方行情 API;",
  ),
)
children.push(
  numbered(2, "**功能增强**:价格预警(跌破 / 涨破阈值推送)、产品收藏、对比结果 CSV 导出;"),
)
children.push(
  numbered(
    3,
    "**时间维度扩展**:当前数据覆盖 90 天,可扩展多年历史数据,并给折线图增加 dataZoom 缩放交互;",
  ),
)
children.push(
  numbered(
    4,
    "**性能**:若真实数据量大幅增长,可将“全量下载 + 内存过滤”改为服务端分页查询,页面层无需改动;",
  ),
)
children.push(
  numbered(5, "**工程化**:补充单元测试(聚合逻辑)与 CI/CD 自动部署。"),
)

// ===== 参考文献 =====
children.push(h1("参考文献"))
children.push(
  plain("[1] React 官方文档. https://react.dev"),
)
children.push(plain("[2] TypeScript 官方文档. https://www.typescriptlang.org/docs/"))
children.push(plain("[3] Vite 官方文档. https://vite.dev/guide/"))
children.push(plain("[4] Tailwind CSS v4 官方文档. https://tailwindcss.com/docs"))
children.push(plain("[5] ECharts 5 官方文档. https://echarts.apache.org/zh/index.html"))
children.push(plain("[6] React Router 官方文档. https://reactrouter.com/"))
children.push(plain("[7] shadcn/ui 官方文档. https://ui.shadcn.com/docs"))
children.push(
  plain(
    "[8] MDN Web Docs — Fetch API. https://developer.mozilla.org/docs/Web/API/Fetch_API",
  ),
)

// ---------- 生成 ----------
const doc = new Document({
  creator: "农价通项目",
  title: "农价通——农产品价格对比与趋势分析系统 实验报告",
  styles: {
    default: {
      document: { run: { font: F_BODY, size: 24, color: BLACK } },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      children,
    },
  ],
})

Packer.toBuffer(doc).then((buf) => {
  writeFileSync(OUT, buf)
  console.log(`已生成:${OUT}`)
  console.log(`文件大小:${(buf.length / 1024).toFixed(1)} KB`)
  console.log(`中文字符(含标点、表格、代码注释):${cnChars} 字`)
  console.log(`总字符数(含代码与英文):${totalChars} 字符`)
})

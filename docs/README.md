# 农价通(agri-price-tracker)— 农产品价格对比与趋势分析

> **本文档目的**:项目总览。让读者在最短时间内了解:这个项目是什么、能做什么、用了什么技术、如何在本地运行、代码如何组织、如何部署上线。各专题的详细说明见本目录其余文档:
>
> - [功能说明.md](./功能说明.md)— 三个页面逐项交互说明
> - [架构设计.md](./架构设计.md)— 分层架构、数据流、关键设计决策
> - [核心代码讲解.md](./核心代码讲解.md)— 关键文件逐段讲解
> - [数据说明.md](./数据说明.md)— mock 数据设计与替换真实 API 的方法
> - [实验报告素材.md](./实验报告素材.md)— 报告写作素材

## 1. 项目简介

**农价通**是一个农产品价格对比与趋势分析 Web 应用:汇总 **20 种常见农产品**在**全国 10 个主要批发市场**的每日价格(覆盖最近 90 天,共 18000 条价格记录),提供两大核心能力:

- **价格对比**:同一天、不同市场之间,某种(或某几种)农产品哪里最便宜、哪里最贵;
- **趋势分析**:某个市场内,多产品价格在近 7 天 / 30 天 / 90 天 / 1 年内的走势与涨跌幅。

当前数据为本地生成的演示数据(mock),数据接口已与页面隔离,替换为真实行情 API 时只需修改一个文件(见[数据说明.md](./数据说明.md)第 5 节)。

- 线上演示:**https://startling-sawine-2b2720.netlify.app**
- 界面语言:中文;配色遵循国内行情习惯(**红涨绿跌**)

## 2. 功能特性

### 首页
- **搜索**:按名称/ID 搜索产品,按名称/城市搜索市场;下拉建议分组展示,点击直达对应分析页
- **分类浏览**:蔬菜 / 水果 / 粮油 / 肉禽蛋 / 水产五大分类入口,每个入口显示该类产品数量
- **价格异动**:涨幅榜 Top5、跌幅榜 Top5(口径:最新日较前一日、全市场均价),点击直达趋势页

### 价格对比页
- 选择 1~3 种产品、1~6 个市场、任意一个数据日期
- 分组柱状图:同一产品在各市场的价格并排对比
- 价格明细表:每列**最低价绿色加粗、最高价红色加粗**,附各列均价行

### 趋势分析页
- 选择 1~3 种产品、1 个市场、时间范围(近 7 天 / 30 天 / 90 天 / 1 年)
- 统计卡片:最新价、区间涨跌、区间最高 / 最低 / 均价
- 多产品折线图:走势叠加对比

### 全局
- 响应式布局:移动端汉堡菜单、表格横向滚动、图表自适应
- 404 页面、全局加载中 / 加载失败状态

## 3. 技术栈

| 技术 | 版本(package.json) | 用途 |
|---|---|---|
| React / React DOM | ^18.3.1 | UI 框架(函数组件 + Hooks) |
| TypeScript | ~5.8.3 | 类型安全,全局类型集中于 `src/types/`,代码中禁止 `any` |
| Vite | ^7.0.0(实测 7.3.6) | 开发服务器与构建 |
| @vitejs/plugin-react | ^5.0.0 | Vite 的 React 插件 |
| Tailwind CSS | ^4.1.0 | 原子化样式(Tailwind v4,经 `@tailwindcss/vite` 接入,无需 config 文件) |
| shadcn/ui | — | 基础组件(button / card / table),基于 Radix Slot + CVA |
| lucide-react | ^0.525.0 | 图标 |
| ECharts | ^5.6.0 | 图表渲染(按需引入,仅注册 Bar / Line 等) |
| react-router-dom | ^7.7.0 | 路由与跨页参数传递 |

## 4. 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器(默认 http://localhost:5173,端口被占用时自动顺延)
npm run dev

# 类型检查 + 打包,产物输出到 dist/
npm run build

# 本地预览构建产物
npm run preview
```

重新生成演示数据(可选,固定随机种子、结果可复现):

```bash
node scripts/generate-mock.mjs
```

## 5. 目录结构

```
agri-price-tracker/
├── public/
│   ├── _redirects                    # Netlify SPA 重定向规则(构建时复制进 dist/)
│   ├── favicon.svg                   # 站点图标
│   └── mock/                         # 演示数据
│       ├── products.json             # 20 种农产品(名称/分类/基准价)
│       ├── markets.json              # 10 个批发市场(名称/城市/地区)
│       └── prices.json               # 18000 条价格记录(约 1.4MB,紧凑格式)
├── scripts/
│   └── generate-mock.mjs             # mock 数据生成脚本(固定种子,可复现)
├── src/
│   ├── components/
│   │   ├── charts/
│   │   │   └── EChart.tsx            # ECharts 通用封装(按需注册、窗口缩放自适应)
│   │   ├── compare/                  # 价格对比页组件
│   │   │   ├── ProductMarketPicker.tsx  # 产品/市场/日期筛选器
│   │   │   ├── CompareChart.tsx      # 分组柱状图
│   │   │   └── CompareTable.tsx      # 价格明细表(最低/最高高亮)
│   │   ├── home/                     # 首页组件
│   │   │   ├── SearchBar.tsx         # 搜索框 + 下拉建议
│   │   │   ├── CategoryGrid.tsx      # 五大分类入口
│   │   │   └── MoverList.tsx         # 涨跌异动榜
│   │   ├── layout/
│   │   │   ├── Header.tsx            # 顶部导航(桌面导航 + 移动端汉堡菜单)
│   │   │   └── Footer.tsx            # 页脚
│   │   ├── shared/
│   │   │   └── ProductPicker.tsx     # 产品多选器(对比页与趋势页共用)
│   │   ├── trend/                    # 趋势分析页组件
│   │   │   ├── TrendFilter.tsx       # 产品/市场/时间范围筛选器
│   │   │   ├── StatCards.tsx         # 统计卡片
│   │   │   └── TrendChart.tsx        # 多产品折线图
│   │   └── ui/                       # shadcn/ui 基础组件(button/card/table)
│   ├── layouts/
│   │   └── MainLayout.tsx            # 全局布局(Header + 内容区 + Footer)
│   ├── lib/
│   │   ├── chartColors.ts            # 图表统一色板
│   │   ├── date.ts                   # 日期工具
│   │   └── utils.ts                  # cn() 类名合并工具
│   ├── pages/
│   │   ├── Home.tsx                  # 首页
│   │   ├── PriceCompare.tsx          # 价格对比页
│   │   ├── TrendAnalysis.tsx         # 趋势分析页
│   │   └── NotFound.tsx              # 404 页
│   ├── services/
│   │   └── api.ts                    # 唯一数据入口(替换真实 API 只改这里)
│   ├── types/                        # 全局类型定义
│   │   ├── product.ts                # Product / ProductCategory
│   │   ├── market.ts                 # Market
│   │   └── price.ts                  # PriceRecord / PriceQuery
│   ├── App.tsx                       # 路由表 + 页面懒加载
│   ├── main.tsx                      # 应用入口(BrowserRouter)
│   └── index.css                     # Tailwind 入口与主题变量
├── vite.config.ts                    # @ 别名、构建分包配置
├── components.json                   # shadcn/ui 配置
├── package.json
└── .gitignore
```

## 6. 部署说明(Netlify)

1. 本地执行 `npm run build`,得到 `dist/` 目录;
2. 打开 Netlify Drop(https://app.netlify.com/drop),把 `dist/` 文件夹拖入页面,即可获得一个部署链接;
3. **SPA 深链接**:项目已内置 `public/_redirects`(内容为 `/* /index.html 200`),构建时自动复制进 dist,因此直接访问或刷新 `/compare`、`/trend` 不会 404;
4. **注意**:Drop 首次生成的链接带有哈希前缀,属于 draft 部署,仅登录者本人可见(访客会看到 401);需在部署详情页执行 **Promote to production**,得到不带前缀的正式链接再对外分享。

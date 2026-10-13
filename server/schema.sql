-- 农价通本地 SQLite 结构(由 seed.ts 执行;--reset 时先 DROP 再按本文件重建)。
-- 列名保持 camelCase:SQLite 结果集 key 原样保留声明时的大小写,与前端 JSON 字段零映射对接。
-- ord 列保存源 JSON 数组下标,用于还原 prices.json 的行序(date → 品种序 → 市场序),
-- 保证 /api/prices 全量响应与 public/mock/prices.json 逐字节一致。

CREATE TABLE IF NOT EXISTS products (
  id        TEXT PRIMARY KEY,
  name      TEXT    NOT NULL,
  category  TEXT    NOT NULL,
  basePrice REAL    NOT NULL,
  ord       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS markets (
  id     TEXT PRIMARY KEY,
  name   TEXT NOT NULL,
  city   TEXT NOT NULL,
  region TEXT NOT NULL,
  ord    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS prices (
  productId  TEXT    NOT NULL REFERENCES products(id),
  marketId   TEXT    NOT NULL REFERENCES markets(id),
  date       TEXT    NOT NULL,      -- YYYY-MM-DD,字典序即时间序
  price      REAL    NOT NULL,      -- 元/公斤
  "real"     INTEGER,               -- 1 = 官方上报真值;NULL = 模拟数据(输出时必须省略该字段)
  productOrd INTEGER NOT NULL,
  marketOrd  INTEGER NOT NULL,
  PRIMARY KEY (productId, marketId, date)
) WITHOUT ROWID;

-- 全量/日期区间查询的排序依据(3.5 万行,索引开销可忽略)
CREATE INDEX IF NOT EXISTS idx_prices_order ON prices(date, productOrd, marketOrd);

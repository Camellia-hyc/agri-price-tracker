// 本地后端入口:组装 Repo(node:sqlite)与 Hono 应用,监听端口。
// 首次启动自动建库导入;数据更新(爬虫产出新的 public/mock/*.json)后
// 重新运行 npm run server:seed 即可同步。
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { serve } from "@hono/node-server"
import { createApp } from "./app.ts"
import { createRepo } from "./db.ts"
import { seedDatabase } from "./seed.ts"

const PORT = Number(process.env.PORT ?? 8787) // 8787 = wrangler dev 默认端口,保持与未来云端形态一致
const DB_PATH = fileURLToPath(new URL("./data.sqlite", import.meta.url)) // 基于文件位置解析,换目录启动也不跑偏

if (!existsSync(DB_PATH)) {
  console.log("[server] 未发现本地数据库,开始首次导入…")
  seedDatabase(DB_PATH)
}

serve({ fetch: createApp(createRepo(DB_PATH)).fetch, port: PORT }, (info) => {
  console.log(`[server] 农价通后端已启动:http://localhost:${info.port}(db=${DB_PATH})`)
  console.log("[server] 数据更新后重跑 npm run server:seed 重新导入")
})

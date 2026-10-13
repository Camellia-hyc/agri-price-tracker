// 演示/开发前的数据同步检查:
//   数据库不存在 → 首次导入;爬虫更新过 public/mock(以 prices.json 时间为准)→ 重新导入。
//   否则跳过,秒级返回。
// 由 scripts/demo.cmd 调用;也可单独运行:node scripts/ensure-seed.mjs
import { existsSync, statSync } from "node:fs"
import { execSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))
const dbPath = fileURLToPath(new URL("../server/data.sqlite", import.meta.url))
const pricesPath = fileURLToPath(new URL("../public/mock/prices.json", import.meta.url))

const stamp = (p) => {
  const d = new Date(statSync(p).mtimeMs)
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const fresh = existsSync(dbPath) && statSync(dbPath).mtimeMs >= statSync(pricesPath).mtimeMs
if (fresh) {
  console.log(`[demo] 数据库已是最新(同步于 ${stamp(dbPath)}),跳过导入`)
  process.exit(0)
}

console.log(existsSync(dbPath) ? "[demo] 数据有更新,重新导入…" : "[demo] 未发现本地数据库,首次导入…")
execSync("npm run server:seed", { stdio: "inherit", cwd: root })

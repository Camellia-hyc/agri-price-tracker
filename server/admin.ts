// 管理员接口(挂 /api/admin/*,requireAdmin 统一把关):
//   用户管理:列表 / 改角色 / 删除(均禁止操作自己)
//   价格数据:改价·新增(upsert;人工录入视为真值 real=1)/ 删除单条
// 仅本地后端模式使用;线上静态版不涉及本模块。
import { Hono } from "hono"
import type { Repo } from "./app.ts"
import { requireAdmin } from "./auth.ts"
import { isValidDate, readJson } from "./validation.ts"

export function createAdminRoutes(repo: Repo): Hono {
  const app = new Hono()
  app.use("*", requireAdmin(repo))

  app.get("/users", async (c) => c.json(await repo.listUsers()))

  app.patch("/users/:id", async (c) => {
    const me = c.get("authUser")
    const id = Number(c.req.param("id"))
    if (!Number.isInteger(id)) return c.json({ error: "用户 id 非法" }, 400)
    if (id === me.id) return c.json({ error: "不能修改自己的角色" }, 400)
    const body = await readJson(c)
    const role = body?.role
    if (role !== "user" && role !== "admin") return c.json({ error: "role 只能是 user 或 admin" }, 400)
    if (!(await repo.updateUserRole(id, role))) return c.json({ error: "用户不存在" }, 404)
    return c.json({ ok: true })
  })

  app.delete("/users/:id", async (c) => {
    const me = c.get("authUser")
    const id = Number(c.req.param("id"))
    if (!Number.isInteger(id)) return c.json({ error: "用户 id 非法" }, 400)
    if (id === me.id) return c.json({ error: "不能删除自己的账号" }, 400)
    if (!(await repo.deleteUser(id))) return c.json({ error: "用户不存在" }, 404)
    return c.json({ ok: true })
  })

  // 改价/新增一条价格(存在则更新)。real=1:人工录入视为与官方真值同级的可信数据。
  app.put("/prices", async (c) => {
    const body = await readJson(c)
    const productId = typeof body?.productId === "string" ? body.productId : ""
    const marketId = typeof body?.marketId === "string" ? body.marketId : ""
    const date = typeof body?.date === "string" ? body.date : ""
    const price = typeof body?.price === "number" ? body.price : Number.NaN
    if (!isValidDate(date)) return c.json({ error: "date 格式应为 YYYY-MM-DD" }, 400)
    if (!Number.isFinite(price) || price <= 0) return c.json({ error: "price 应为正数" }, 400)
    if (!(await repo.listProducts()).some((p) => p.id === productId)) {
      return c.json({ error: "未知 productId" }, 400)
    }
    if (!(await repo.listMarkets()).some((m) => m.id === marketId)) {
      return c.json({ error: "未知 marketId" }, 400)
    }
    await repo.upsertPrice({ productId, marketId, date, price })
    return c.json({ ok: true, productId, marketId, date, price })
  })

  app.delete("/prices", async (c) => {
    const productId = c.req.query("productId") ?? ""
    const marketId = c.req.query("marketId") ?? ""
    const date = c.req.query("date") ?? ""
    if (!productId || !marketId || !isValidDate(date)) {
      return c.json({ error: "须提供 productId、marketId 与合法 date(YYYY-MM-DD)" }, 400)
    }
    if (!(await repo.deletePrice({ productId, marketId, date }))) {
      return c.json({ error: "该价格记录不存在" }, 404)
    }
    return c.json({ ok: true })
  })

  return app
}

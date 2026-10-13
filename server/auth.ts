// 注册/登录/会话:JWT(HS256,honn 自带 hono/utils/jwt)+ scrypt 密码哈希(见 password.ts)。
// 中间件自写、不抛 HTTPException —— 项目 app.onError 会把 HTTPException 兜成 500,
// 因此这里一律"返回响应"而不 throw(与现有"判别联合"风格一致)。
// 仅本地后端模式使用;线上静态版不涉及本模块。
import { Hono } from "hono"
import type { Context, Next } from "hono"
import { Jwt } from "hono/utils/jwt"
import type { Repo } from "./app.ts"
import type { PublicUser } from "../src/types/user.ts"
import { hashPassword, verifyPassword } from "./password.ts"
import { readJson } from "./validation.ts"

// 仅本地演示:密钥可用 JWT_SECRET 环境变量覆盖
const SECRET = process.env.JWT_SECRET ?? "agri-price-tracker-dev-secret"
const TOKEN_TTL_SEC = 7 * 24 * 60 * 60 // 7 天

const USERNAME_RE = /^[\w一-龥-]{2,20}$/ // 中文/字母/数字/下划线/连字符,2~20 字符

declare module "hono" {
  interface ContextVariableMap {
    authUser: PublicUser
  }
}

async function issueToken(user: PublicUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return Jwt.sign({ sub: String(user.id), exp: now + TOKEN_TTL_SEC, iat: now }, SECRET, "HS256")
}

// 解析 Authorization: Bearer <token>;任何失败返回 null(过期/签名不符/用户已被删)
async function authenticate(c: Context, repo: Repo): Promise<PublicUser | null> {
  const header = c.req.header("Authorization")
  if (!header?.startsWith("Bearer ")) return null
  const token = header.slice("Bearer ".length).trim()
  if (!token) return null
  try {
    const payload = await Jwt.verify(token, SECRET, "HS256")
    const id = Number(payload.sub)
    if (!Number.isInteger(id)) return null
    return await repo.findUserById(id) // 回查数据库:改角色/删号即时生效,不信任 payload 内容
  } catch {
    return null
  }
}

export function requireAuth(repo: Repo) {
  return async (c: Context, next: Next) => {
    const user = await authenticate(c, repo)
    if (!user) return c.json({ error: "未登录或登录已过期" }, 401)
    c.set("authUser", user)
    await next()
  }
}

export function requireAdmin(repo: Repo) {
  return async (c: Context, next: Next) => {
    const user = await authenticate(c, repo)
    if (!user) return c.json({ error: "未登录或登录已过期" }, 401)
    if (user.role !== "admin") return c.json({ error: "需要管理员权限" }, 403)
    c.set("authUser", user)
    await next()
  }
}

export function createAuthRoutes(repo: Repo): Hono {
  const app = new Hono()

  // 注册:默认普通用户角色(管理员可在后台调整)
  app.post("/register", async (c) => {
    const body = await readJson(c)
    const username = typeof body?.username === "string" ? body.username.trim() : ""
    const password = typeof body?.password === "string" ? body.password : ""
    if (!USERNAME_RE.test(username)) {
      return c.json({ error: "用户名需 2~20 个字符(中文、字母、数字、下划线或连字符)" }, 400)
    }
    if (password.length < 6 || password.length > 72) return c.json({ error: "密码长度需 6~72 位" }, 400)
    if (await repo.findUserByUsername(username)) return c.json({ error: "该用户名已被注册" }, 409)

    const user = await repo.createUser(username, hashPassword(password), "user")
    return c.json({ token: await issueToken(user), user }, 201)
  })

  // 登录:统一报"用户名或密码错误",不泄漏账号是否存在
  app.post("/login", async (c) => {
    const body = await readJson(c)
    const username = typeof body?.username === "string" ? body.username.trim() : ""
    const password = typeof body?.password === "string" ? body.password : ""
    const row = username ? await repo.findUserByUsername(username) : null
    if (!row || !verifyPassword(password, row.passwordHash)) {
      return c.json({ error: "用户名或密码错误" }, 401)
    }
    const user: PublicUser = { id: row.id, username: row.username, role: row.role, createdAt: row.createdAt }
    return c.json({ token: await issueToken(user), user })
  })

  // 当前登录用户(前端启动时用它恢复会话)
  app.get("/me", requireAuth(repo), (c) => c.json({ user: c.get("authUser") }))

  return app
}

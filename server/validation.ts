// 通用输入校验小工具(独立文件,避免 app/auth/admin 之间循环引用)。
import type { Context } from "hono"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false
  // 仅正则不够:Date.parse("2026-02-31") 会回滚为 3 月 3 日而不是 NaN,必须往返校验
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

// 解析 JSON 请求体;非对象/解析失败返回 null(由调用方决定如何报错)
export async function readJson(c: Context): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await c.req.json()
    return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

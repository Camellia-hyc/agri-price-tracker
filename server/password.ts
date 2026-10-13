// 密码哈希:node 内置 scrypt(零依赖,延续项目"不引原生模块"的原则)。
// 存储格式 scrypt$N$r$p$saltHex$hashHex —— 参数随哈希一起存,日后调参不影响旧行验证。
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

const N = 16384 // CPU/内存代价 2^14(内存 ≈ 128·N·r = 16MB,低于 scrypt 默认 maxmem 32MB)
const R = 8
const P = 1
const KEYLEN = 64

export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, KEYLEN, { N, r: R, p: P })
  return `scrypt$${N}$${R}$${P}$${salt.toString("hex")}$${hash.toString("hex")}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$")
  if (parts.length !== 6 || parts[0] !== "scrypt") return false
  const [, n, r, p, saltHex, hashHex] = parts
  const expected = Buffer.from(hashHex, "hex")
  if (!expected.length) return false
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  })
  // timingSafeEqual 要求等长,必须先比长度(否则直接抛异常)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

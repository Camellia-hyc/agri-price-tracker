/** 解析逗号分隔的 id 列表:去空白、去重、过滤非法值、按 max 截断 */
export function parseIdList(
  raw: string | null,
  isValid: (id: string) => boolean,
  max: number,
): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(",")) {
    const id = part.trim()
    if (!id || seen.has(id) || !isValid(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= max) break
  }
  return out
}

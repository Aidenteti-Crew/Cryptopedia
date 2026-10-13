// Rules every stored event field must satisfy so the frontend schema
// (apps/web/lib/cryptopedia-types.ts eventEntrySchema) accepts the whole feed: one bad item makes
// the frontend reject the entire response, so invalid values become null instead.

// Meeting links are private by nature (the event contract forbids storing them), and these query
// keys carry credentials. A URL with either is dropped entirely rather than half-cleaned.
const MEETING_HOSTS = [
  'zoom.us',
  'zoom.com',
  'meet.google.com',
  'teams.microsoft.com',
  'teams.live.com',
  'webex.com',
  'whereby.com',
  'meet.jit.si',
  'discord.gg',
]
const SECRET_PARAMS =
  /^(pwd|pass|password|token|access_token|auth|key|apikey|api_key|sig|signature|secret|code)$/i

export function safePublicUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (url.username || url.password) return null
  const host = url.hostname.toLowerCase()
  if (MEETING_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return null
  for (const key of url.searchParams.keys()) {
    if (SECRET_PARAMS.test(key)) return null
  }
  return trimmed.length > 1000 ? null : trimmed
}

export function cleanTags(tags: readonly unknown[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const tag of tags) {
    if (typeof tag !== 'string') continue
    const trimmed = tag.trim().slice(0, 50)
    const key = trimmed.toLowerCase()
    if (!trimmed || seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
    if (out.length === 10) break
  }
  return out
}

export function nonEmpty(value: string | null | undefined, max: number): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

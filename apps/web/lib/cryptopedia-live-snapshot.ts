/* API 서버 없이 배포할 때(NEXT_PUBLIC_API_URL 미설정) LIVE 화면이 읽는 굳힌 응답.
   API 요청 주소(/api/ecosystem/…, /api/events?status=…)를 public/cryptopedia/live/*.json 으로 바꿔 읽고,
   limit 만큼 잘라 한 페이지로 돌려준다. 파일은 scripts/snapshot-live-feed.mjs 로 만든다.
   API 와 같은 모양의 응답이라 cryptopedia-data.ts 의 검증·화면 코드는 그대로 쓴다. */

export const LIVE_SNAPSHOT_DIR = '/cryptopedia/live'

export function snapshotFileFor(url: string): string | null {
  const parsed = new URL(url, 'http://snapshot.local')
  if (!parsed.pathname.startsWith('/api/')) return null
  const path = parsed.pathname.slice('/api/'.length)
  if (path === 'ecosystem/projects') return 'ecosystem-projects.json'
  if (path === 'ecosystem/macro') return 'ecosystem-macro.json'
  if (path === 'ecosystem/updates') return 'ecosystem-updates.json'
  if (path === 'events') return `events-${parsed.searchParams.get('status') ?? 'upcoming'}.json`
  return null
}

export function createSnapshotFetch(fetchImpl: typeof fetch = fetch): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const file = snapshotFileFor(url)
    if (!file) return fetchImpl(input, init)
    const response = await fetchImpl(`${LIVE_SNAPSHOT_DIR}/${file}`)
    if (!response.ok) return response
    const data = (await response.json()) as { items: unknown[] }
    const limit = Number(new URL(url, 'http://snapshot.local').searchParams.get('limit'))
    return Response.json({
      ...data,
      items: limit > 0 ? data.items.slice(0, limit) : data.items,
      nextCursor: null,
    })
  }) as typeof fetch
}

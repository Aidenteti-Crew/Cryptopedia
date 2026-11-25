import type { QueryFn } from '../db/query.js'

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

// event-us.kr pages carry the host's cover as og:image on Eventus's own storage.
const EVENTUS_PAGE = /^https:\/\/(www\.)?event-us\.kr\//
const OG_IMAGE = /<meta[^>]+property="og:image"[^>]+content="(https:\/\/eventusstorage\.blob\.core\.windows\.net\/[^"]+)"/

export function eventUsCoverUrl(html: string): string | null {
  return OG_IMAGE.exec(html)?.[1]?.replace(/&amp;/g, '&') ?? null
}

export interface AttachCoversResult {
  checked: number
  attached: number
}

// Events written by the classifier (notice boards) have no cover. Those whose sign-up page is on
// Eventus get its cover here. Only events that are not over yet are looked at, a few per run, and a
// page that fails is tried again on the next run.
export async function attachEventCovers(
  query: QueryFn,
  fetchFn: FetchLike = fetch,
  limit = 30
): Promise<AttachCoversResult> {
  const { rows } = await query(
    `SELECT id, registration_url, source_url FROM content.chain_event
      WHERE image_url IS NULL AND revoked_at IS NULL
        AND COALESCE(ends_at, starts_at) >= now() - interval '1 day'
        AND (registration_url ~ '^https://(www\\.)?event-us\\.kr/'
             OR source_url ~ '^https://(www\\.)?event-us\\.kr/')
      ORDER BY starts_at
      LIMIT $1`,
    [limit]
  )
  let attached = 0
  for (const row of rows as { id: string; registration_url: string | null; source_url: string | null }[]) {
    const page = [row.registration_url, row.source_url].find((u) => u && EVENTUS_PAGE.test(u))!
    try {
      const response = await fetchFn(page, {
        headers: { 'User-Agent': 'cryptopedia-crawler', Accept: 'text/html' },
        signal: AbortSignal.timeout(20_000),
      })
      const cover = response.ok ? eventUsCoverUrl(await response.text()) : null
      if (!cover) continue
      await query('UPDATE content.chain_event SET image_url = $2 WHERE id = $1 AND image_url IS NULL', [
        row.id,
        cover,
      ])
      attached++
    } catch {
      continue
    }
  }
  return { checked: rows.length, attached }
}

import { parse, type HTMLElement } from 'node-html-parser'

import type { BoardLayout, SourceConfig } from '../config/source-config.js'
import type { AdapterCursor, CollectionResult, NormalizedArticle } from '../ingestion/contracts.js'
import { applyKeywordFilter } from '../ingestion/keyword-filter.js'
import { normalizeUrl } from '../ingestion/normalize.js'

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>
type SleepFn = (ms: number) => Promise<void>

// Site operators should be able to tell who is reading their board and how to reach them.
// CRAWLER_CONTACT is a URL or e-mail of the team; without it only the bot name is sent.
function userAgent(): string {
  const contact = process.env.CRAWLER_CONTACT?.trim()
  return `ChaineryBot/0.1 (notice collector${contact ? `; +${contact}` : ''})`
}
const REJECTED_SAMPLE_SIZE = 5

export interface BoardListItem {
  title: string
  url: string
  date: string // YYYY-MM-DD as printed on the board
}

export interface BoardRejections {
  noKeyword: number
  excluded: number
  // A few rejected titles per run, so a missed relevant post shows up when someone looks.
  sampleTitles: string[]
}

export interface BoardCollectionResult extends CollectionResult {
  rejected: BoardRejections
}

// "td.sbj a@href" → selector "td.sbj a", attribute "href". No "@" → the element's text.
function select(root: HTMLElement, spec: string): string {
  const at = spec.lastIndexOf('@')
  const [selector, attr] = at > 0 ? [spec.slice(0, at), spec.slice(at + 1)] : [spec, null]
  const el = root.querySelector(selector)
  if (!el) return ''
  return (attr ? el.getAttribute(attr) ?? '' : el.text).replace(/\s+/g, ' ').trim()
}

function postUrl(href: string, pageUrl: string, layout: BoardLayout): string | null {
  if (layout.linkIdPattern && layout.detailUrl) {
    const id = new RegExp(layout.linkIdPattern).exec(href)?.[1]
    if (!id) return null
    return new URL(layout.detailUrl.replace('{id}', encodeURIComponent(id)), pageUrl).toString()
  }
  if (href.startsWith('#') || href.startsWith('javascript:')) return null
  const url = new URL(href, pageUrl)
  for (const param of layout.dropLinkParams) url.searchParams.delete(param)
  return url.toString()
}

function boardDate(text: string): string | null {
  const [, year, month, day] = /(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/.exec(text) ?? []
  if (!year || !month || !day) return null
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

export function parseBoardList(html: string, pageUrl: string, layout: BoardLayout): BoardListItem[] {
  const root = parse(html)
  const items: BoardListItem[] = []
  for (const row of root.querySelectorAll(layout.listItem)) {
    const title = select(row, layout.title)
    const href = select(row, layout.link)
    const date = boardDate(select(row, layout.date))
    const url = href ? postUrl(href, pageUrl, layout) : null
    if (!title || !url || !date) continue
    items.push({ title, url, date })
  }
  return items
}

// Body text only. Attachments (HWP/PDF) are not read; their links stay on the source page.
export function parseBoardDetail(html: string, layout: BoardLayout): string {
  const body = parse(html).querySelector(layout.detailBody)
  if (!body) return ''
  for (const el of body.querySelectorAll('script, style')) el.remove()
  return body.structuredText
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line !== '')
    .join('\n')
}

function pageUrl(source: SourceConfig, layout: BoardLayout, page: number): string {
  const url = new URL(source.url)
  url.searchParams.set(layout.pageParam, String(page))
  return url.toString()
}

const defaultSleep: SleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// A server-rendered notice board, described by selectors in sources.yaml instead of code per
// site. Lists up to maxPages pages, fetches the body of every post dated on or after the cursor
// (the newest date seen last run — boards have no time, so that day is read again and the
// article insert drops what is already stored), and keeps posts that pass the keyword filter.
// Pinned posts that sit on top of the list with old dates fall before the cursor and are skipped.
export class HtmlBoardAdapter {
  constructor(
    private readonly fetchFn: FetchLike = fetch,
    private readonly sleep: SleepFn = defaultSleep
  ) {}

  private async get(url: string, layout: BoardLayout): Promise<string> {
    const response = await this.fetchFn(url, {
      headers: { 'User-Agent': userAgent(), Accept: 'text/html' },
    })
    if (!response.ok) {
      throw new Error(`Board fetch failed: ${response.status} ${response.statusText} (${url})`)
    }
    return new TextDecoder(layout.encoding).decode(await response.arrayBuffer())
  }

  async collect(source: SourceConfig, cursor: AdapterCursor = {}): Promise<BoardCollectionResult> {
    const layout = source.board
    const keywords = source.keywords
    if (source.adapter !== 'HTML_BOARD' || !layout || !keywords) {
      throw new Error(`HtmlBoardAdapter cannot collect adapter=${source.adapter}`)
    }

    const listed = new Map<string, BoardListItem>()
    for (let page = 1; page <= layout.maxPages; page++) {
      if (page > 1) await this.sleep(layout.requestDelayMs)
      const url = pageUrl(source, layout, page)
      const items = parseBoardList(await this.get(url, layout), url, layout)
      if (page === 1 && items.length === 0) {
        // An empty first page means the selectors no longer match the site, not "no posts".
        throw new Error(`Board list matched no posts; check board selectors for ${source.url}`)
      }
      for (const item of items) if (!listed.has(item.url)) listed.set(item.url, item)
    }

    const since = cursor.value ?? ''
    const fresh = [...listed.values()].filter((item) => item.date >= since)
    const articles: NormalizedArticle[] = []
    const rejected: BoardRejections = { noKeyword: 0, excluded: 0, sampleTitles: [] }

    for (const item of fresh) {
      await this.sleep(layout.requestDelayMs)
      const body = parseBoardDetail(await this.get(item.url, layout), layout)
      const verdict = applyKeywordFilter(keywords, item.title, body)
      if (!verdict.keep) {
        if (verdict.reason === 'EXCLUDED') rejected.excluded++
        else rejected.noKeyword++
        if (rejected.sampleTitles.length < REJECTED_SAMPLE_SIZE) {
          rejected.sampleTitles.push(item.title)
        }
        continue
      }
      articles.push({
        sourceUrl: source.url,
        adapter: source.adapter,
        contentKind: source.contentKind,
        authority: source.authority,
        externalId: item.url,
        title: item.title,
        url: item.url,
        normalizedUrl: normalizeUrl(item.url),
        canonicalUrl: normalizeUrl(item.url),
        body,
        publishedAt: `${item.date}T00:00:00${layout.utcOffset}`,
      })
    }

    const newest = [...listed.values()].reduce((max, item) => (item.date > max ? item.date : max), since)
    return {
      status: 'SUCCESS',
      articles,
      cursor: { ...cursor, value: newest || undefined },
      rejected,
    }
  }
}

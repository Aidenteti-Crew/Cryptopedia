import { describe, expect, it } from 'vitest'

import {
  HtmlBoardAdapter,
  parseBoardDetail,
  parseBoardList,
} from '../src/adapters/html-board-adapter.js'
import type { BoardLayout, SourceConfig } from '../src/config/source-config.js'
import { runHtmlBoardSource } from '../src/jobs/run-html-board-source.js'
import { FakeContentDb } from './support/fake-content-db.js'

// Markup trimmed from www.kisa.or.kr/401 (2026-11-01): a pinned row with "공지" instead of a
// number, links carrying the list page, dates as YYYY-MM-DD.
const layout: BoardLayout = {
  listItem: 'table.tbl_board tbody tr',
  title: 'td.sbj a',
  link: 'td.sbj a@href',
  date: 'td.date',
  detailBody: 'div.board_detail_contents',
  pageParam: 'page',
  maxPages: 2,
  dropLinkParams: ['page', 'lang_type'],
  utcOffset: '+09:00',
  encoding: 'utf-8',
  requestDelayMs: 2000,
}

const source: SourceConfig = {
  url: 'https://www.kisa.or.kr/401',
  chain: 'web3-kr',
  sourceName: 'KISA 공지사항',
  sourceType: 'WEBSITE',
  adapter: 'HTML_BOARD',
  contentKind: 'NOTICE',
  authority: 'OFFICIAL',
  enabled: true,
  consecutiveFailuresThreshold: 3,
  board: layout,
  keywords: { include: ['블록체인', 'Web3', 'NFT'], exclude: ['입찰', '채용'] },
}

interface Row {
  seq: number
  title: string
  date: string
  pinned?: boolean
}

function listHtml(rows: Row[], page: number): string {
  const trs = rows
    .map(
      (r) => `
      <tr${r.pinned ? ' class="notice"' : ''}>
        <td class="num">${r.pinned ? '<span class="cate">공지</span>' : r.seq}</td>
        <td class="sbj txtL"><a href="/401/form?postSeq=${r.seq}&page=${page}">${r.title}</a></td>
        <td class="date">${r.date}</td>
        <td class="attach"><a href="#fnPostAttachDownload" onclick="x()">첨부</a></td>
      </tr>`
    )
    .join('')
  return `<html><body><table class="tbl_board notice"><thead><tr><th>번호</th></tr></thead>
    <tbody>${trs}</tbody></table></body></html>`
}

function detailHtml(body: string): string {
  return `<html><body><div class="board_detail_info"><h2>제목</h2></div>
    <div class="board_detail_contents"><p>${body}</p><script>tab()</script>
    <div id="koglOpen"></div></div></body></html>`
}

// Serves list pages and post bodies by URL; records every URL asked for.
function fakeSite(pages: Row[][], bodies: Record<number, string>) {
  const requested: string[] = []
  const fetchFn = async (input: string) => {
    requested.push(input)
    const url = new URL(input)
    const seq = url.searchParams.get('postSeq')
    if (seq) return new Response(detailHtml(bodies[Number(seq)] ?? ''), { status: 200 })
    const page = Number(url.searchParams.get('page') ?? '1')
    return new Response(listHtml(pages[page - 1] ?? [], page), { status: 200 })
  }
  const sleeps: number[] = []
  const sleep = async (ms: number) => {
    sleeps.push(ms)
  }
  return { adapter: new HtmlBoardAdapter(fetchFn, sleep), requested, sleeps }
}

describe('parseBoardList', () => {
  it('reads title, absolute link without the page parameter, and date', () => {
    const items = parseBoardList(
      listHtml([{ seq: 3781, title: '「2026 블록체인 진흥주간」 사전등록 안내', date: '2026-10-13' }], 1),
      'https://www.kisa.or.kr/401?page=1',
      layout
    )
    expect(items).toEqual([
      {
        title: '「2026 블록체인 진흥주간」 사전등록 안내',
        url: 'https://www.kisa.or.kr/401/form?postSeq=3781',
        date: '2026-10-13',
      },
    ])
  })

  it('reads dotted dates and skips rows without a usable link', () => {
    const html = `<table class="tbl_board"><tbody>
      <tr><td class="sbj"><a href="/401/form?postSeq=1">A</a></td><td class="date">2026.9.3</td></tr>
      <tr><td class="sbj"><a href="#none">B</a></td><td class="date">2026-09-03</td></tr>
      <tr><td class="sbj">C</td><td class="date">2026-09-03</td></tr>
    </tbody></table>`
    expect(parseBoardList(html, 'https://www.kisa.or.kr/401', layout)).toEqual([
      { title: 'A', url: 'https://www.kisa.or.kr/401/form?postSeq=1', date: '2026-09-03' },
    ])
  })
})

describe('parseBoardList with script-call links', () => {
  // Markup trimmed from blockchain.kisa.or.kr/bbso/bbsoAnalsList.do (2026-11-09).
  const portal: BoardLayout = {
    ...layout,
    listItem: 'table.responsive-notice-table tbody tr',
    title: '.subject-text',
    link: 'a.subject-link@href',
    date: '.item-date',
    pageParam: 'pageIndex',
    dropLinkParams: [],
    linkIdPattern: "fn_goView\\('([A-Za-z0-9_]+)'\\)",
    detailUrl: '/bbso/bbsoAnalsDetail.do?searchBbsoMngId={id}',
  }

  it('turns fn_goView ids into detail URLs and reads the labelled date', () => {
    const html = `<table class="responsive-notice-table"><tbody>
      <tr><td class="cell-num">1542</td><td class="cell-content">
        <a href="javascript:fn_goView('BBSOID_0000000001808');" class="subject-link">
          <span class="badge-weekly">주간</span>
          <span class="subject-text">블록체인 기반 UAV 교차 도메인 인증 기술 (2026년 11월 1주 ④)</span>
        </a>
        <span class="meta-item item-date"><strong>등록일</strong> 2026-11-09</span>
      </td></tr>
      <tr><td class="cell-content"><a href="javascript:void(0)" class="subject-link">
        <span class="subject-text">id 없음</span></a><span class="item-date">2026-11-09</span></td></tr>
    </tbody></table>`
    expect(
      parseBoardList(html, 'https://blockchain.kisa.or.kr/bbso/bbsoAnalsList.do?pageIndex=1', portal)
    ).toEqual([
      {
        title: '블록체인 기반 UAV 교차 도메인 인증 기술 (2026년 11월 1주 ④)',
        url: 'https://blockchain.kisa.or.kr/bbso/bbsoAnalsDetail.do?searchBbsoMngId=BBSOID_0000000001808',
        date: '2026-11-09',
      },
    ])
  })
})

describe('parseBoardDetail', () => {
  it('keeps line breaks and drops scripts', () => {
    const text = parseBoardDetail(
      detailHtml('1. 행사개요<br />○ (일정) 2026.11.25.(수)<br /><br />○ (장소) 코엑스 &middot; 3층'),
      layout
    )
    expect(text).toBe('1. 행사개요\n○ (일정) 2026.11.25.(수)\n○ (장소) 코엑스 · 3층')
    expect(text).not.toContain('tab()')
  })
})

describe('HtmlBoardAdapter', () => {
  it('keeps keyword posts, drops the rest with a sample, and waits between requests', async () => {
    const { adapter, requested, sleeps } = fakeSite(
      [
        [
          { seq: 3, title: '블록체인 밋업데이 교육생 모집', date: '2026-10-27' },
          { seq: 2, title: '개인정보 세미나 안내', date: '2026-10-26' },
          { seq: 1, title: '보안 행사', date: '2026-10-25' },
        ],
        [{ seq: 0, title: '정보보호 인력 채용(블록체인팀)', date: '2026-10-20' }],
      ],
      { 3: '블록체인 교육', 2: '개인정보 보호', 1: 'NFT 보안 세션 포함' }
    )

    const result = await adapter.collect(source)

    expect(result.articles.map((a) => a.title)).toEqual(['블록체인 밋업데이 교육생 모집', '보안 행사'])
    expect(result.articles[0]).toMatchObject({
      url: 'https://www.kisa.or.kr/401/form?postSeq=3',
      publishedAt: '2026-10-27T00:00:00+09:00',
      body: '블록체인 교육',
      contentKind: 'NOTICE',
    })
    expect(result.rejected).toEqual({
      noKeyword: 1,
      excluded: 1,
      sampleTitles: ['개인정보 세미나 안내', '정보보호 인력 채용(블록체인팀)'],
    })
    expect(result.cursor.value).toBe('2026-10-27')
    // 2 list pages + 4 bodies; every request after the first waits.
    expect(requested).toHaveLength(6)
    expect(sleeps).toEqual([2000, 2000, 2000, 2000, 2000])
  })

  it('reads only posts dated on or after the cursor day, skipping old pinned posts', async () => {
    const { adapter, requested } = fakeSite(
      [
        [
          { seq: 9, title: '블록체인 진흥주간 (고정)', date: '2026-08-13', pinned: true },
          { seq: 12, title: '블록체인 기업 모집', date: '2026-10-28' },
          { seq: 11, title: '블록체인 포상', date: '2026-10-27' },
          { seq: 10, title: '블록체인 실태조사', date: '2026-10-26' },
        ],
      ],
      {}
    )

    const result = await adapter.collect({ ...source, board: { ...layout, maxPages: 1 } }, {
      value: '2026-10-27',
    })

    expect(result.articles.map((a) => a.title)).toEqual(['블록체인 기업 모집', '블록체인 포상'])
    expect(requested.filter((u) => u.includes('postSeq'))).toHaveLength(2)
    expect(result.cursor.value).toBe('2026-10-28')
  })

  it('fails when the first page matches nothing, so broken selectors are not read as quiet', async () => {
    const { adapter } = fakeSite([[]], {})
    await expect(adapter.collect(source)).rejects.toThrow('matched no posts')
  })
})

describe('runHtmlBoardSource', () => {
  it('stores kept posts, advances the cursor and reports the keyword rejections', async () => {
    const db = new FakeContentDb()
    const { adapter } = fakeSite(
      [
        [
          { seq: 2, title: '블록체인 밋업데이 교육생 모집', date: '2026-10-27' },
          { seq: 1, title: '개인정보 세미나', date: '2026-10-26' },
        ],
      ],
      { 2: '블록체인 교육 과정', 1: '세미나' }
    )

    const result = await runHtmlBoardSource(db.query, source, { adapter })

    expect(result).toMatchObject({
      status: 'SUCCESS',
      inserted: 1,
      rejected: { noKeyword: 1, excluded: 0, sampleTitles: ['개인정보 세미나'] },
    })
    expect(db.articles).toHaveLength(1)
    const stored = db.sources.find((s) => s.id === result.sourceId)
    expect(stored?.source_meta_json?.['cursor']).toEqual({ value: '2026-10-27' })
    expect(stored?.source_meta_json?.['collector']).toBe('chainery')
  })
})

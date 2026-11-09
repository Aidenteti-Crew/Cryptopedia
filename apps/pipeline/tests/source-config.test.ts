import { describe, expect, it } from 'vitest'

import { parseSourceConfig } from '../src/config/source-config.js'

describe('source config', () => {
  it('parses adapter metadata and defaults', () => {
    const [source] = parseSourceConfig(`
sources:
  - url: https://example.com/releases.atom
    chain: avalanche
    source_name: Example Releases
    source_type: RSS
    adapter: ATOM
    content_kind: RELEASE
    authority: OFFICIAL
`)

    expect(source).toMatchObject({
      adapter: 'ATOM',
      authority: 'OFFICIAL',
      contentKind: 'RELEASE',
      enabled: true,
      consecutiveFailuresThreshold: 3,
    })
  })

  it('rejects source types not present in the DB enum', () => {
    expect(() =>
      parseSourceConfig(`
sources:
  - url: https://example.com
    chain: avalanche
    source_name: Example
    source_type: BLOG
    adapter: CRAWL4AI
    content_kind: BLOG
    authority: OFFICIAL
`)
    ).toThrow('Invalid source config')
  })

  it('requires a github location for the GITHUB_MARKDOWN adapter', () => {
    const base = `
sources:
  - url: https://example.com/blog
    chain: avalanche
    source_name: Example Blog
    source_type: WEBSITE
    adapter: GITHUB_MARKDOWN
    content_kind: BLOG
    authority: OFFICIAL
`
    expect(() => parseSourceConfig(base)).toThrow('github {owner, repo, branch, path}')

    const [source] = parseSourceConfig(
      `${base}    github: { owner: o, repo: r, branch: main, path: posts }\n`
    )
    expect(source?.github).toEqual({ owner: 'o', repo: 'r', branch: 'main', path: 'posts' })
  })

  it('requires an apify block for the APIFY adapter and defaults retweets off', () => {
    const base = `
sources:
  - url: https://x.com/avax
    chain: avalanche
    source_name: Avalanche X
    source_type: TWITTER
    adapter: APIFY
    content_kind: SOCIAL
    authority: OFFICIAL
`
    expect(() => parseSourceConfig(base)).toThrow('apify {actor, input}')

    const [source] = parseSourceConfig(
      `${base}    apify:\n      actor: apidojo~tweet-scraper\n      input:\n        maxItems: 5\n`
    )
    expect(source?.apify).toEqual({
      actor: 'apidojo~tweet-scraper',
      input: { maxItems: 5 },
      includeRetweets: false,
    })
  })

  it('parses exclude_title_patterns and rejects an invalid regular expression', () => {
    const base = `
sources:
  - url: https://example.com/releases.atom
    chain: avalanche
    source_name: Example
    source_type: RSS
    adapter: ATOM
    content_kind: RELEASE
    authority: OFFICIAL
    exclude_title_patterns:
`
    const [source] = parseSourceConfig(`${base}      - '^graft/'\n`)
    expect(source?.excludeTitlePatterns).toEqual(['^graft/'])

    expect(() => parseSourceConfig(`${base}      - '([unclosed'\n`)).toThrow(
      'valid regular expression'
    )
  })

  it('requires a lowercase chain on every source, with no default', () => {
    const entry = (chainLine: string) => `
sources:
  - url: https://example.com/releases.atom
${chainLine}
    source_name: Example
    source_type: RSS
    adapter: ATOM
    content_kind: RELEASE
    authority: OFFICIAL
`
    expect(() => parseSourceConfig(entry(''))).toThrow(/chain/)
    expect(() => parseSourceConfig(entry('    chain: Avalanche'))).toThrow('lowercase identifier')
    expect(parseSourceConfig(entry('    chain: avalanche'))[0]?.chain).toBe('avalanche')
  })

  it('requires a luma calendar id for the LUMA_ICS adapter', () => {
    const base = `
sources:
  - url: https://luma.com/Team1KOR
    chain: avalanche
    source_name: Luma
    source_type: WEBSITE
    adapter: LUMA_ICS
    content_kind: EVENT
    authority: OFFICIAL_COMMUNITY
`
    expect(() => parseSourceConfig(base)).toThrow('luma {calendar_id}')
    expect(() => parseSourceConfig(`${base}    luma:\n      calendar_id: not-a-cal\n`)).toThrow()
    expect(
      parseSourceConfig(`${base}    luma:\n      calendar_id: cal-pE5SNzqEFCTNpRU\n`)[0]?.luma
    ).toEqual({
      calendarId: 'cal-pE5SNzqEFCTNpRU',
    })
  })

  it('parses an HTML_BOARD source with board defaults and keywords', () => {
    const [source] = parseSourceConfig(`
sources:
  - url: https://www.kisa.or.kr/401
    chain: web3-kr
    source_name: KISA 공지사항
    source_type: WEBSITE
    adapter: HTML_BOARD
    content_kind: NOTICE
    authority: OFFICIAL
    board:
      list_item: 'table.tbl_board tbody tr'
      title: 'td.sbj a'
      link: 'td.sbj a@href'
      date: 'td.date'
      detail_body: 'div.board_detail_contents'
    include_keywords: [블록체인]
`)
    expect(source?.board).toMatchObject({
      pageParam: 'page',
      maxPages: 2,
      dropLinkParams: [],
      utcOffset: '+09:00',
      encoding: 'utf-8',
      requestDelayMs: 2000,
    })
    expect(source?.keywords).toEqual({ include: ['블록체인'], exclude: [] })
  })

  it('requires board selectors and include_keywords for HTML_BOARD, and a polite delay', () => {
    const base = `
sources:
  - url: https://www.kisa.or.kr/401
    chain: web3-kr
    source_name: KISA
    source_type: WEBSITE
    adapter: HTML_BOARD
    content_kind: NOTICE
    authority: OFFICIAL
`
    const board = `
    board:
      list_item: tr
      title: a
      link: a@href
      date: td
      detail_body: div
`
    expect(() => parseSourceConfig(`${base}    include_keywords: [블록체인]\n`)).toThrow('board')
    expect(() => parseSourceConfig(`${base}${board}`)).toThrow('include_keywords')
    expect(() =>
      parseSourceConfig(`${base}${board}      request_delay_ms: 500\n    include_keywords: [x]\n`)
    ).toThrow('Invalid source config')
  })

  it('requires link_id_pattern and detail_url together', () => {
    const entry = (extra: string) => `
sources:
  - url: https://blockchain.kisa.or.kr/bbso/bbsoAnalsList.do
    chain: web3-kr
    source_name: KISA 블록체인 포털
    source_type: WEBSITE
    adapter: HTML_BOARD
    content_kind: NEWSLETTER
    authority: OFFICIAL
    board:
      list_item: tr
      title: .subject-text
      link: a@href
      date: .item-date
      detail_body: div
${extra}    include_keywords: [블록체인]
`
    expect(() => parseSourceConfig(entry("      link_id_pattern: \"fn_goView\\\\('(\\\\w+)'\\\\)\"\n"))).toThrow(
      'go together'
    )
    const [source] = parseSourceConfig(
      entry(
        "      link_id_pattern: \"fn_goView\\\\('(\\\\w+)'\\\\)\"\n      detail_url: '/view.do?id={id}'\n"
      )
    )
    expect(source?.board?.detailUrl).toBe('/view.do?id={id}')
  })
})

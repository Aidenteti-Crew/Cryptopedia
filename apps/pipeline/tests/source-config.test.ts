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
})

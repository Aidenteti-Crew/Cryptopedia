import { describe, expect, it } from 'vitest'

import { parseSourceConfig } from '../src/config/source-config.js'

describe('source config', () => {
  it('parses adapter metadata and defaults', () => {
    const [source] = parseSourceConfig(`
sources:
  - url: https://example.com/releases.atom
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
})

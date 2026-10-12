import { describe, expect, it } from 'vitest'

import { artifactSha256Hex, serializeExtractionSpec } from '../src/crawler/extraction-spec.js'

const spec = {
  version: 1 as const,
  sourceName: 'Avalanche Builder Hub Blog',
  listingUrl: 'https://build.avax.network/blog',
  selectors: {
    item: 'article',
    title: 'h2',
    url: 'a',
    date: 'time',
    summary: 'p',
  },
  detail: { body: 'main article' },
  pagination: 'none' as const,
  runtime: { magicMode: false },
}

describe('extraction spec', () => {
  it('serializes a deterministic declarative artifact', () => {
    const first = serializeExtractionSpec(spec)
    const second = serializeExtractionSpec(spec)
    expect(first).toBe(second)
    expect(first).not.toContain('js_code')
    expect(artifactSha256Hex(first)).toMatch(/^[a-f0-9]{64}$/)
  })

  it('rejects executable or unknown fields', () => {
    expect(() => serializeExtractionSpec({ ...spec, jsCode: 'fetch("secret")' })).toThrow()
  })
})

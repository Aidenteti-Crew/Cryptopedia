import { describe, expect, it } from 'vitest'

import {
  acpDocumentLinkPattern,
  parseAcpHeader,
  pickIncludingRelease,
  STAGE_BY_ACP_STATUS,
} from '../src/classify/protocol-stage.js'

describe('STAGE_BY_ACP_STATUS', () => {
  it('maps every ACP status to 제안 · 확정 · 적용 · 중단', () => {
    expect(STAGE_BY_ACP_STATUS).toEqual({
      Proposed: 'PROPOSED',
      Implementable: 'ACCEPTED',
      Activated: 'ACTIVATED',
      Stale: 'STALE',
    })
  })
})

describe('parseAcpHeader', () => {
  it('reads number, status and document dates from the adapter header', () => {
    const body = 'Event: ACP_ACTIVATED\nACP: 77\nStatus: Activated\nTrack: Standards\nAuthors: A\nCreated: 2024-03-01T00:00:00Z\nUpdated: 2024-12-16T00:00:00Z\n\n| ACP | 77 |'
    expect(parseAcpHeader(body)).toEqual({
      number: 77,
      status: 'Activated',
      createdAt: '2024-03-01T00:00:00Z',
      updatedAt: '2024-12-16T00:00:00Z',
    })
  })

  it('keeps dates empty for bodies collected before dates were added', () => {
    expect(parseAcpHeader('Event: ACP_CREATED\nACP: 13\nStatus: Stale\n')).toMatchObject({
      number: 13,
      createdAt: null,
      updatedAt: null,
    })
  })

  it('gives null for anything that is not an ACP document', () => {
    expect(parseAcpHeader('## v1.15.0\n- Status: shipped')).toBeNull()
    expect(parseAcpHeader('ACP: 13\nStatus: Withdrawn')).toBeNull()
  })
})

describe('acpDocumentLinkPattern', () => {
  const linked = (text: string, n: number) => new RegExp(acpDocumentLinkPattern(n)).test(text)

  it('matches a link to the proposal document in markdown or HTML notes', () => {
    expect(
      linked('[ACP-267](https://github.com/avalanche-foundation/ACPs/blob/main/ACPs/267-uptime-requirement-increase/README.md)', 267)
    ).toBe(true)
    expect(
      linked('<a href="https://github.com/avalanche-foundation/ACPs/tree/main/ACPs/77-reinventing-subnets">', 77)
    ).toBe(true)
  })

  it('ignores plain mentions and other numbers that share a prefix', () => {
    expect(linked('ACP-176 gas target in force as of the latest block', 176)).toBe(false)
    expect(linked('https://github.com/avalanche-foundation/ACPs/blob/main/ACPs/2670-other/README.md', 267)).toBe(false)
  })
})

describe('pickIncludingRelease', () => {
  const release = (tag: string, date: string) => ({
    name: tag,
    url: `https://github.com/ava-labs/avalanchego/releases/tag/${tag}`,
    publishedAt: new Date(date),
  })

  it('prefers the stable release over its earlier Fuji pre-release', () => {
    expect(
      pickIncludingRelease([release('v1.15.0-fuji', '2026-07-21'), release('v1.15.0', '2026-09-08')])
    ).toEqual({ name: 'v1.15.0', url: 'https://github.com/ava-labs/avalanchego/releases/tag/v1.15.0' })
  })

  it('takes the earliest stable release, and a pre-release only when nothing else exists', () => {
    expect(
      pickIncludingRelease([release('v1.16.0', '2027-01-01'), release('v1.15.0', '2026-09-08')])?.name
    ).toBe('v1.15.0')
    expect(pickIncludingRelease([release('v1.16.0-fuji', '2026-12-01')])?.name).toBe('v1.16.0-fuji')
    expect(pickIncludingRelease([])).toBeNull()
  })
})

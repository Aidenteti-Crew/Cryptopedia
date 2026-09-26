import { describe, expect, it } from 'vitest'

import {
  getOrCreateSource,
  getSourceCursor,
  recordSourceFailure,
  recordSourceSuccess,
  setSourceCursor,
} from '../src/db/source-repository.js'
import { FakeContentDb } from './support/fake-content-db.js'

describe('source-repository', () => {
  it('creates a source once and returns the same id on repeated calls', async () => {
    const db = new FakeContentDb()
    const input = {
      urlHandle: 'https://example.com/feed.atom',
      name: 'Example',
      type: 'RSS' as const,
    }

    const first = await getOrCreateSource(db.query, input)
    const second = await getOrCreateSource(db.query, input)

    expect(second.id).toBe(first.id)
    expect(db.sources).toHaveLength(1)
  })

  it('round-trips the adapter cursor through source_meta_json', async () => {
    const db = new FakeContentDb()
    const { id } = await getOrCreateSource(db.query, {
      urlHandle: 'https://example.com/feed.atom',
      name: 'Example',
      type: 'RSS',
    })

    expect(await getSourceCursor(db.query, id)).toBeUndefined()

    await setSourceCursor(db.query, id, { value: 'guid-1', etag: 'W/"abc"' })
    expect(await getSourceCursor(db.query, id)).toEqual({ value: 'guid-1', etag: 'W/"abc"' })
  })

  it('resets consecutive_failures on success and increments it on failure', async () => {
    const db = new FakeContentDb()
    const { id } = await getOrCreateSource(db.query, {
      urlHandle: 'https://example.com/feed.atom',
      name: 'Example',
      type: 'RSS',
    })

    const first = await recordSourceFailure(db.query, id, 'boom', 3)
    const second = await recordSourceFailure(db.query, id, 'boom again', 3)
    expect(first.consecutiveFailures).toBe(1)
    expect(second.consecutiveFailures).toBe(2)
    expect(db.sources[0]?.is_healthy).toBe(true)

    await recordSourceFailure(db.query, id, 'boom a third time', 3)
    expect(db.sources[0]?.is_healthy).toBe(false)

    await recordSourceSuccess(db.query, id)
    expect(db.sources[0]?.consecutive_failures).toBe(0)
    expect(db.sources[0]?.is_healthy).toBe(true)
  })
})

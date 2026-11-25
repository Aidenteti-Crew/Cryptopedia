import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import type { EventEntry } from '@/lib/cryptopedia-types'

import { RegistrationBadge } from './registration-badge'

type Props = Pick<EventEntry, 'registrationStatus' | 'daysUntilDeadline' | 'status'>
const badge = (props: Partial<Props>) =>
  renderToStaticMarkup(
    <RegistrationBadge registrationStatus="UNKNOWN" daysUntilDeadline={null} status="UPCOMING" {...props} />
  )

test('says whether registration is open, closing with a D-day, or closed', () => {
  assert.match(badge({ registrationStatus: 'OPEN', daysUntilDeadline: 12 }), />모집중</)
  assert.match(badge({ registrationStatus: 'CLOSING_SOON', daysUntilDeadline: 2 }), />마감 임박 D-2</)
  assert.match(badge({ registrationStatus: 'CLOSED' }), />모집 마감</)
})

test('closing soon without a day count still shows the badge', () => {
  assert.match(badge({ registrationStatus: 'CLOSING_SOON' }), />마감 임박</)
})

test('shows nothing when the deadline is unknown', () => {
  assert.equal(badge({ registrationStatus: 'UNKNOWN' }), '')
})

test('does not repeat "closed" on an event that has ended or was cancelled', () => {
  assert.equal(badge({ registrationStatus: 'CLOSED', status: 'PAST' }), '')
  assert.equal(badge({ registrationStatus: 'CLOSED', status: 'CANCELLED' }), '')
  assert.match(badge({ registrationStatus: 'CLOSED', status: 'ONGOING' }), />모집 마감</)
})

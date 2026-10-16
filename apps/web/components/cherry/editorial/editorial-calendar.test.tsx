import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { EditorialCalendar } from './editorial-calendar'

const props = {
  month: '2026-10',
  selectedDay: '2026-10-15',
  onMonthChange: () => undefined,
  onSelectDay: () => undefined,
}

test('occupied days expose their count and item titles while empty dates have no item marker', () => {
  const html = renderToStaticMarkup(
    <EditorialCalendar
      {...props}
      items={[
        { id: 'a', title: 'Avalanche meetup', day: '2026-10-17' },
        { id: 'b', title: 'Builder workshop', day: '2026-10-17' },
      ]}
    />
  )
  assert.match(html, /aria-label="10월 17일, 2건, Avalanche meetup, Builder workshop"/)
  assert.match(html, />2건<\/span>/)
  assert.match(html, />Avalanche meetup<\/span>/)
  const emptyDay = html.match(
    /<button[^>]*aria-label="10월 16일, 0건"[^>]*>[\s\S]*?<\/button>/
  )?.[0]
  assert.ok(emptyDay)
  assert.doesNotMatch(emptyDay, /data-calendar-marker|건<\/span>/)
})

test('multi-day events mark every included day across a month boundary', () => {
  const html = renderToStaticMarkup(
    <EditorialCalendar
      {...props}
      items={[{ id: 'a', title: 'Conference', day: '2026-09-30', endDay: '2026-10-02' }]}
    />
  )
  assert.match(html, /aria-label="10월 1일, 1건, Conference"/)
  assert.match(html, /aria-label="10월 2일, 1건, Conference"/)
  assert.match(html, /aria-label="10월 3일, 0건"/)
})

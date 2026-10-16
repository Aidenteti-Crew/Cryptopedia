import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { SyncedDateList } from './synced-event-timeline'

test('news date list keeps multiple months and selected empty date without timeline lines',()=>{
  const html=renderToStaticMarkup(<SyncedDateList items={[
    {id:'older',startsAt:'2026-09-01T00:00:00Z',endsAt:null,title:'September article'},
    {id:'newer',startsAt:'2026-10-10T00:00:00Z',endsAt:null,title:'October article'},
  ]} target={{day:'2026-10-15',request:1,explicit:true}} selectedDay="2026-10-15" today="2026-10-15" onVisibleDay={()=>undefined} onNavigateDay={()=>undefined} renderItem={(item)=><p>{item.title}</p>} appearance="cards" label="소식 목록" order="desc" emptyMessage="게시된 소식이 없습니다."/>)
  assert.match(html,/September article/)
  assert.match(html,/October article/)
  assert.match(html,/2026.10.15/)
  assert.doesNotMatch(html,/border-l/)
  assert.ok(html.indexOf('2026.10.10')<html.indexOf('2026.09.01'))
  assert.match(html,/게시된 소식이 없습니다./)
  assert.match(html,/가까운 날짜 보기 · 2026.10.10/)
})

test('initial calendar entry does not create an empty today group or empty notice', () => {
  const html = renderToStaticMarkup(<SyncedDateList items={[{ id: 'a', startsAt: '2026-09-01T00:00:00Z', endsAt: null }]} target={{ day: '2026-10-15', request: 0, explicit:false }} selectedDay="2026-10-15" today="2026-10-15" onVisibleDay={() => undefined} renderItem={() => <p>Update</p>} appearance="cards"/>)
  assert.match(html, /2026.09.01/)
  assert.doesNotMatch(html, /2026.10.15|오늘 ·|이 날짜에는/)
})

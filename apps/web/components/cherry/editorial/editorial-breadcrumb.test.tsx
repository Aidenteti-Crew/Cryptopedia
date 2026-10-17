import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { hubSchema } from '@/lib/cryptopedia-hub'
import { CHAPTER_NAV, PRIMARY_NAV, resolveParentScreen } from '@/lib/cryptopedia-taxonomy'
import { EditorialBreadcrumb, getEditorialBreadcrumbs, menuEntryFor } from './editorial-breadcrumb'
import { EditorialIndex } from './editorial-index'
import { EditorialShell } from './editorial-shell'

const hub = hubSchema.parse(
  JSON.parse(readFileSync(new URL('../../../public/cryptopedia/hub.json', import.meta.url), 'utf8'))
)

test('all screen breadcrumbs start at their sidebar section and mark only the current page', () => {
  for (const screen of [...PRIMARY_NAV, ...CHAPTER_NAV]) {
    const items = getEditorialBreadcrumbs({ kind: 'screen', id: screen.id })
    assert.equal(
      items[0].label,
      CHAPTER_NAV.some((chapter) => chapter.id === screen.id) ? 'LEARN' : 'LIVE'
    )
    assert.equal(items[0].target, undefined)
    if (items[0].label === 'LIVE')
      assert.deepEqual(items[1].target, { kind: 'screen', id: 'ecosystem' })
    assert.equal(items.at(-1)?.target, undefined)
    assert.equal(items.at(-1)?.label, screen.label)
  }
  assert.deepEqual(getEditorialBreadcrumbs({ kind: 'screen', id: 'ecosystem' }), [
    { label: 'LIVE' },
    { label: '생태계 홈' },
  ])
  assert.deepEqual(
    getEditorialBreadcrumbs({ kind: 'screen', id: 'event-archive' }).map((item) => item.label),
    ['LIVE', '생태계 홈', '행사·이벤트', '행사 아카이브']
  )
})

test('connected details include the correct library independently of the entry point', () => {
  for (const [id, expected] of [
    ['case-first-contract', ['LEARN', '아카데미', '케이스별 실습', '첫 컨트랙트 준비하기']],
    [
      'skill-contract-review',
      ['LEARN', '에이전트 스킬', '스킬 라이브러리', '첫 컨트랙트 테스트 가이드'],
    ],
    ['concept-contract', ['LEARN', '핵심 개념', '핵심 용어 사전', '스마트 컨트랙트']],
    ['resource-viem', ['LEARN', '에이전트 스킬', '코드·도구 레퍼런스', 'viem 체인 조회 레퍼런스']],
    ['project-viem', ['LIVE', '생태계 홈', '체인·프로젝트', 'viem']],
    [
      'change-client-example',
      ['LIVE', '생태계 홈', '개발 업데이트', '조회 클라이언트 예제 변경 시나리오'],
    ],
  ] as const) {
    const items = getEditorialBreadcrumbs(
      { kind: 'article', id, parent: resolveParentScreen(id)! },
      { hub }
    )
    assert.deepEqual(
      items.map((item) => item.label),
      [...expected]
    )
    assert.equal(items[0].target, undefined)
    assert.ok(items.slice(1, -1).every((item) => item.target))
    assert.equal(items.at(-1)?.target, undefined)
  }
})

test('loading and legacy detail paths remain navigable without depending on fetched labels', () => {
  const items = getEditorialBreadcrumbs({
    kind: 'article',
    id: 'case-first-contract',
    parent: 'academy',
  })
  assert.equal(items[2].target?.id, 'practice')
  assert.equal(items.at(-1)?.label, '자료 불러오는 중…')
  assert.deepEqual(
    getEditorialBreadcrumbs({ kind: 'article', id: 'pcx-chains', parent: 'fundamentals' }).map(
      (item) => item.label
    ),
    ['LEARN', '핵심 개념', '네트워크·체인 구조']
  )
  assert.deepEqual(
    getEditorialBreadcrumbs(
      { kind: 'book', id: 'book-avalanche', parent: 'projects' },
      { title: 'Avalanche' }
    ).map((item) => item.label),
    ['LIVE', '생태계 홈', '체인·프로젝트', 'Avalanche']
  )
})

test('shell renders one accessible breadcrumb with buttons for ancestors and wrapping for mobile', () => {
  const items = getEditorialBreadcrumbs(
    { kind: 'article', id: 'case-first-contract', parent: 'academy' },
    { hub }
  )
  const html = renderToStaticMarkup(
    <EditorialShell activeScreen="academy" breadcrumbs={items} onSelect={() => undefined}>
      <h1>Case</h1>
    </EditorialShell>
  )
  assert.equal((html.match(/aria-label="현재 위치"/g) ?? []).length, 1)
  const breadcrumb = renderToStaticMarkup(
    <EditorialBreadcrumb items={items} onNavigate={() => undefined} />
  )
  assert.match(breadcrumb, /aria-label="케이스별 실습 페이지로 이동"/)
  assert.match(breadcrumb, /<span aria-current="page"/)
  assert.match(breadcrumb, /flex-wrap/)
  assert.doesNotMatch(breadcrumb, /목록으로 돌아가기/)
})

test('detail pages mark the menu entry they belong to in the sidebar, same as the breadcrumb', () => {
  const cases: [string, string][] = [
    ['concept-primary-network', 'glossary'],
    ['case-first-contract', 'practice'],
    ['skill-contract-review', 'skill-library'],
    ['resource-primary-network-docs', 'official-docs'],
    ['resource-viem', 'code-reference'],
    ['resource-mcp', 'mcp-tools'],
    ['skill-graph', 'skill-graph'],
  ]
  const label = (id: string) =>
    CHAPTER_NAV.flatMap((chapter) => chapter.children ?? []).find((child) => child.id === id)!.label
  for (const [id, entry] of cases) {
    assert.equal(menuEntryFor(id, hub), entry, id)
    const parent = resolveParentScreen(id)!
    const html = renderToStaticMarkup(
      <EditorialIndex
        activeScreen={parent}
        activeEntryId={menuEntryFor(id, hub)}
        onSelect={() => undefined}
        onOpenEntry={() => undefined}
      />
    )
    const current = html.match(/aria-current="page"[^>]*>([\s\S]*?)<\/button>/)
    assert.ok(current, `${id}: nothing marked`)
    assert.ok(current[1].includes(label(entry)), `${id}: marks ${current[1]}`)
  }
})

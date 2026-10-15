import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { EDITORIAL_BRAND, EditorialBrand } from "./editorial-brand"
import { EditorialIndex } from "./editorial-index"
import { EditorialShell } from "./editorial-shell"

const noop = () => undefined

test('renders one common footer outside main on every top-level page', () => {
  for (const activeScreen of ['ecosystem', 'projects', 'macro', 'events', 'updates', 'fundamentals', 'builders', 'academy', 'event-archive'] as const) {
    const html = renderToStaticMarkup(<EditorialShell activeScreen={activeScreen} onSelect={noop} onOpenEntry={noop}><p>Content</p></EditorialShell>)
    assert.equal((html.match(/<footer/g) ?? []).length, 1)
    assert.ok(html.indexOf('</main>') < html.indexOf('<footer'))
    assert.match(html, /소개 페이지/)
    assert.match(html, /aidenteti-seal\.png/)
    assert.doesNotMatch(html, />소개 페이지<|>신청폼</)
    assert.match(html, /app\.notion\.com\/p\/kingyoungdae\/a-dent-ti-Overview-KR/)
    assert.match(html, /https:\/\/x\.com\/Aidenteti_/)
    assert.match(html, /https:\/\/forms\.gle\/6DVS7RqWUbwjTdFC9/)
    assert.match(html, /chainery-logo\.png/)
    assert.match(html, /Aidenteti Crew/)
  }
})

test("renders the brand block with a local logo asset", () => {
  const html = renderToStaticMarkup(<EditorialBrand onHome={noop} />)

  assert.match(html, new RegExp(EDITORIAL_BRAND.name))
  assert.match(html, /Aidenteti Crew/)
  assert.match(html, /(?:\/|%2F)cryptopedia(?:\/|%2F)assets(?:\/|%2F)[^" &]+\.(png|svg)/)
})

test("marks the active page and keeps primary navigation first", () => {
  const html = renderToStaticMarkup(
    <EditorialIndex activeScreen="events" onSelect={noop} />,
  )

  assert.match(html, /aria-current="page"/)
  assert.match(html, /생태계 홈/)
  assert.ok(html.indexOf("체인·프로젝트") < html.indexOf("01    체인 기초"))
})

test("keeps chapter groups collapsed until one is active", () => {
  const collapsed = renderToStaticMarkup(
    <EditorialIndex activeScreen="ecosystem" onSelect={noop} />,
  )
  assert.doesNotMatch(collapsed, /P · C · X 체인/)

  const reading = renderToStaticMarkup(
    <EditorialIndex activeScreen="fundamentals" activeEntryId="pcx-chains" onSelect={noop} />,
  )
  /* 첫 렌더(SSR)는 기본 접힘 상태 — 자동 펼침은 마운트 후 effect 에서 일어난다 */
  assert.match(reading, /01    체인 기초/)
})

test("uses the Cherry layout: desktop sidebar, mobile header with hamburger", () => {
  const html = renderToStaticMarkup(
    <EditorialShell activeScreen="projects" onSelect={noop}>
      <p>Reading column</p>
    </EditorialShell>,
  )

  assert.match(html, /editorial-root/)
  assert.match(html, /Reading column/)
  assert.match(html, /w-\[260px\]/)
  assert.match(html, /lg:flex/)
  assert.match(html, /lg:hidden/)
  assert.match(html, /메뉴 열기/)
})

test("puts the desktop collection dropdown inside navigation before the index", () => {
  const html = renderToStaticMarkup(
    <EditorialShell
      activeScreen="ecosystem"
      activeChainName="Avalanche"
      onSelect={noop}
    >
      <p>Reading column</p>
    </EditorialShell>,
  )

  const sidebar = html.slice(html.indexOf("<aside"), html.indexOf("</aside>"))
  assert.match(sidebar, /<button[^>]*role="combobox"[^>]*aria-expanded="false"/)
  assert.ok(sidebar.indexOf('role="combobox"') < sidebar.indexOf("<nav"))
  const trigger = sidebar.match(/<button[^>]*role="combobox"[^>]*>[\s\S]*?<\/button>/)?.[0]
  assert.ok(trigger)
  assert.match(trigger, /COLLECTION/)
  assert.match(trigger, />Avalanche</)
  assert.doesNotMatch(trigger, /<select|<label/)
  const header = html.slice(html.indexOf("<header"), html.indexOf("</header>"))
  assert.match(header, /role="combobox"/)
  assert.match(header, /hidden lg:inline-flex/)
  assert.equal((html.match(/role="combobox"/g) ?? []).length, 2)
  assert.doesNotMatch(html, /Login/)
})

test("shows the chain logo avatar before the selected chain", () => {
  const html = renderToStaticMarkup(
    <EditorialShell
      activeScreen="ecosystem"
      activeChainName="Avalanche"
      activeChainLogoUrl="/cryptopedia/assets/chains/avalanche.svg"
      onSelect={noop}
    >
      <p>Reading column</p>
    </EditorialShell>,
  )

  assert.match(html, /\/cryptopedia\/assets\/chains\/avalanche\.svg/)
  assert.ok(html.indexOf("chains/avalanche.svg") < html.indexOf(">Avalanche<"))
  assert.doesNotMatch(html, /↗/)
})

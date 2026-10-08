import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { EditorialIndex } from "./editorial-index"
import { EditorialMasthead } from "./editorial-masthead"
import { EditorialShell } from "./editorial-shell"

const noop = () => undefined

test("renders the exact brand and local seal asset", () => {
  const html = renderToStaticMarkup(<EditorialMasthead onHome={noop} />)

  assert.match(html, /AIDENTETI CREW/)
  assert.match(html, /Cryptopedia/)
  assert.match(html, /THE BLOCKCHAIN ENCYCLOPEDIA/)
  assert.match(html, /aidenteti-seal\.png/)
})

test("marks the active page and keeps primary navigation first", () => {
  const html = renderToStaticMarkup(
    <EditorialIndex activeScreen="events" onSelect={noop} />,
  )

  assert.match(html, /aria-current="page"/)
  assert.match(html, /생태계 · 매크로/)
  assert.ok(html.indexOf("체인·프로젝트") < html.indexOf("01    체인 기초"))
})

test("renders one responsive shell around the reading column", () => {
  const html = renderToStaticMarkup(
    <EditorialShell activeScreen="projects" onSelect={noop}>
      <p>Reading column</p>
    </EditorialShell>,
  )

  assert.match(html, /editorial-root/)
  assert.match(html, /Reading column/)
  assert.match(html, /lg:grid-cols-\[244px_minmax\(0,1fr\)\]/)
  assert.match(html, /sm:grid-cols-\[200px_minmax\(0,1fr\)\]/)
})

test("renders the selected chain name in the collection index", () => {
  const html = renderToStaticMarkup(
    <EditorialShell
      activeScreen="ecosystem"
      activeChainName="Injective"
      onSelect={noop}
    >
      <p>Reading column</p>
    </EditorialShell>,
  )

  assert.match(html, /Injective/)
})

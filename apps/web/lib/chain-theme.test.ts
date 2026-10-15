import assert from "node:assert/strict"
import test from "node:test"

import {
  CHAIN_THEME_OVERRIDES,
  DEFAULT_CHAIN_ACCENT,
  chainThemeStyle,
  getChainTheme,
} from "./chain-theme"
import chains from "../public/cryptopedia/chains.json"

test("applies the Avalanche accent and label while reusing the catalog logo and name", () => {
  const avalanche = chains.items.find((chain) => chain.id === "avalanche")!
  const theme = getChainTheme(avalanche)

  assert.equal(theme.accent, "#E84142")
  assert.equal(theme.label, "AVALANCHE")
  assert.equal(theme.name, avalanche.name)
  assert.equal(theme.logoUrl, avalanche.logoUrl)
})

test("falls back to the shared Chainery accent for chains without a registered theme", () => {
  const theme = getChainTheme({ id: "unregistered", name: "Some Chain", logoUrl: "/x.svg" })

  assert.equal(theme.accent, DEFAULT_CHAIN_ACCENT)
  assert.equal(theme.label, "SOME CHAIN")
  assert.equal(theme.logoUrl, "/x.svg")
})

test("never registers an override for a chain missing from the catalog", () => {
  const ids = new Set(chains.items.map((chain) => chain.id))
  for (const id of Object.keys(CHAIN_THEME_OVERRIDES)) assert.ok(ids.has(id), id)
})

test("exposes the accent only as the --chain-accent custom property", () => {
  const style = chainThemeStyle(getChainTheme({ id: "avalanche", name: "Avalanche" }))

  assert.deepEqual(Object.keys(style), ["--chain-accent"])
  assert.equal((style as Record<string, string>)["--chain-accent"], "#E84142")
})

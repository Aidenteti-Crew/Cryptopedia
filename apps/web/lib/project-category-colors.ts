import type { CSSProperties } from 'react'

const PALETTE = [
  ['#693AB4', '#9162D0'],
  ['#087E99', '#18A6B6'],
  ['#A9456B', '#D76683'],
  ['#A35C1D', '#D68B35'],
  ['#2869A6', '#4594CF'],
  ['#387D57', '#54A875'],
  ['#7653AA', '#A17CC8'],
  ['#A64D46', '#D27467'],
] as const

// Names, never list position, select a color. Counts and sorting can change safely.
const CATEGORY_INDEX: Record<string, number> = Object.fromEntries(
  [
    'Assets',
    'Wallets and Account Abstraction',
    'Analytics & Data',
    'Crosschain Solutions',
    'DeFi',
    'Fiat On-Ramp',
    'RPC Endpoints',
    'Validator Infrastructure',
    'Explorers',
    'KYC / Identity Verification',
    'Indexers',
    'Payments',
    'Audit Firms',
    'Developer Tooling',
    'Oracles',
    'Security Audits',
    'Tokenization Platforms',
    'Blockchain as a Service',
    'Custody',
    'Stablecoins as a Service',
    'x402',
    'Development Infrastructure',
    'Token Aggregators',
    'VRF',
    'Data Feeds',
    'Hardware Wallets',
    'Privacy',
    'Security Tooling',
    'Validator Marketplace',
    'Chain Abstraction',
    'Enterprise Solutions',
    'Mini-Apps',
    'Orchestrators',
  ].map((name, index) => [name, index % PALETTE.length])
)

const rgb = (hex: string) =>
  hex
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16))
const luminance = (channels: number[]) =>
  channels
    .map((v) => {
      const c = v / 255
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)

// Shared stops keep white 12px labels readable in both the tile and the card header.
const readable = (hex: string) => {
  let channels = rgb(hex)
  while (1.05 / (luminance(channels) + 0.05) < 4.6)
    channels = channels.map((v) => Math.floor(v * 0.96))
  return `#${channels.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}
const COLORS = PALETTE.map(([start, end]) => ({ start: readable(start), end: readable(end) }))
const NEUTRAL = { start: '#41404e', end: '#646174' }

export function getProjectCategoryPalette(category?: string | null) {
  const index =
    category && Object.hasOwn(CATEGORY_INDEX, category) ? CATEGORY_INDEX[category] : undefined
  return index === undefined ? NEUTRAL : COLORS[index]
}

export function projectCategoryStyle(category?: string | null): CSSProperties {
  const { start, end } = getProjectCategoryPalette(category)
  return {
    '--project-gradient': `linear-gradient(105deg, ${start}, ${end})`,
    '--project-border': start,
  } as CSSProperties
}

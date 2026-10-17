import type { CSSProperties } from 'react'

/* 차콜·플럼 화면에 맞춘 차분한 범주색 — OKLCH 채도 0.115 로 맞추고 밝기를 번갈아(0.64/0.52) 줘 구분을 확보.
   첫 색은 브랜드 보라. 순서는 이웃 색끼리 색각 이상(ΔE 11.4)·일반 시력(ΔE 23.2) 모두 잘 구분되도록 고른 것.
   각 쌍은 [그라데이션 시작(조금 어둡게), 끝] */
const PALETTE = [
  ['#8266b1', '#977bc7'],
  ['#794900', '#8f5d00'],
  ['#008b92', '#00a0a8'],
  ['#7b396e', '#904d83'],
  ['#47894b', '#5c9e5f'],
  ['#893540', '#a04a53'],
  ['#4579ba', '#5a8ed1'],
  ['#883a1d', '#9f4f32'],
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
// '그 외 분야' 등 미분류 — 회색에 플럼 기운만 살짝
const NEUTRAL = { start: '#3e3848', end: '#5f5770' }

export function getProjectCategoryPalette(category?: string | null) {
  const index =
    category && Object.hasOwn(CATEGORY_INDEX, category) ? CATEGORY_INDEX[category] : undefined
  return index === undefined ? NEUTRAL : COLORS[index]
}

export function projectCategoryStyle(category?: string | null): CSSProperties {
  const { start, end } = getProjectCategoryPalette(category)
  return {
    '--project-gradient': `linear-gradient(105deg, ${start}, ${end})`,
    // 카드 머리의 분야 색 점 — 어두운 배경에서 잘 보이게 그라데이션 끝색
    '--project-border': end,
  } as CSSProperties
}

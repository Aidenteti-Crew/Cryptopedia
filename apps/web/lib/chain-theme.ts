import type { CSSProperties } from 'react'

/* 체인별 테마 — Chainery 공통 디자인(다크 플럼 에디토리얼)은 그대로 두고,
   체인마다 달라지는 값만 이 한 곳에서 관리한다.

   · 로고·이름은 chains.json(체인 카탈로그)을 그대로 쓴다 — 여기서 중복 정의하지 않는다.
   · 포인트 색은 작은 식별 요소(라벨 테두리, 구체 틴트 등)에만 쓴다. 배경·카드·사이드바에는 쓰지 않는다.
   · 공식 브랜드 색을 확인하지 못한 체인은 등록하지 않는다 → 공통 라벤더 포인트로 대체된다.
     새 체인은 CHAIN_THEME_OVERRIDES 에 한 줄만 추가하면 된다. */

export interface ChainThemeOverride {
  /** 체인 포인트 색 (공식 브랜드 컬러) */
  accent: string
  /** Hero 식별 라벨 — 생략하면 체인 이름 대문자 */
  label?: string
}

export const CHAIN_THEME_OVERRIDES: Record<string, ChainThemeOverride> = {
  avalanche: { accent: '#E84142', label: 'AVALANCHE' },
}

/** 오버라이드가 없을 때 쓰는 Chainery 공통 포인트 (= --editorial-accent) */
export const DEFAULT_CHAIN_ACCENT = '#B79AD6'

export interface ChainThemeSource {
  id: string
  name: string
  logoUrl?: string
}

export interface ChainTheme {
  id: string
  name: string
  logoUrl?: string
  accent: string
  label: string
}

export function getChainTheme(chain: ChainThemeSource): ChainTheme {
  const override = CHAIN_THEME_OVERRIDES[chain.id]
  return {
    id: chain.id,
    name: chain.name,
    logoUrl: chain.logoUrl,
    accent: override?.accent ?? DEFAULT_CHAIN_ACCENT,
    label: override?.label ?? chain.name.toUpperCase(),
  }
}

/** 셸 루트에 붙이면 하위 모든 컴포넌트가 var(--chain-accent) 로 포인트 색을 쓴다 */
export function chainThemeStyle(theme: ChainTheme): CSSProperties {
  return { ['--chain-accent' as string]: theme.accent }
}

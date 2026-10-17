'use client'

import { useState } from 'react'

import { pathForEditorialView } from '@/lib/cryptopedia-routes'

import styles from './about-page.module.css'

/* About ② 화면의 고정 도판 — 공식 문서 → 문단 조각 → 핵심 개념 → 쓰임(아카데미·에이전트 스킬).
   Cherry 방식(문서를 문단으로 쪼개 개념 노드에 붙이고, 개념 페이지가 그 조각을 모아 보여줌)을 그린 것이다.
   좌표는 손으로 배치한 고정 그림이고, 노드 이름과 문서→개념 연결은 public/cryptopedia/hub.json 의
   일부(파일럿 범위)를 옮겨 왔다. 데모 데이터는 아직 문서 단위로만 연결되어 있어서
   조각은 문장 없이 막대로만 그린다(없는 내용을 지어내지 않게).
   개념 이름이나 관계가 바뀌면 여기도 함께 고친다. */

type Kind = 'source' | 'fragment' | 'concept' | 'output'
interface FigureNode {
  id: string
  kind: Kind
  label: string
  x: number
  y: number
  tag?: string
  href?: string
}

const conceptHref = (id: string) =>
  pathForEditorialView({ kind: 'article', id, parent: 'fundamentals' })
const entryHref = (id: string, parent: 'academy' | 'builders') =>
  pathForEditorialView({ kind: 'article', id, parent })

const SOURCE_X = 232
const FRAGMENT_X = 284
const FRAGMENT_W = 24
const FRAGMENT_GAP = 9

const SOURCES: FigureNode[] = [
  // 라벨은 오른쪽 정렬, 사각형은 라벨 끝
  { id: 's-pn', kind: 'source', label: 'Primary Network', tag: 'DOCS', x: SOURCE_X, y: 72 },
  { id: 's-l1', kind: 'source', label: 'Avalanche L1s', tag: 'DOCS', x: SOURCE_X, y: 122 },
  { id: 's-acp77', kind: 'source', label: 'ACP-77', tag: 'ACP', x: SOURCE_X, y: 172 },
  { id: 's-acp99', kind: 'source', label: 'ACP-99', tag: 'ACP', x: SOURCE_X, y: 222 },
  {
    id: 's-academy',
    kind: 'source',
    label: 'Avalanche Academy',
    tag: 'ACADEMY',
    x: SOURCE_X,
    y: 272,
  },
  { id: 's-eth', kind: 'source', label: 'Ethereum Docs', tag: 'STANDARD', x: SOURCE_X, y: 322 },
  { id: 's-sol', kind: 'source', label: 'Solidity Docs', tag: 'STANDARD', x: SOURCE_X, y: 372 },
]

const CONCEPTS: FigureNode[] = [
  // Avalanche 전용
  { id: 'concept-primary-network', kind: 'concept', label: 'Primary Network', x: 370, y: 88 },
  { id: 'concept-avalanche-l1', kind: 'concept', label: 'Avalanche L1', x: 522, y: 88 },
  { id: 'concept-l1-validator', kind: 'concept', label: 'L1 Validator', x: 655, y: 88 },
  { id: 'concept-p-chain', kind: 'concept', label: 'P-Chain', x: 370, y: 168 },
  { id: 'concept-c-chain', kind: 'concept', label: 'C-Chain', x: 455, y: 168 },
  { id: 'concept-x-chain', kind: 'concept', label: 'X-Chain', x: 541, y: 168 },
  { id: 'concept-validator-manager', kind: 'concept', label: 'Validator Manager', x: 655, y: 168 },
  // EVM 공통
  { id: 'concept-evm', kind: 'concept', label: 'EVM', x: 455, y: 272 },
  { id: 'concept-contract', kind: 'concept', label: '스마트 컨트랙트', x: 541, y: 272 },
  { id: 'concept-rpc', kind: 'concept', label: 'RPC·체인 조회', x: 674, y: 272 },
  // 블록체인 공통
  { id: 'concept-consensus', kind: 'concept', label: '합의', x: 455, y: 372 },
  { id: 'concept-validator', kind: 'concept', label: '검증자', x: 580, y: 372 },
]

const OUTPUTS: FigureNode[] = [
  {
    id: 'o-map',
    kind: 'output',
    label: '아카데미',
    tag: '사람',
    x: 850,
    y: 150,
    href: entryHref('skill-graph', 'academy'),
  },
  {
    id: 'o-skill',
    kind: 'output',
    label: '에이전트 스킬',
    tag: '에이전트',
    x: 850,
    y: 310,
    href: entryHref('skill-library', 'builders'),
  },
]

/* 문서 → 개념 연결(hub.json 의 sourceIds). 연결 하나가 문단 조각 하나가 된다 —
   문서는 여러 개념에 걸치지만, 조각은 정확히 한 개념에 붙는다. */
const SOURCE_TO_CONCEPT: Record<string, string[]> = {
  's-pn': ['concept-primary-network', 'concept-p-chain', 'concept-c-chain', 'concept-x-chain'],
  's-l1': ['concept-primary-network', 'concept-avalanche-l1', 'concept-l1-validator'],
  's-acp77': ['concept-avalanche-l1', 'concept-l1-validator', 'concept-validator-manager'],
  's-acp99': ['concept-validator-manager'],
  's-academy': ['concept-p-chain', 'concept-avalanche-l1'],
  's-eth': ['concept-evm', 'concept-rpc', 'concept-consensus', 'concept-validator'],
  's-sol': ['concept-contract'],
}

const FRAGMENTS: FigureNode[] = SOURCES.flatMap((source) => {
  const targets = SOURCE_TO_CONCEPT[source.id] ?? []
  return targets.map((_, index) => ({
    id: `${source.id}-f${index}`,
    kind: 'fragment' as const,
    label: '',
    x: FRAGMENT_X,
    y: source.y + (index - (targets.length - 1) / 2) * FRAGMENT_GAP,
  }))
})

/* 적용 범위 띠 — 공통 개념은 한 번만 정의하고, 체인 전용 개념을 그 위에 얹는다 */
const BANDS = [
  { label: 'AVALANCHE 전용', top: 50, bottom: 200 },
  { label: 'EVM 공통', top: 220, bottom: 310 },
  { label: '블록체인 공통', top: 330, bottom: 400 },
]
const BAND_LEFT = 340
const BAND_RIGHT = 780

type EdgeKind = 'split' | 'feed' | 'relation' | 'use'
const EDGES: [string, string, EdgeKind][] = [
  // 문서 → 조각 → 개념
  ...SOURCES.flatMap((source) =>
    (SOURCE_TO_CONCEPT[source.id] ?? []).flatMap((conceptId, index) => {
      const fragmentId = `${source.id}-f${index}`
      return [
        [source.id, fragmentId, 'split'],
        [fragmentId, conceptId, 'feed'],
      ] as [string, string, EdgeKind][]
    })
  ),
  // 개념 ↔ 개념 (relations)
  ['concept-primary-network', 'concept-avalanche-l1', 'relation'],
  ['concept-avalanche-l1', 'concept-l1-validator', 'relation'],
  ['concept-l1-validator', 'concept-validator-manager', 'relation'],
  ['concept-primary-network', 'concept-p-chain', 'relation'],
  ['concept-primary-network', 'concept-c-chain', 'relation'],
  ['concept-primary-network', 'concept-x-chain', 'relation'],
  ['concept-p-chain', 'concept-avalanche-l1', 'relation'],
  ['concept-c-chain', 'concept-evm', 'relation'],
  ['concept-evm', 'concept-contract', 'relation'],
  ['concept-evm', 'concept-rpc', 'relation'],
  ['concept-consensus', 'concept-validator', 'relation'],
  ['concept-validator', 'concept-l1-validator', 'relation'],
  // 개념 → 쓰임
  ['concept-primary-network', 'o-map', 'use'],
  ['concept-l1-validator', 'o-map', 'use'],
  ['concept-validator-manager', 'o-map', 'use'],
  ['concept-rpc', 'o-map', 'use'],
  ['concept-consensus', 'o-map', 'use'],
  ['concept-validator-manager', 'o-skill', 'use'],
  ['concept-contract', 'o-skill', 'use'],
  ['concept-rpc', 'o-skill', 'use'],
]

const NODES = [...SOURCES, ...FRAGMENTS, ...CONCEPTS, ...OUTPUTS]
const NODE_BY_ID = new Map(NODES.map((node) => [node.id, node]))
const SQUARE = 8

const neighbors = (id: string) =>
  EDGES.flatMap(([from, to]) => (from === id ? [to] : to === id ? [from] : []))

/* 올린 노드와 이웃을 밝히고, 이웃이 조각이면 한 칸 더 건너가
   '이 개념은 어느 문서의 조각에서 왔나 / 이 문서는 어느 개념으로 갔나'가 이어져 보이게 한다 */
function highlightOf(active: string) {
  const lit = new Set([active])
  for (const next of neighbors(active)) {
    lit.add(next)
    if (NODE_BY_ID.get(next)?.kind === 'fragment') for (const far of neighbors(next)) lit.add(far)
  }
  return lit
}

/* 조각은 막대라 선이 막대의 양 끝에 붙는다 */
const anchor = (node: FigureNode, side: 'in' | 'out') =>
  node.kind === 'fragment'
    ? { x: side === 'in' ? node.x : node.x + FRAGMENT_W, y: node.y }
    : { x: node.x, y: node.y }

export function AboutOntologyFigure() {
  const [active, setActive] = useState<string | null>(null)
  const lit = active ? highlightOf(active) : null
  const isFragment = (id: string) => NODE_BY_ID.get(id)?.kind === 'fragment'
  const nodeState = (id: string) => (!lit ? undefined : lit.has(id) ? 'on' : 'off')
  const edgeState = (from: string, to: string) => {
    if (!lit) return undefined
    const touches = from === active || to === active || isFragment(from) || isFragment(to)
    return touches && lit.has(from) && lit.has(to) ? 'on' : 'off'
  }

  return (
    <div className={styles.figureScroll}>
      <svg
        viewBox="96 12 904 400"
        className={styles.figure}
        role="img"
        aria-label="공식 문서를 문단 조각으로 나눠 핵심 개념에 모으고, 같은 개념을 아카데미와 에이전트 스킬로 쓰는 구조"
        onMouseLeave={() => setActive(null)}
      >
        <text x={SOURCE_X} y={28} textAnchor="end" className={styles.figColumn}>
          출처
        </text>
        <text
          x={FRAGMENT_X + FRAGMENT_W / 2}
          y={28}
          textAnchor="middle"
          className={styles.figColumn}
        >
          문단 조각
        </text>
        <text x={BAND_LEFT} y={28} className={styles.figColumn}>
          핵심 개념
        </text>
        <text x={850} y={28} className={styles.figColumn}>
          쓰임
        </text>

        {BANDS.map((band) => (
          <g key={band.label}>
            <rect
              x={BAND_LEFT}
              y={band.top}
              width={BAND_RIGHT - BAND_LEFT}
              height={band.bottom - band.top}
              className={styles.figBand}
            />
            <text
              x={BAND_RIGHT - 6}
              y={band.bottom - 7}
              textAnchor="end"
              className={styles.figBandLabel}
            >
              {band.label}
            </text>
          </g>
        ))}

        {EDGES.map(([from, to, kind]) => {
          const a = anchor(NODE_BY_ID.get(from)!, 'out')
          const b = anchor(NODE_BY_ID.get(to)!, 'in')
          return (
            <line
              key={`${from}-${to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={styles.figEdge}
              data-kind={kind}
              data-state={edgeState(from, to)}
            />
          )
        })}

        {FRAGMENTS.map((fragment) => (
          <rect
            key={fragment.id}
            x={fragment.x}
            y={fragment.y - 1.5}
            width={FRAGMENT_W}
            height={3}
            className={styles.figFragment}
            data-state={nodeState(fragment.id)}
            onMouseEnter={() => setActive(fragment.id)}
          />
        ))}

        {[...SOURCES, ...CONCEPTS, ...OUTPUTS].map((node) => {
          const square = (
            <rect
              x={node.x - SQUARE / 2}
              y={node.y - SQUARE / 2}
              width={SQUARE}
              height={SQUARE}
              className={styles.figSquare}
              data-kind={node.kind}
            />
          )
          const body =
            node.kind === 'source' ? (
              <>
                {square}
                <text x={node.x - 14} y={node.y + 4} textAnchor="end" className={styles.figLabel}>
                  {node.label}
                </text>
                <text x={node.x - 14} y={node.y + 18} textAnchor="end" className={styles.figTag}>
                  {node.tag}
                </text>
              </>
            ) : node.kind === 'concept' ? (
              <>
                {square}
                <text x={node.x - 4} y={node.y - 10} className={styles.figLabel}>
                  {node.label}
                </text>
              </>
            ) : (
              <>
                <rect
                  x={node.x - 7}
                  y={node.y - 7}
                  width={14}
                  height={14}
                  className={styles.figSquare}
                  data-kind="output"
                />
                <text x={node.x + 16} y={node.y + 5} className={styles.figOutput}>
                  {node.label}
                </text>
                <text x={node.x + 16} y={node.y + 21} className={styles.figTag}>
                  {node.tag}
                </text>
              </>
            )
          const href = node.kind === 'concept' ? conceptHref(node.id) : node.href
          const common = {
            className: styles.figNode,
            'data-state': nodeState(node.id),
            onMouseEnter: () => setActive(node.id),
            onFocus: () => setActive(node.id),
            onBlur: () => setActive(null),
          }
          return href ? (
            <a key={node.id} href={href} aria-label={node.label} {...common}>
              {body}
            </a>
          ) : (
            <g key={node.id} {...common}>
              {body}
            </g>
          )
        })}
      </svg>
      <p className={styles.figHint} aria-hidden="true">
        ← 옆으로 밀어 보기 →
      </p>
    </div>
  )
}

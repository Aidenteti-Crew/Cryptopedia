'use client'

import { Fragment } from 'react'

import type { HubData } from '@/lib/cryptopedia-hub'

/* 아카데미 > 학습 지도의 지도 본체.
   세로 = 적용 범위 띠(체인 전용 → EVM 공통 → 블록체인 공통),
   가로 = 선행 관계 깊이(왼쪽일수록 먼저 알아야 하는 개념).
   관계 읽는 법은 Cherry 온톨로지와 같다: 개념 X 의 relations 에 {id: Y, type: PREREQUISITE} 가 있으면
   'Y 는 X 의 선행 개념'이다. 배치는 hub.json 에서 계산하므로 개념이 늘어도 지도가 따라간다. */

type Concept = HubData['concepts'][number]

/* 입문 경로 — 예전 '입문' 페이지의 추천 순서(Primary Network → P·C·X → L1)를 지도 위 경로로 옮겼다 */
export const INTRO_ROUTE = [
  'concept-primary-network',
  'concept-p-chain',
  'concept-c-chain',
  'concept-x-chain',
  'concept-avalanche-l1',
  'concept-l1-validator',
]

const BANDS: { kind: Concept['scope']['kind']; label: string }[] = [
  { kind: 'CHAIN', label: '체인 전용' },
  { kind: 'EVM', label: 'EVM 공통' },
  { kind: 'BLOCKCHAIN', label: '블록체인 공통' },
]

const COL_W = 224
const NODE_W = 176
const NODE_H = 36
const ROW_H = 52
const BAND_HEAD = 34
const BAND_GAP = 14
const PAD_X = 28
const PAD_TOP = 30

export interface MapLayout {
  width: number
  height: number
  nodes: Map<string, { x: number; y: number; concept: Concept }>
  bands: { label: string; top: number; height: number }[]
  prereqs: Map<string, string[]>
  edges: { from: string; to: string; kind: 'prereq' | 'related' }[]
  columns: number
}

export function layoutLearningMap(concepts: Concept[]): MapLayout {
  const byId = new Map(concepts.map((concept) => [concept.id, concept]))
  const prereqs = new Map(
    concepts.map((concept) => [
      concept.id,
      concept.relations
        .filter((relation) => relation.type === 'PREREQUISITE' && byId.has(relation.id))
        .map((relation) => relation.id),
    ])
  )

  // 깊이 = 가장 긴 선행 사슬의 길이 (순환이 있어도 멈추도록 방문 표시)
  const depth = new Map<string, number>()
  const depthOf = (id: string, seen = new Set<string>()): number => {
    if (depth.has(id)) return depth.get(id)!
    if (seen.has(id)) return 0
    seen.add(id)
    const parents = prereqs.get(id) ?? []
    const value = parents.length ? Math.max(...parents.map((p) => depthOf(p, seen))) + 1 : 0
    depth.set(id, value)
    return value
  }
  concepts.forEach((concept) => depthOf(concept.id))
  const columns = Math.max(0, ...depth.values()) + 1

  const nodes: MapLayout['nodes'] = new Map()
  const rowOf = new Map<string, number>()
  const bands: MapLayout['bands'] = []
  let top = PAD_TOP
  for (const band of BANDS) {
    const members = concepts.filter((concept) => concept.scope.kind === band.kind)
    if (!members.length) continue
    let rows = 0
    for (let col = 0; col < columns; col += 1) {
      // 같은 띠 안 선행 개념의 행 평균에 가깝게 — 선이 짧고 덜 꼬이게
      const inColumn = members
        .filter((concept) => depth.get(concept.id) === col)
        .map((concept, index) => {
          const local = (prereqs.get(concept.id) ?? []).filter((p) => rowOf.has(p))
          const desired = local.length
            ? Math.round(local.reduce((sum, p) => sum + rowOf.get(p)!, 0) / local.length)
            : 0
          const crossBandOnly = !local.length && (prereqs.get(concept.id) ?? []).length > 0
          return { concept, desired, crossBandOnly, index }
        })
        .sort(
          (a, b) =>
            Number(a.crossBandOnly) - Number(b.crossBandOnly) ||
            a.desired - b.desired ||
            a.index - b.index
        )
      let next = 0
      for (const item of inColumn) {
        const row = Math.max(item.desired, next)
        next = row + 1
        rowOf.set(item.concept.id, row)
        nodes.set(item.concept.id, {
          x: PAD_X + col * COL_W,
          y: top + BAND_HEAD + row * ROW_H,
          concept: item.concept,
        })
        rows = Math.max(rows, row + 1)
      }
    }
    const height = BAND_HEAD + rows * ROW_H + 4
    bands.push({ label: band.label, top, height })
    top += height + BAND_GAP
  }

  // 선(중복 제거): 한쪽이라도 PREREQUISITE 면 선행 화살표, 아니면 관련 점선
  const edges: MapLayout['edges'] = []
  const seen = new Set<string>()
  for (const concept of concepts)
    for (const relation of concept.relations) {
      if (!byId.has(relation.id)) continue
      const key = [concept.id, relation.id].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      if (prereqs.get(concept.id)?.includes(relation.id))
        edges.push({ from: relation.id, to: concept.id, kind: 'prereq' })
      else if (prereqs.get(relation.id)?.includes(concept.id))
        edges.push({ from: concept.id, to: relation.id, kind: 'prereq' })
      else edges.push({ from: concept.id, to: relation.id, kind: 'related' })
    }

  return {
    width: PAD_X * 2 + (columns - 1) * COL_W + NODE_W + 40,
    height: top - BAND_GAP + 12,
    nodes,
    bands,
    prereqs,
    edges,
    columns,
  }
}

/* 고른 개념의 선행 개념 전부(위쪽 사슬)와 바로 다음 개념 */
export function neighborhood(layout: MapLayout, selected: string) {
  const before = new Set<string>()
  const walk = (id: string) => {
    for (const parent of layout.prereqs.get(id) ?? [])
      if (!before.has(parent)) {
        before.add(parent)
        walk(parent)
      }
  }
  walk(selected)
  const after = new Set(
    [...layout.prereqs.entries()]
      .filter(([, parents]) => parents.includes(selected))
      .map(([id]) => id)
  )
  return { before, after }
}

function edgePath(
  a: { x: number; y: number },
  b: { x: number; y: number },
  kind: 'prereq' | 'related'
) {
  const ay = a.y + NODE_H / 2
  const by = b.y + NODE_H / 2
  if (a.x === b.x) {
    // 같은 열: 왼쪽으로 둥글게 돌아 잇는다
    const x = a.x
    return `M ${x} ${ay} C ${x - 34} ${ay}, ${x - 34} ${by}, ${x} ${by}`
  }
  const [left, right] = a.x < b.x ? [a, b] : [b, a]
  const ly = left === a ? ay : by
  const ry = left === a ? by : ay
  const x1 = left.x + NODE_W
  const x2 = right.x - (kind === 'prereq' ? 6 : 0)
  const mid = (x1 + x2) / 2
  return `M ${x1} ${ly} C ${mid} ${ly}, ${mid} ${ry}, ${x2} ${ry}`
}

export function LearningMap({
  layout,
  selected,
  route,
  onSelect,
}: {
  layout: MapLayout
  selected: string
  /* 켜져 있으면 경로 순서대로 번호와 경로선을 그린다 */
  route: string[] | null
  onSelect: (id: string) => void
}) {
  const { before, after } = neighborhood(layout, selected)
  const routeIndex = new Map((route ?? []).map((id, index) => [id, index]))
  const stateOf = (id: string) =>
    id === selected
      ? 'here'
      : route
        ? routeIndex.has(id)
          ? 'route'
          : 'dim'
        : before.has(id)
          ? 'before'
          : after.has(id)
            ? 'after'
            : 'dim'
  const edgeOn = (from: string, to: string) =>
    route
      ? false
      : (to === selected && before.has(from)) ||
        (before.has(to) && before.has(from)) ||
        (from === selected && after.has(to))

  return (
    <div className="mt-6 overflow-x-auto border border-[var(--editorial-line)] bg-[var(--editorial-surface)]">
      <div
        className="relative"
        style={{ width: layout.width, height: layout.height, minWidth: '100%' }}
        aria-label="개념 학습 지도"
        role="group"
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <marker
              id="learning-map-arrow"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0 0 L8 4 L0 8 z" fill="currentColor" />
            </marker>
          </defs>
          {layout.bands.map((band) => (
            <g key={band.label}>
              <line
                x1={0}
                x2="100%"
                y1={band.top}
                y2={band.top}
                stroke="var(--editorial-line)"
                strokeWidth={1}
              />
              <text
                x={PAD_X}
                y={band.top + 20}
                fill="var(--editorial-muted)"
                fontSize={11}
                letterSpacing="0.12em"
              >
                {band.label}
              </text>
            </g>
          ))}
          {Array.from({ length: layout.columns }, (_, col) => (
            <text
              key={col}
              x={PAD_X + col * COL_W}
              y={18}
              textAnchor="start"
              fill="var(--editorial-muted)"
              fontSize={10}
              letterSpacing="0.12em"
            >
              {col === 0 ? '출발 개념' : `${col}단계`}
            </text>
          ))}
          {layout.edges.map((edge) => {
            const a = layout.nodes.get(edge.from)!
            const b = layout.nodes.get(edge.to)!
            const on = edgeOn(edge.from, edge.to)
            return (
              <path
                key={`${edge.from}-${edge.to}`}
                d={edgePath(a, b, edge.kind)}
                fill="none"
                className={on ? 'text-[var(--editorial-accent)]' : 'text-[var(--editorial-muted)]'}
                stroke="currentColor"
                strokeWidth={on ? 1.6 : 1}
                strokeDasharray={edge.kind === 'related' ? '3 4' : undefined}
                opacity={on ? 1 : route ? 0.15 : edge.kind === 'related' ? 0.35 : 0.55}
                markerEnd={edge.kind === 'prereq' ? 'url(#learning-map-arrow)' : undefined}
              />
            )
          })}
          {route &&
            route.slice(1).map((id, index) => {
              const a = layout.nodes.get(route[index])
              const b = layout.nodes.get(id)
              if (!a || !b) return null
              return (
                <line
                  key={`route-${id}`}
                  x1={a.x + NODE_W / 2}
                  y1={a.y + NODE_H / 2}
                  x2={b.x + NODE_W / 2}
                  y2={b.y + NODE_H / 2}
                  stroke="var(--editorial-accent)"
                  strokeWidth={2}
                />
              )
            })}
        </svg>

        {[...layout.nodes.entries()].map(([id, node]) => {
          const state = stateOf(id)
          const step = routeIndex.get(id)
          return (
            <Fragment key={id}>
              {/* {state === 'here' && (
                <span
                  className="absolute text-[10px] tracking-[0.12em] text-[var(--editorial-accent)]"
                  style={{ left: node.x, top: node.y - 15 }}
                >
                  지금 여기
                </span>
              )} */}
              <button
                type="button"
                aria-pressed={state === 'here'}
                onClick={() => onSelect(id)}
                data-state={state}
                className={[
                  'absolute flex items-center gap-2 border px-3 text-left text-[13px] transition-[opacity,color,border-color]',
                  state === 'here'
                    ? 'border-[var(--editorial-accent)] bg-[var(--editorial-accent)] text-[var(--editorial-paper)]'
                    : state === 'before'
                      ? 'border-[var(--editorial-ink)] bg-[var(--editorial-surface)] text-[var(--editorial-ink)]'
                      : state === 'after'
                        ? 'border-dashed border-[var(--editorial-accent)] bg-[var(--editorial-surface)] text-[var(--editorial-accent)]'
                        : state === 'route'
                          ? 'border-[var(--editorial-accent)] bg-[var(--editorial-surface)] text-[var(--editorial-ink)]'
                          : 'border-[var(--editorial-line)] bg-[var(--editorial-surface)] text-[var(--editorial-muted)] opacity-60 hover:opacity-100',
                  'hover:border-[var(--editorial-accent)]',
                ].join(' ')}
                style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
              >
                {step !== undefined && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-[var(--editorial-accent)] text-[11px] text-[var(--editorial-paper)]">
                    {step + 1}
                  </span>
                )}
                <span className="truncate">{node.concept.title}</span>
              </button>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

export function LearningMapLegend({ route }: { route: boolean }) {
  const item = 'inline-flex items-center gap-2'
  const swatch = 'inline-block h-3 w-5 border'
  return (
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-[var(--editorial-muted)]">
      <span className={item}>
        <span
          className={`${swatch} border-[var(--editorial-accent)] bg-[var(--editorial-accent)]`}
        />
        지금 여기
      </span>
      {route ? (
        <span className={item}>
          <span className={`${swatch} border-[var(--editorial-accent)]`} />
          경로 단계
        </span>
      ) : (
        <>
          <span className={item}>
            <span className={`${swatch} border-[var(--editorial-ink)]`} />
            먼저 알아야 할 개념
          </span>
          <span className={item}>
            <span className={`${swatch} border-dashed border-[var(--editorial-accent)]`} />
            다음 개념
          </span>
        </>
      )}
      <span className={item}>→ 선행 관계</span>
      <span className={item}>┄ 관련 개념</span>
    </div>
  )
}

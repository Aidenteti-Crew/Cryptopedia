'use client'

import { useState } from 'react'

import type { PatchNoteItem } from '@/lib/api'
import type { HubData } from '@/lib/cryptopedia-hub'
import { PatchNoteTimelineItem } from '../patch-notes-page'
import { HUB_BUTTON_CLASS, HUB_PAGE_CLASS, HubHeader } from './hub-shared'

const CATEGORIES = { NETWORK: '네트워크', TOOL: '개발 도구', KNOWLEDGE: '지식·스킬' }

export function DevelopmentPatchNotes({
  data,
  onOpen,
}: {
  data: HubData
  onOpen: (id: string) => void
}) {
  const [filter, setFilter] = useState('all')
  const updates = data.updates
    .filter((update) => filter === 'all' || update.category === filter)
    .toSorted((left, right) => right.date.localeCompare(left.date))
  return (
    <article className={HUB_PAGE_CLASS}>
      <HubHeader
        eyebrow="PATCH NOTES / CONNECTED UPDATES"
        title="개발 업데이트"
        description="변경 사항이 어떤 개념, 실습과 에이전트 스킬에 영향을 주는지 확인하세요. 현재 목록은 연결 흐름을 보여주는 데모 시나리오이며 실시간 수집 소식이 아닙니다."
      />
      <div className="mt-6 flex flex-wrap gap-2" aria-label="개발 업데이트 분야">
        {[['all', '전체'], ...Object.entries(CATEGORIES)].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`${HUB_BUTTON_CLASS} text-xs ${filter === value ? 'border-[var(--editorial-accent)] text-[var(--editorial-accent)]' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-5 text-xs text-[var(--editorial-muted)]">
        {updates.length}개 변경 시나리오 · 예시 날짜순
      </p>
      <div className="mt-7 grid gap-8 xl:grid-cols-[1fr_280px]">
        <div className="relative">
          <div className="absolute bottom-0 left-[4px] top-2 w-px bg-[var(--editorial-line)]" />
          {updates.map((update, index) => {
            const item: PatchNoteItem = {
              id: update.id,
              articleStateId: update.id,
              date: update.date.slice(0, 10),
              page: update.category,
              area: CATEGORIES[update.category],
              categoryName: update.category,
              dotColor: '#cebd91',
              entityName: 'Avalanche',
              title: update.title,
              oneLiner: `${update.summary} · ${update.impacts.length}개 연결 자료`,
              score: 0,
              isRead: false,
              sideCategory: null,
            }
            return (
              <PatchNoteTimelineItem
                key={item.id}
                item={item}
                index={index}
                total={updates.length}
                appearance="editorial"
                onRead={onOpen}
              />
            )
          })}
          {!updates.length && (
            <p className="pl-6 text-sm text-[var(--editorial-muted)]">
              이 분야의 변경 시나리오가 없습니다.
            </p>
          )}
        </div>
        <aside className="h-fit rounded-xl border border-[var(--editorial-line)] bg-[var(--editorial-surface)] p-5">
          <p className="text-[11px] text-[var(--editorial-accent)]">FROM UPDATE TO ACTION</p>
          <h2 className="mt-3 text-lg">변경에서 다음 행동으로</h2>
          <ol className="mt-4 list-inside list-decimal space-y-3 text-xs leading-6 text-[var(--editorial-muted)]">
            <li>변경 내용과 공식 출처 확인</li>
            <li>연결된 자료·실습·스킬 찾기</li>
            <li>적용 환경과 지침 재검토</li>
          </ol>
          <p className="mt-5 border-t border-[var(--editorial-line)] pt-4 text-xs leading-6 text-[var(--editorial-muted)]">
            영향 관계는 편집한 예시 데이터입니다. 자동 영향 분석과 개인별 알림은 후속 기능입니다.
          </p>
        </aside>
      </div>
    </article>
  )
}

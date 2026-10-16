'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  LayoutGrid,
  Rocket,
  FileText,
  GitPullRequest,
  MoreHorizontal,
} from 'lucide-react'
import type { ContentEntry } from '@/lib/cryptopedia-types'
import {
  CHANGE_LABELS,
  DEFAULT_DEVELOPMENT_FILTERS,
  NETWORK_LABELS,
  deduplicateUpdates,
  majorUpdates,
  selectDevelopmentUpdates,
  selectedFilterValues,
  updateProducts,
  type DevelopmentFilters,
} from '@/lib/development-discovery'
import { DiscoveryHeader, DiscoverySearch, DiscoveryFilter } from './discovery-controls'
import { DiscoveryDateRange } from './discovery-date-range'
import { ReleaseHistory } from './development-release-history'
import { DevelopmentChangelog } from './development-changelog'
import { DevelopmentUpdateDetail } from './development-update-detail'
import {
  DiscoveryFilterPanel,
  DiscoveryCheckboxGroup,
  DiscoveryResults,
  DiscoveryTypeBar,
} from './discovery-filters'
import { useDiscoveryState, DiscoveryScrollRestore } from './discovery-state'

export function DevelopmentUpdatesPage({
  entries,
  stateKey = 'updates',
}: {
  entries: ContentEntry[]
  stateKey?: string
}) {
  const id = useId()
  const [tab, setTab] = useDiscoveryState<'all' | 'versions'>(`${stateKey}:tab`, 'all')
  const [filters, setFilters] = useDiscoveryState<DevelopmentFilters>(
    `${stateKey}:filters`,
    DEFAULT_DEVELOPMENT_FILTERS
  )
  const [historyProduct, setHistoryProduct] = useDiscoveryState(`${stateKey}:product`, '')
  const [historyStage, setHistoryStage] = useDiscoveryState<string[]>(`${stateKey}:stage`, [])
  const [detailId, setDetailId] = useState<string | null>(null)
  const [mobileDetailId, setMobileDetailId] = useState<string | null>(null)
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)')
    const change = () => {
      if (media.matches) setMobileDetailId(null)
    }
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  const returnFocus = useRef<HTMLElement | null>(null)
  const workspace = useRef<HTMLDivElement | null>(null)
  const listPane = useRef<HTMLElement | null>(null)
  const all = useMemo(() => deduplicateUpdates(entries), [entries])
  const products = useMemo(
    () =>
      [...new Map(all.flatMap(updateProducts).map((p) => [p.id, p])).values()].sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    [all]
  )
  const releaseProducts = useMemo(
    () =>
      products.filter((p) =>
        all.some((e) => e.subKind === 'RELEASE' && updateProducts(e).some((v) => v.id === p.id))
      ),
    [all, products]
  )
  const selectedProduct = releaseProducts.find((p) => p.id === historyProduct)
  const history = tab === 'versions'
  const shown = useMemo(
    () =>
      selectDevelopmentUpdates(
        all,
        {
          ...filters,
          product: history ? (selectedProduct?.id ?? 'all') : filters.product,
          stage: history ? historyStage : filters.stage,
        },
        history
      ),
    [all, filters, history, selectedProduct?.id, historyStage]
  )
  const highlights = useMemo(() => (history ? [] : majorUpdates(shown)), [shown, history])
  const selectedEntry = shown.find((entry) => entry.id === detailId) ?? shown[0] ?? null
  const hasResults = shown.length > 0
  useEffect(() => {
    const element = workspace.current
    if (!element || !hasResults) return
    const scrollPastToolbar = (delta: number) => {
      if (!window.matchMedia('(min-width: 1280px)').matches || !delta) return false
      if (delta > 0) {
        const distance = element.getBoundingClientRect().top - 24
        if (distance <= 1) return false
        window.scrollBy({ top: Math.min(delta, distance), behavior: 'instant' })
      } else {
        if (window.scrollY <= 0) return false
        window.scrollBy({ top: -Math.min(-delta, window.scrollY), behavior: 'instant' })
      }
      return true
    }
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
      if (scrollPastToolbar(event.deltaY * scale)) event.preventDefault()
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if ((event.target as HTMLElement).closest('button, a, input, select, textarea')) return
      const delta =
        event.key === 'PageDown'
          ? window.innerHeight * 0.8
          : event.key === 'PageUp'
            ? -window.innerHeight * 0.8
            : event.key === 'ArrowDown'
              ? 40
              : event.key === 'ArrowUp'
                ? -40
                : 0
      if (scrollPastToolbar(delta)) event.preventDefault()
    }
    element.addEventListener('wheel', wheel, { passive: false })
    element.addEventListener('keydown', keydown)
    return () => {
      element.removeEventListener('wheel', wheel)
      element.removeEventListener('keydown', keydown)
    }
  }, [hasResults])
  useEffect(() => {
    listPane.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [filters, tab, historyProduct, historyStage])
  const set = (name: keyof DevelopmentFilters, value: string | string[]) =>
    setFilters((current) => ({
      ...current,
      [name]: value,
      ...(name === 'kind' && value !== 'RELEASE' ? { stage: 'all' } : {}),
    }))
  const open = (entryId: string) => {
    returnFocus.current = document.activeElement as HTMLElement
    setDetailId(entryId)
    if (!window.matchMedia('(min-width: 1280px)').matches) setMobileDetailId(entryId)
  }
  const active =
    filters.query ||
    filters.from ||
    filters.to ||
    (!history && selectedFilterValues(filters.product).length > 0) ||
    (!history && filters.kind !== 'all') ||
    selectedFilterValues(history ? historyStage : filters.stage).length > 0 ||
    selectedFilterValues(filters.network).length > 0 ||
    selectedFilterValues(filters.change).length > 0 ||
    filters.sort !== 'latest'
  const reset = () => {
    setDetailId(null)
    setMobileDetailId(null)
    setFilters(DEFAULT_DEVELOPMENT_FILTERS)
    setHistoryStage([])
    setHistoryProduct('')
  }
  const additionalCount =
    (history ? 0 : selectedFilterValues(filters.product).length) +
    selectedFilterValues(history ? historyStage : filters.stage).length +
    selectedFilterValues(filters.network).length +
    selectedFilterValues(filters.change).length +
    Number(!!filters.from || !!filters.to)
  const updateTabs = (value: 'all' | 'versions') => {
    setTab(value)
    // A content-type filter from the all-updates view does not hide the product's releases.
  }

  return (
    <article className="px-4 pb-6 pt-4 sm:px-8 sm:pb-8 lg:px-[52px] lg:pb-[52px]">
      <DiscoveryHeader
        theme="updates"
        count={all.length}
        title="개발 업데이트"
        description="Avalanche 개발 소식과 제품별 릴리스 이력을 확인하세요."
      />

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div
          role="tablist"
          aria-label="개발 업데이트 보기"
          className="inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-white/[.04] p-1"
        >
          {(
            [
              { value: 'all', label: '전체 업데이트' },
              { value: 'versions', label: '제품별 버전 이력' },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              id={`${id}-${value}-tab`}
              type="button"
              role="tab"
              aria-selected={tab === value}
              aria-controls={`${id}-panel`}
              tabIndex={tab === value ? 0 : -1}
              onClick={() => updateTabs(value)}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
                event.preventDefault()
                const next =
                  event.key === 'Home'
                    ? 'all'
                    : event.key === 'End'
                      ? 'versions'
                      : tab === 'all'
                        ? 'versions'
                        : 'all'
                updateTabs(next)
                document.getElementById(`${id}-${next}-tab`)?.focus()
              }}
              className={`min-h-10 rounded-lg px-4 text-sm transition-colors ${tab === value ? 'bg-[var(--editorial-accent)] font-medium text-[#15191e]' : 'text-[var(--editorial-muted)] hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="w-full rounded-xl border border-white/10 sm:w-[300px]">
          <DiscoverySearch
            value={filters.query}
            onChange={(v) => set('query', v)}
            placeholder="제목·내용·버전·출처 검색"
          />
        </div>
      </div>

      <DiscoveryTypeBar
        label={history ? '릴리스 제품' : '콘텐츠 유형'}
        value={history ? (selectedProduct?.id ?? 'all') : filters.kind}
        onChange={(value) => {
          if (history) setHistoryProduct(value === 'all' ? '' : value)
          else set('kind', value)
        }}
        options={
          history
            ? [
                { value: 'all', label: '전체' },
                ...releaseProducts.map((p) => ({ value: p.id, label: p.name })),
              ]
            : [
                { value: 'all', label: '전체', Icon: LayoutGrid },
                {
                  value: 'RELEASE',
                  label: '릴리스',
                  Icon: Rocket,
                  color: 'text-[#8bcab4]',
                  background: 'bg-[#8bcab4]/10',
                },
                {
                  value: 'BLOG',
                  label: '기술 아티클',
                  Icon: FileText,
                  color: 'text-[#baa4df]',
                  background: 'bg-[#baa4df]/10',
                },
                {
                  value: 'ACP',
                  label: 'ACP 제안',
                  Icon: GitPullRequest,
                  color: 'text-[#a9bde9]',
                  background: 'bg-[#a9bde9]/10',
                },
                { value: 'OTHER', label: '기타', Icon: MoreHorizontal },
              ].filter(
                (item) =>
                  item.value === 'all' ||
                  all.some((entry) => (entry.subKind ?? 'OTHER') === item.value)
              )
        }
      >
        <DiscoveryFilterPanel
          count={additionalCount}
          resultCount={shown.length}
          onReset={() => {
            setFilters((current) => ({
              ...current,
              product: 'all',
              stage: 'all',
              from: '',
              to: '',
              network: 'all',
              change: 'all',
            }))
            setHistoryStage([])
          }}
        >
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {!history && (
              <DiscoveryCheckboxGroup
                label="제품"
                value={selectedFilterValues(filters.product)}
                onChange={(v) => set('product', v)}
                options={[
                  ...products.map((p) => ({ value: p.id, label: p.name })),
                  ...(all.some((e) => !updateProducts(e).length)
                    ? [{ value: 'unknown', label: '제품 미지정' }]
                    : []),
                ]}
              />
            )}
            {(history || filters.kind === 'RELEASE') && (
              <DiscoveryCheckboxGroup
                label="릴리스 단계"
                value={selectedFilterValues(history ? historyStage : filters.stage)}
                onChange={(v) => (history ? setHistoryStage(v) : set('stage', v))}
                options={[
                  { value: 'stable', label: '정식 릴리스' },
                  { value: 'prerelease', label: '출시 후보·프리릴리스' },
                  { value: 'unknown', label: '단계 미확인' },
                ]}
              />
            )}
            <DiscoveryCheckboxGroup
              label="환경"
              value={selectedFilterValues(filters.network)}
              onChange={(v) => set('network', v)}
              options={Object.entries(NETWORK_LABELS)
                .filter(([key]) => key !== 'BOTH')
                .map(([value, label]) => ({ value, label }))}
            />
            <DiscoveryCheckboxGroup
              label="변경 성격"
              value={selectedFilterValues(filters.change)}
              onChange={(v) => set('change', v)}
              options={Object.entries(CHANGE_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <div className="space-y-2 border-t border-white/10 pt-4 sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-medium text-[var(--editorial-muted)]">공개일</p>
              <DiscoveryDateRange
                label="공개일 범위"
                from={filters.from}
                to={filters.to}
                onChange={(from, to) => setFilters((current) => ({ ...current, from, to }))}
              />
            </div>
          </div>
        </DiscoveryFilterPanel>
      </DiscoveryTypeBar>

      <DiscoveryResults count={shown.length} active={!!active} onReset={reset}>
        <DiscoveryFilter
          label="정렬"
          value={filters.sort}
          onChange={(value) => set('sort', value)}
          options={[
            { value: 'latest', label: '최신순' },
            { value: 'oldest', label: '오래된순' },
          ]}
        />
      </DiscoveryResults>

      <div
        ref={workspace}
        className={
          shown.length
            ? 'grid items-start gap-6 xl:h-[calc(100dvh-48px)] xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:grid-rows-[minmax(0,1fr)]'
            : ''
        }
      >
        <section
          ref={listPane}
          tabIndex={0}
          className="development-navigation min-h-0 min-w-0 xl:h-full xl:overflow-y-auto xl:overscroll-contain xl:pr-3"
          role="tabpanel"
          id={`${id}-panel`}
          aria-labelledby={`${id}-${tab}-tab`}
        >
          {highlights.length > 0 && (
            <section
              aria-label="주요 업데이트"
              className="mb-6 rounded-[20px] border border-[#cebd91]/20 bg-[#cebd91]/[.045] p-5 sm:p-6"
            >
              <h2 className="mb-4 text-sm font-semibold text-[var(--editorial-accent)]">
                주요 업데이트
              </h2>
              <div className="space-y-4">
                {highlights.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => open(entry.id)}
                    className="flex w-full items-start gap-4 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold leading-7">{entry.title}</h3>
                      <p className="mt-1 line-clamp-1 text-xs leading-6 text-[var(--editorial-muted)]">
                        {entry.summary}
                      </p>
                      <p className="mt-2 text-[11px] text-[var(--editorial-accent)]">
                        {entry.changeFlags?.map((flag) => CHANGE_LABELS[flag.kind]).join(' · ')} ·
                        공식 근거 보기
                      </p>
                    </div>
                    <ArrowRight size={17} className="mt-1.5 text-[var(--editorial-accent)]" />
                  </button>
                ))}
              </div>
            </section>
          )}
          {!shown.length ? (
            <div className="flex min-h-60 flex-col items-center justify-center gap-4 border-y border-white/[.06] text-center">
              <p className="text-sm text-[var(--editorial-muted)]">
                {all.length
                  ? '검색 조건에 맞는 업데이트가 없습니다.'
                  : '아직 수집된 개발 업데이트가 없습니다.'}
              </p>
              {active && (
                <button
                  type="button"
                  onClick={reset}
                  className="min-h-10 rounded-lg border border-white/15 px-4 text-xs"
                >
                  필터 초기화
                </button>
              )}
            </div>
          ) : history ? (
            <ReleaseHistory
              productName={selectedProduct?.name ?? '전체'}
              entries={shown}
              onOpen={open}
              compact
              selectedId={selectedEntry?.id}
            />
          ) : (
            <DevelopmentChangelog
              entries={shown}
              onOpen={open}
              compact
              selectedId={selectedEntry?.id}
              onProductSelect={(product) => set('product', product)}
            />
          )}
        </section>
        {selectedEntry && (
          <aside
            aria-label="선택한 개발 업데이트 상세"
            className="hidden min-h-0 min-w-0 rounded-2xl border border-[var(--discovery-line)] bg-[var(--discovery-surface)] xl:block xl:h-full"
          >
            <div
              key={selectedEntry.id}
              tabIndex={0}
              role="region"
              aria-label="업데이트 상세 내용"
              className="h-full overflow-y-auto overscroll-contain rounded-2xl"
            >
              <DevelopmentUpdateDetail
                inline
                entry={selectedEntry}
                onClose={() => setMobileDetailId(null)}
                returnFocus={returnFocus}
              />
            </div>
          </aside>
        )}
      </div>
      <DevelopmentUpdateDetail
        entry={shown.find((e) => e.id === mobileDetailId) ?? null}
        onClose={() => setMobileDetailId(null)}
        returnFocus={returnFocus}
      />
      <DiscoveryScrollRestore stateKey={stateKey} />
    </article>
  )
}

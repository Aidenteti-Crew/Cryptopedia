import { ArrowUpRight } from 'lucide-react'

import type { ContentEntry } from '@/lib/cryptopedia-types'
import { calendarDay } from '@/lib/editorial-discovery'
import { stageLabel } from '@/lib/protocol-stage'

type ProtocolStage = NonNullable<ContentEntry['protocolStage']>

const day = (iso: string | null) => (iso ? calendarDay(iso).replaceAll('-', '.') : '미확인')

function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--editorial-accent)]"
    >
      {children}
      <ArrowUpRight size={12} aria-hidden />
    </a>
  )
}

// 지금 상태: the document's own status and the release record, side by side. When they disagree
// (document Proposed, release already ships it) both are shown rather than one being picked.
export function ProtocolStageSection({ stage }: { stage: ProtocolStage }) {
  return (
    <section className="mt-8 border-t border-[var(--editorial-line)] pt-6">
      <h3 className="text-xs font-semibold tracking-wide text-[var(--editorial-accent)]">지금 상태</h3>
      <dl className="mt-4 divide-y divide-[var(--editorial-line)] border border-[var(--editorial-line)]">
        <div className="grid gap-1 p-4 sm:grid-cols-[96px_1fr]">
          <dt className="text-xs text-[var(--editorial-muted)]">문서 상태</dt>
          <dd>
            <p className="text-[15px] text-[var(--editorial-ink)]">
              {stageLabel(stage.stage)}
              {stage.evidence && (
                <span className="ml-2 text-xs text-[var(--editorial-muted)]">{stage.evidence}</span>
              )}
            </p>
            {stage.sourceUrl && <SourceLink href={stage.sourceUrl}>ACP 문서</SourceLink>}
          </dd>
        </div>
        <div className="grid gap-1 p-4 sm:grid-cols-[96px_1fr]">
          <dt className="text-xs text-[var(--editorial-muted)]">구현 기록</dt>
          <dd>
            {stage.includedIn ? (
              <>
                <p className="text-[15px] text-[var(--editorial-ink)]">
                  {stage.includedIn.name} 릴리스 노트가 이 제안을 포함했어요.
                </p>
                <SourceLink href={stage.includedIn.url}>릴리스 노트</SourceLink>
              </>
            ) : (
              <p className="text-[15px] text-[var(--editorial-muted)]">아직 이 제안을 포함한 릴리스를 찾지 못했어요.</p>
            )}
            {stage.needsCheck && (
              <p className="mt-2 text-xs leading-5 text-[var(--editorial-muted)]">
                문서 상태와 달라서 확인 중이에요. 적용이 끝났는지는 확인하지 못했어요.
              </p>
            )}
          </dd>
        </div>
        <div className="grid gap-1 p-4 sm:grid-cols-[96px_1fr]">
          <dt className="text-xs text-[var(--editorial-muted)]">날짜</dt>
          <dd>
            <p className="text-[15px] tabular-nums text-[var(--editorial-ink)]">
              문서 첫 기록 {day(stage.proposalCreatedAt)} · 마지막 수정 {day(stage.proposalUpdatedAt)}
            </p>
            <p className="mt-1 text-xs text-[var(--editorial-muted)]">ACP 저장소의 문서 커밋 기준이에요.</p>
          </dd>
        </div>
      </dl>
    </section>
  )
}

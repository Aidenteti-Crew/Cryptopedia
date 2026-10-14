import type { BuilderTestBanner as BuilderTestBannerContent } from '@/lib/avalanche-home'

/* 빌더 성향 테스트 배너 — 홈의 핵심 CTA.
   여백과 타이포그래피만으로 구성한 전체 너비의 단일 콘텐츠 영역이다 (카드·그래픽·2열 분할 없음).
   · 배경은 차콜 + 아주 약한 플럼 틴트, 테두리는 라벤더를 아주 약하게 섞은 얇은 선(대비를 낮춤). 라벤더 채움은 CTA 버튼뿐.
   · 하단 영역: 버튼 + 작은 메타("4 QUESTIONS · ABOUT 1 MINUTE").
   · onStart 가 없으면 버튼은 비활성(동작하지 않음)이고 안내는 툴팁(title)으로만 둔다. */
export function BuilderTestBanner({
  content,
  onStart,
}: {
  content: BuilderTestBannerContent
  onStart?: () => void
}) {
  const ready = Boolean(onStart)
  return (
    <section
      aria-labelledby="builder-test-title"
      className="rounded-[16px] border px-6 py-7 sm:px-10 sm:py-8"
      style={{
        borderColor: 'color-mix(in srgb, var(--editorial-accent) 22%, var(--editorial-line))',
        background: 'color-mix(in srgb, var(--editorial-surface) 92%, var(--editorial-mark))',
      }}
    >
      <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--editorial-muted)]">
        {content.label}
      </p>
      <h2
        id="builder-test-title"
        className="mt-3 text-[23px] font-medium leading-[1.3] tracking-[-0.4px] text-[var(--editorial-strong)] sm:text-[29px]"
      >
        {content.title}
      </h2>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-[1.7] text-[var(--editorial-ink)]">
        {content.description}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="button"
          disabled={!ready}
          title={ready ? undefined : content.disabledHint}
          onClick={onStart}
          className="inline-flex min-h-[41px] items-center rounded-[12px] bg-[var(--editorial-accent)] px-6 text-[13px] font-medium text-[var(--editorial-paper)] hover:bg-[var(--editorial-strong)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[var(--editorial-accent)]"
        >
          {content.cta}
        </button>
        <p className="text-[11px] font-medium tracking-[0.18em] text-[var(--editorial-muted)]">
          {content.meta}
        </p>
      </div>
    </section>
  )
}

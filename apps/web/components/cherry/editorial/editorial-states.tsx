interface EditorialEmptyProps {
  message: string
}

interface EditorialErrorProps {
  message: string
  onRetry: () => void
}

export function EditorialLoading() {
  return (
    <div
      className="space-y-4 px-6 py-10 sm:p-8 lg:p-[52px]"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm text-[var(--editorial-muted)]">
        자료를 불러오는 중…
      </p>
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-[95px] animate-pulse border-b border-[var(--editorial-line)] bg-white/[0.02]"
        />
      ))}
    </div>
  )
}

export function EditorialEmpty({ message }: EditorialEmptyProps) {
  return (
    <div className="px-6 py-16 text-sm text-[var(--editorial-muted)] sm:p-8 lg:p-[52px]">
      {message}
    </div>
  )
}

export function EditorialError({ message, onRetry }: EditorialErrorProps) {
  return (
    <div
      className="flex flex-col items-start gap-5 px-6 py-16 sm:p-8 lg:p-[52px]"
      role="alert"
    >
      <p className="text-sm text-[var(--editorial-muted)]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-10 border border-[var(--editorial-line)] px-4 py-2 text-sm text-[var(--editorial-ink)] hover:border-[var(--editorial-accent)] hover:text-[var(--editorial-accent)]"
      >
        다시 시도
      </button>
    </div>
  )
}

import { Heart } from 'lucide-react'

export function EventBookmarkButton({
  saved,
  onToggle,
  className = '',
}: {
  saved: boolean
  onToggle: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? '관심 행사에서 빼기' : '관심 행사에 추가'}
      onClick={onToggle}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center transition-colors ${
        saved
          ? 'text-[var(--editorial-accent)]'
          : 'text-[var(--editorial-muted)] hover:text-[var(--editorial-accent)]'
      } ${className}`}
    >
      <Heart size={19} aria-hidden fill={saved ? 'currentColor' : 'none'} />
    </button>
  )
}

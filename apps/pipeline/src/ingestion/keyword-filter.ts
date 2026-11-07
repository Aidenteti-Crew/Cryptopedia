import type { KeywordFilter } from '../config/source-config.js'

export type KeywordVerdict = { keep: true } | { keep: false; reason: 'NO_KEYWORD' | 'EXCLUDED' }

// Case, full-width forms and spacing differ between posts ("웹 3", "ＮＦＴ", "web3"), so both sides
// are NFKC-normalized, lowercased and stripped of whitespace before a plain substring match.
function fold(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/\s+/g, '')
}

// First relevance gate for boards that mix events with unrelated notices: free and recall-first.
// A post is kept when the title or body names any include keyword, unless the title names an
// exclude keyword (bids, hiring). Exclusions look at the title only: a blockchain event notice
// often mentions "채용" (a job fair) in its body.
export function applyKeywordFilter(
  filter: KeywordFilter,
  title: string,
  body: string
): KeywordVerdict {
  const foldedTitle = fold(title)
  if (filter.exclude.some((k) => foldedTitle.includes(fold(k)))) {
    return { keep: false, reason: 'EXCLUDED' }
  }
  const haystack = `${foldedTitle}${fold(body)}`
  if (filter.include.some((k) => haystack.includes(fold(k)))) return { keep: true }
  return { keep: false, reason: 'NO_KEYWORD' }
}

// Deciding whether two event rows describe the same real event. Calendars and posts word titles
// differently ("Univ Connect: Aidenteti Crew" vs "[Team1 Korea] Univ Connect: Aidenteti Crew 신청"),
// so titles are compared loosely, but only among events that start at nearly the same time.

export const SAME_EVENT_WINDOW_MS = 2 * 60 * 60 * 1000

export function normalizeTitle(title: string): string {
  return title
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function tokens(title: string): Set<string> {
  return new Set(
    normalizeTitle(title)
      .split(' ')
      .filter((t) => t.length > 1)
  )
}

export function titlesMatch(a: string, b: string): boolean {
  const na = normalizeTitle(a)
  const nb = normalizeTitle(b)
  if (!na || !nb) return false
  if (na === nb) return true
  const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na]
  // A short generic title ("meetup") inside a long one is not evidence of the same event.
  if (shorter.length >= 8 && longer.includes(shorter)) return true
  const ta = tokens(a)
  const tb = tokens(b)
  if (ta.size === 0 || tb.size === 0) return false
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  return shared / Math.min(ta.size, tb.size) >= 0.6 && shared >= 2
}

export function isCalendarEventKey(eventKey: string): boolean {
  return eventKey.startsWith('luma-')
}

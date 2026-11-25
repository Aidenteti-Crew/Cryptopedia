// A source with a minimum interval is read again only once that much time has passed since its
// last successful read. Never read, it is due now.
export function isDue(lastSuccessAt: Date | null, minIntervalHours: number, now: Date): boolean {
  if (!lastSuccessAt) return true
  return now.getTime() - lastSuccessAt.getTime() >= minIntervalHours * 3_600_000
}

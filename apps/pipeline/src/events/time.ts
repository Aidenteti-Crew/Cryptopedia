function offsetMinutes(instant: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(instant)
    .find((p) => p.type === 'timeZoneName')?.value
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(name ?? '')
  if (!m) return 0
  const minutes = Number(m[2]) * 60 + Number(m[3] ?? 0)
  return m[1] === '-' ? -minutes : minutes
}

// Converts a wall-clock time ("2026-11-28T00:00:00") in an IANA zone to the instant it denotes.
// Two passes settle the offset when the first guess lands on the other side of a DST change.
export function zonedTimeToInstant(wallClock: string, timeZone: string): Date {
  const asUtc = new Date(`${wallClock}Z`)
  const first = offsetMinutes(asUtc, timeZone)
  const candidate = new Date(asUtc.getTime() - first * 60_000)
  const second = offsetMinutes(candidate, timeZone)
  return second === first ? candidate : new Date(asUtc.getTime() - second * 60_000)
}

// Codes Intl still names but that are retired or not countries (VD = "Vietnam" before VN,
// FX = "France" before FR, ...); they must never win a name lookup.
const NOT_CURRENT = new Set([
  'AN',
  'BU',
  'CS',
  'DD',
  'DY',
  'FX',
  'HV',
  'NH',
  'NT',
  'RH',
  'SU',
  'TP',
  'VD',
  'YD',
  'YU',
  'ZR',
  'AC',
  'CP',
  'DG',
  'EA',
  'EU',
  'EZ',
  'IC',
  'TA',
  'UN',
  'QO',
  'ZZ',
])

let countryCodeByName: Map<string, string> | undefined

// "South Korea" -> "KR", built from Intl's own English region names so no table is maintained here.
export function countryCodeFromName(name: string | null | undefined): string | null {
  if (!name?.trim()) return null
  if (!countryCodeByName) {
    countryCodeByName = new Map()
    const names = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' })
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b)
        const label = names.of(code)
        if (label && label !== code && !NOT_CURRENT.has(code)) {
          countryCodeByName.set(label.toLowerCase(), code)
        }
      }
    }
    // Common spellings Intl does not use.
    for (const [alias, code] of [
      ['turkey', 'TR'],
      ['usa', 'US'],
      ['united states of america', 'US'],
      ['uk', 'GB'],
      ['korea', 'KR'],
      ['republic of korea', 'KR'],
      ['viet nam', 'VN'],
      ['uae', 'AE'],
      ['ivory coast', 'CI'],
      ['gambia', 'GM'],
    ] as const) {
      countryCodeByName.set(alias, code)
    }
  }
  const key = name
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, '')
  return countryCodeByName.get(key) ?? null
}

// Minimal iCalendar (RFC 5545) reader for public calendar feeds: VEVENT properties only, enough
// for Luma's export. Not a general parser (no RRULE expansion, no VTIMEZONE definitions).

export interface IcsProperty {
  value: string
  params: Record<string, string>
}

export type IcsEvent = Record<string, IcsProperty>

// Long lines are folded as CRLF followed by a space or tab; a fold can split a multi-byte
// character, so lines are joined before anything else looks at them.
function unfold(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n')
}

export function unescapeText(value: string): string {
  return value.replace(/\\([\\;,nN])/g, (_m, ch: string) => (ch === 'n' || ch === 'N' ? '\n' : ch))
}

function parseLine(line: string): [string, IcsProperty] | null {
  // The name and parameters end at the first ':' that is not inside a quoted parameter value.
  let inQuotes = false
  let colon = -1
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') inQuotes = !inQuotes
    else if (ch === ':' && !inQuotes) {
      colon = i
      break
    }
  }
  if (colon <= 0) return null
  const [name, ...paramParts] = line.slice(0, colon).split(';')
  const params: Record<string, string> = {}
  for (const part of paramParts) {
    const eq = part.indexOf('=')
    if (eq > 0) params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1).replace(/^"|"$/g, '')
  }
  return [name!.toUpperCase(), { value: line.slice(colon + 1), params }]
}

export function parseIcsEvents(text: string): IcsEvent[] {
  const events: IcsEvent[] = []
  let current: IcsEvent | null = null
  for (const line of unfold(text)) {
    if (line === 'BEGIN:VEVENT') current = {}
    else if (line === 'END:VEVENT') {
      if (current) events.push(current)
      current = null
    } else if (current) {
      const parsed = parseLine(line)
      if (parsed && !(parsed[0] in current)) current[parsed[0]] = parsed[1]
    }
  }
  return events
}

export interface IcsDate {
  // The instant, when the value had a time (UTC "Z" form).
  instant: Date | null
  // YYYY-MM-DD, when the value was a date with no time (all-day).
  date: string | null
  // A local time with a TZID parameter: wall clock plus the zone it is in.
  local: { wallClock: string; timeZone: string } | null
}

export function parseIcsDate(property: IcsProperty | undefined): IcsDate | null {
  if (!property) return null
  const v = property.value.trim()
  if (property.params.VALUE === 'DATE' || /^\d{8}$/.test(v)) {
    const m = /^(\d{4})(\d{2})(\d{2})$/.exec(v)
    return m ? { instant: null, date: `${m[1]}-${m[2]}-${m[3]}`, local: null } : null
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(v)
  if (!m) return null
  const wallClock = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`
  if (m[7] === 'Z') return { instant: new Date(`${wallClock}Z`), date: null, local: null }
  if (property.params.TZID) {
    return { instant: null, date: null, local: { wallClock, timeZone: property.params.TZID } }
  }
  return null // floating time: no zone, cannot be placed on the timeline
}

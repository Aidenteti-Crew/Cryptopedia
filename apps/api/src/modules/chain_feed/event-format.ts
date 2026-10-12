// Formats an instant as the event's local wall-clock time with a UTC offset, e.g.
// 2026-11-28T14:00:00+09:00, which is what the frontend event contract asks for.
export function toLocalIso(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'longOffset',
  }).formatToParts(date);
  const part = (type: string): string =>
    parts.find((p) => p.type === type)?.value ?? '';

  // longOffset yields "GMT+09:00", "GMT-05:00", or plain "GMT" for UTC.
  const offset = /GMT([+-]\d{2}):?(\d{2})?/.exec(part('timeZoneName'));
  const offsetText = offset ? `${offset[1]}:${offset[2] ?? '00'}` : '+00:00';

  return (
    `${part('year')}-${part('month')}-${part('day')}` +
    `T${part('hour')}:${part('minute')}:${part('second')}${offsetText}`
  );
}

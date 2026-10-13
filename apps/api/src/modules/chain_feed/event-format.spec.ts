import { toLocalIso } from './event-format';

describe('toLocalIso', () => {
  it.each([
    ['2026-11-28T05:00:00Z', 'Asia/Seoul', '2026-11-28T14:00:00+09:00'],
    ['2026-11-28T05:00:00Z', 'America/New_York', '2026-11-28T00:00:00-05:00'],
    ['2026-07-04T16:00:00Z', 'America/New_York', '2026-07-04T12:00:00-04:00'],
    ['2026-11-28T05:00:00Z', 'Asia/Kolkata', '2026-11-28T10:30:00+05:30'],
    ['2026-11-28T05:00:00Z', 'UTC', '2026-11-28T05:00:00+00:00'],
    ['2026-11-28T05:00:00Z', 'Europe/Paris', '2026-11-28T06:00:00+01:00'],
  ])('%s in %s', (instant, zone, expected) => {
    expect(toLocalIso(new Date(instant), zone)).toBe(expected);
  });

  it('writes local midnight as 00, not 24', () => {
    expect(toLocalIso(new Date('2026-11-27T15:00:00Z'), 'Asia/Seoul')).toBe(
      '2026-11-28T00:00:00+09:00',
    );
  });
});

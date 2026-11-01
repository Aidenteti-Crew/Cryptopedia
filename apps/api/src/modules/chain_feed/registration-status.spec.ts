import { registrationStatus } from './registration-status';

const NOW = new Date('2026-11-01T03:00:00Z');
const at = (iso: string): Date => new Date(iso);

describe('registrationStatus', () => {
  it.each([
    ['PAST', '2026-12-01T00:00:00Z'],
    ['CANCELLED', '2026-12-01T00:00:00Z'],
  ] as const)('%s events are closed whatever the deadline', (eventStatus, deadline) => {
    expect(
      registrationStatus({ eventStatus, deadline: at(deadline), override: null }, NOW),
    ).toEqual({ status: 'CLOSED', daysUntilDeadline: null });
  });

  it('an early close wins over a future deadline', () => {
    expect(
      registrationStatus(
        {
          eventStatus: 'UPCOMING',
          deadline: at('2026-12-01T00:00:00Z'),
          override: 'CLOSED_EARLY',
        },
        NOW,
      ).status,
    ).toBe('CLOSED');
  });

  it('closes the moment the deadline passes', () => {
    const deadline = at('2026-11-01T03:00:00Z');
    expect(
      registrationStatus({ eventStatus: 'UPCOMING', deadline, override: null }, NOW)
        .status,
    ).toBe('CLOSED');
  });

  it.each([
    ['2026-11-01T15:00:00Z', 1],
    ['2026-11-04T03:00:00Z', 3],
  ])('deadline %s is closing soon (D-%i)', (deadline, days) => {
    expect(
      registrationStatus(
        { eventStatus: 'UPCOMING', deadline: at(deadline), override: null },
        NOW,
      ),
    ).toEqual({ status: 'CLOSING_SOON', daysUntilDeadline: days });
  });

  it('is open with more than three days left', () => {
    expect(
      registrationStatus(
        {
          eventStatus: 'ONGOING',
          deadline: at('2026-11-04T03:00:01Z'),
          override: null,
        },
        NOW,
      ),
    ).toEqual({ status: 'OPEN', daysUntilDeadline: 4 });
  });

  it('is unknown without a deadline, never guessed from the start date', () => {
    expect(
      registrationStatus({ eventStatus: 'UPCOMING', deadline: null, override: null }, NOW),
    ).toEqual({ status: 'UNKNOWN', daysUntilDeadline: null });
  });

  it('is unknown for a postponed event', () => {
    expect(
      registrationStatus(
        {
          eventStatus: 'POSTPONED',
          deadline: at('2026-12-01T00:00:00Z'),
          override: null,
        },
        NOW,
      ).status,
    ).toBe('UNKNOWN');
  });
});

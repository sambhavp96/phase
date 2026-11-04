import { buildCalendar } from '../cycle';
import { addDays } from '../dates';
import { predict } from '../prediction';

const period = (start: string, days = 5) => ({ start_date: start, end_date: addDays(start, days - 1) });
const TODAY = '2026-11-03';

function calendarFor(periods: { start_date: string; end_date: string | null }[], today = TODAY) {
  return buildCalendar(periods, predict(periods, today), today);
}

// Regular 28-day cycles, last one starting 18 Oct; next expected 15 Nov, ovulation about 1 Nov.
const regular = ['2026-05-24', '2026-06-21', '2026-07-19', '2026-08-16', '2026-09-13', '2026-10-11'].map((s) =>
  period(addDays(s, 7)),
);

describe('buildCalendar', () => {
  const day = calendarFor(regular);

  it('marks logged period days as menstrual', () => {
    expect(day('2026-10-18')).toMatchObject({ mark: 'logged', phase: 'menstrual' });
    expect(day('2026-10-22')).toMatchObject({ mark: 'logged', phase: 'menstrual' });
  });

  it('places follicular, fertile, ovulation and luteal days in order', () => {
    expect(day('2026-10-23').phase).toBe('follicular');
    expect(day('2026-10-27').phase).toBe('fertile'); // 5 days before ovulation
    expect(day('2026-11-01')).toMatchObject({ phase: 'fertile', ovulation: true });
    expect(day('2026-11-02').phase).toBe('fertile'); // the day after
    expect(day('2026-11-03').phase).toBe('luteal');
    expect(day('2026-11-14').phase).toBe('luteal');
  });

  it('shows the next periods as expected, months ahead', () => {
    expect(day('2026-11-15')).toMatchObject({ mark: 'expected', phase: 'menstrual' });
    expect(day('2026-12-13').mark).toBe('expected');
    expect(day('2026-12-13').phase).toBe('menstrual');
  });

  it('has no phase before the first logged period or far in the future', () => {
    expect(day('2026-01-01')).toMatchObject({ mark: null, phase: null });
    expect(day('2028-01-01')).toMatchObject({ mark: null, phase: null });
  });

  it('splits an ongoing period into logged days and expected days', () => {
    const ongoing = [...regular.slice(0, 5), { start_date: '2026-11-01', end_date: null }];
    const d = calendarFor(ongoing);
    expect(d('2026-11-03').mark).toBe('logged');
    expect(d('2026-11-04').mark).toBe('expected');
    expect(d('2026-11-05').mark).toBe('expected');
    expect(d('2026-11-06').mark).toBeNull();
  });

  it('does not guess phases across a gap that looks like a missed log', () => {
    const d = calendarFor([period('2026-01-01'), period('2026-04-01')]);
    expect(d('2026-01-03').phase).toBe('menstrual');
    expect(d('2026-02-15').phase).toBeNull();
  });
});

import { addDays } from '../dates';
import { predict } from '../prediction';

const period = (start: string, days = 5) => ({ start_date: start, end_date: addDays(start, days - 1) });

describe('predict', () => {
  it('returns nothing to show when no periods are logged', () => {
    const p = predict([], '2026-11-03');
    expect(p.nextStart).toBeNull();
    expect(p.confidence).toBe('none');
  });

  it('assumes a 28-day cycle with a single period', () => {
    const p = predict([period('2026-10-20')], '2026-11-03');
    expect(p.nextStart).toBe('2026-11-17');
    expect(p.cyclesUsed).toBe(0);
    expect(p.confidence).toBe('low');
    expect(p.cycleDay).toBe(15);
  });

  it('averages the last six cycles and gives a window', () => {
    const starts = ['2026-05-01', '2026-05-29', '2026-06-27', '2026-07-24', '2026-08-22', '2026-09-19', '2026-10-18'];
    const p = predict(starts.map((s) => period(s)), '2026-11-03');
    expect(p.cyclesUsed).toBe(6);
    expect(p.avgCycleLength).toBe(28.3);
    expect(p.nextStart).toBe('2026-11-15');
    expect([p.windowStart, p.windowEnd]).toEqual(['2026-11-13', '2026-11-17']);
    expect(p.daysUntil).toBe(12);
    expect(p.avgPeriodLength).toBe(5);
    expect(p.confidence).toBe('high');
  });

  it('ignores a gap that looks like a missed log', () => {
    // 28, 29, then 56 days (a period was never logged), then 71 days.
    const starts = ['2026-05-01', '2026-05-29', '2026-06-27', '2026-08-22', '2026-11-01'];
    const p = predict(starts.map((s) => period(s)), '2026-11-03');
    expect(p.cyclesUsed).toBe(2);
    expect(p.avgCycleLength).toBe(28.5);
  });

  it('knows when a period is in progress', () => {
    const p = predict([period('2026-10-04'), { start_date: '2026-11-01', end_date: null }], '2026-11-03');
    expect(p.ongoing).toBe(true);
    expect(p.cycleDay).toBe(3);
  });

  it('reports a late period as negative days', () => {
    const p = predict([period('2026-09-01'), period('2026-09-29')], '2026-11-03');
    expect(p.nextStart).toBe('2026-10-27');
    expect(p.daysUntil).toBe(-7);
  });
});

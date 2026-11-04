import { addDays, daysBetween, formatDate, formatRange, makeISO, monthGrid } from '../dates';

describe('dates', () => {
  it('adds days across month and year ends', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29'); // leap year
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts days without daylight-saving drift', () => {
    expect(daysBetween('2026-11-01', '2026-11-02')).toBe(1); // US DST ends 1 Nov 2026
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2); // and starts 8 Mar 2026
    expect(daysBetween('2026-11-02', '2026-11-01')).toBe(-1);
  });

  it('formats dates and ranges the way the app shows them', () => {
    expect(formatDate('2026-11-15')).toBe('15 Nov');
    expect(formatDate('2026-11-15', true)).toBe('15 Nov 2026');
    expect(formatRange('2026-11-13', '2026-11-17')).toBe('13 to 17 Nov');
    expect(formatRange('2026-10-28', '2026-11-02')).toBe('28 Oct to 2 Nov');
    expect(formatRange('2026-11-13', '2026-11-13')).toBe('13 Nov');
  });

  it('pads the month grid so the 1st falls on the right weekday (Sunday first)', () => {
    const nov = monthGrid(2026, 10); // 1 Nov 2026 is a Sunday
    expect(nov[0]).toBe('2026-11-01');
    expect(nov).toHaveLength(30);

    const oct = monthGrid(2026, 9); // 1 Oct 2026 is a Thursday
    expect(oct.slice(0, 5)).toEqual([null, null, null, null, '2026-10-01']);
    expect(oct.filter(Boolean)).toHaveLength(31);

    expect(monthGrid(2028, 1).filter(Boolean)).toHaveLength(29);
    expect(makeISO(2026, 0, 5)).toBe('2026-01-05');
  });
});

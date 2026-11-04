import { addDays, daysBetween, type ISODate } from './dates';
import { MAX_CYCLE, type PeriodLike, type Prediction } from './prediction';

export type Phase = 'menstrual' | 'follicular' | 'fertile' | 'luteal';

export type DayInfo = {
  /** Logged period day, or an expected (predicted) period day. */
  mark: 'logged' | 'expected' | null;
  phase: Phase | null;
  ovulation: boolean;
  /** Estimated ovulation date of the cycle this day belongs to. */
  ovulationDate: ISODate | null;
};

/** How many predicted cycles to show ahead when browsing the calendar. */
const CYCLES_AHEAD = 6;

type Cycle = { start: ISODate; periodEnd: ISODate };
type Range = [ISODate, ISODate];

const within = (d: ISODate, [a, b]: Range) => d >= a && d <= b;

/**
 * Builds a lookup for any calendar day. Phases follow the calendar method:
 * ovulation ≈ 14 days before the next period; fertile window = 5 days before it plus the day after.
 */
export function buildCalendar(periods: PeriodLike[], p: Prediction, today: ISODate) {
  const sorted = [...periods].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const periodLen = Math.max(1, Math.round(p.avgPeriodLength ?? 5));
  const cycleLen = Math.round(p.avgCycleLength ?? 28);

  const logged: Range[] = [];
  const expected: Range[] = [];
  const cycles: Cycle[] = [];

  sorted.forEach((period, i) => {
    const isLatest = i === sorted.length - 1;
    let end = period.end_date;
    if (!end) {
      const typicalEnd = addDays(period.start_date, periodLen - 1);
      if (isLatest && p.ongoing) {
        // Logged up to today, the rest of a typical period is expected.
        end = today > typicalEnd ? today : typicalEnd;
        logged.push([period.start_date, today]);
        if (today < end) expected.push([addDays(today, 1), end]);
      } else {
        end = typicalEnd;
        logged.push([period.start_date, end]);
      }
    } else {
      logged.push([period.start_date, end]);
    }
    cycles.push({ start: period.start_date, periodEnd: end });
  });

  if (p.nextStart) {
    for (let k = 0; k < CYCLES_AHEAD; k++) {
      const start = addDays(p.nextStart, k * cycleLen);
      const periodEnd = addDays(start, periodLen - 1);
      expected.push([start, periodEnd]);
      cycles.push({ start, periodEnd });
    }
  }

  return function dayInfo(day: ISODate): DayInfo {
    const mark = logged.some((r) => within(day, r)) ? 'logged' : expected.some((r) => within(day, r)) ? 'expected' : null;
    const info: DayInfo = { mark, phase: null, ovulation: false, ovulationDate: null };

    // Find the cycle this day falls in: started on or before it, next one starts after it.
    let i = -1;
    for (let j = 0; j < cycles.length && cycles[j].start <= day; j++) i = j;
    if (i < 0) return info;
    const cycle = cycles[i];
    if (day <= cycle.periodEnd) return { ...info, phase: 'menstrual' };
    const next = cycles[i + 1];
    // No following period to count back from, or a gap that looks like a missed log.
    if (!next || daysBetween(cycle.start, next.start) > MAX_CYCLE) return info;

    const ovulationDate = addDays(next.start, -14);
    const fertileStart = addDays(ovulationDate, -5);
    const fertileEnd = addDays(ovulationDate, 1);
    let phase: Phase = 'luteal';
    if (day < fertileStart) phase = 'follicular';
    else if (day <= fertileEnd) phase = 'fertile';
    return { ...info, phase, ovulation: day === ovulationDate, ovulationDate };
  };
}

export const PHASES: Record<Phase, { name: string; description: string }> = {
  menstrual: { name: 'Menstrual', description: 'The logged period days.' },
  follicular: { name: 'Follicular', description: 'From the end of the period until the fertile window.' },
  fertile: {
    name: 'Fertile window',
    description: 'About six days ending the day after ovulation, estimated 14 days before the next period.',
  },
  luteal: { name: 'Luteal', description: 'After ovulation, until the next period starts.' },
};

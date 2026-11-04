import { addDays, daysBetween, type ISODate, todayISO } from './dates';

export type PeriodLike = { start_date: ISODate; end_date: ISODate | null };

export type Confidence = 'none' | 'low' | 'medium' | 'high';

export type Prediction = {
  /** Start of the most recent logged period. */
  lastStart: ISODate | null;
  /** Day of the current cycle (day 1 = first day of the last period). */
  cycleDay: number | null;
  /** True when the latest period has no end date yet and started recently. */
  ongoing: boolean;
  /** Average cycle length used for the prediction (default 28 until there is history). */
  avgCycleLength: number | null;
  /** How many real cycles the average is based on (0 = using the default). */
  cyclesUsed: number;
  avgPeriodLength: number | null;
  nextStart: ISODate | null;
  windowStart: ISODate | null;
  windowEnd: ISODate | null;
  /** Days from today to the predicted start; negative when late. */
  daysUntil: number | null;
  confidence: Confidence;
};

/** Gaps outside this range are almost certainly a missed or mistyped log, so they are ignored. */
export const MIN_CYCLE = 15;
export const MAX_CYCLE = 60;
/** Only the most recent cycles count, so the prediction follows changes over time. */
export const HISTORY = 6;
export const DEFAULT_CYCLE = 28;

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function stdev(xs: number[]): number {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

export function predict(periods: PeriodLike[], today: ISODate = todayISO()): Prediction {
  const sorted = [...periods].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const empty: Prediction = {
    lastStart: null,
    cycleDay: null,
    ongoing: false,
    avgCycleLength: null,
    cyclesUsed: 0,
    avgPeriodLength: null,
    nextStart: null,
    windowStart: null,
    windowEnd: null,
    daysUntil: null,
    confidence: 'none',
  };
  if (sorted.length === 0) return empty;

  const last = sorted[sorted.length - 1];
  const sinceLast = daysBetween(last.start_date, today);

  const cycles: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const len = daysBetween(sorted[i - 1].start_date, sorted[i].start_date);
    if (len >= MIN_CYCLE && len <= MAX_CYCLE) cycles.push(len);
  }
  // A gap far above her usual length usually means a period wasn't logged; drop those.
  const typical = median(cycles);
  const recent = cycles.filter((c) => cycles.length < 3 || (c >= typical * 0.6 && c <= typical * 1.5)).slice(-HISTORY);

  const avgCycle = recent.length > 0 ? mean(recent) : DEFAULT_CYCLE;
  // Window: ± the typical variation, at least ±2 days and at most ±7.
  const spread = recent.length >= 2 ? stdev(recent) : 3;
  const margin = Math.min(7, Math.max(2, Math.round(spread)));

  let confidence: Confidence = 'low';
  if (recent.length >= HISTORY && spread <= 3) confidence = 'high';
  else if (recent.length >= 3) confidence = 'medium';

  const durations = sorted
    .filter((p): p is PeriodLike & { end_date: ISODate } => p.end_date !== null)
    .map((p) => daysBetween(p.start_date, p.end_date) + 1)
    .filter((d) => d >= 1 && d <= 14)
    .slice(-HISTORY);

  const nextStart = addDays(last.start_date, Math.round(avgCycle));

  return {
    lastStart: last.start_date,
    cycleDay: sinceLast >= 0 ? sinceLast + 1 : null,
    ongoing: last.end_date === null && sinceLast >= 0 && sinceLast < 14,
    avgCycleLength: Math.round(avgCycle * 10) / 10,
    cyclesUsed: recent.length,
    avgPeriodLength: durations.length > 0 ? Math.round(mean(durations) * 10) / 10 : null,
    nextStart,
    windowStart: addDays(nextStart, -margin),
    windowEnd: addDays(nextStart, margin),
    daysUntil: daysBetween(today, nextStart),
    confidence,
  };
}

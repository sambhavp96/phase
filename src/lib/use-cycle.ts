import { useMemo } from 'react';

import { buildCalendar } from './cycle';
import { todayISO } from './dates';
import { useData } from './periods';
import { predict } from './prediction';

/** Prediction plus a day-by-day lookup, shared by home and the calendar. */
export function useCycle() {
  const { periods } = useData();
  const today = todayISO();
  return useMemo(() => {
    const prediction = predict(periods, today);
    const dayInfo = buildCalendar(periods, prediction, today);
    return { today, prediction, dayInfo, periods };
  }, [periods, today]);
}

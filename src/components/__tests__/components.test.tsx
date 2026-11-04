import { fireEvent, render, screen } from '@testing-library/react-native';

import { MonthGrid } from '../month-grid';
import { T } from '../ui';
import { buildCalendar } from '@/lib/cycle';
import { addDays, monthGrid } from '@/lib/dates';
import { predict } from '@/lib/prediction';

const TODAY = '2026-11-03';
const periods = ['2026-09-20', '2026-10-18'].map((s) => ({ start_date: s, end_date: addDays(s, 4) }));
const dayInfo = buildCalendar(periods, predict(periods, TODAY), TODAY);

describe('T', () => {
  it('uppercases label text itself, so Android does not clip the last letter', async () => {
    await render(<T v="label">Jan</T>);
    expect(screen.getByText('JAN')).toBeTruthy();
  });

  it('leaves other text alone', async () => {
    await render(<T>Jan</T>);
    expect(screen.getByText('Jan')).toBeTruthy();
  });
});

describe('MonthGrid', () => {
  it('describes each day for screen readers', async () => {
    await render(<MonthGrid days={monthGrid(2026, 9)} dayInfo={dayInfo} today={TODAY} variant="full" />);
    expect(screen.getByLabelText('18 Oct 2026, period logged')).toBeTruthy();
    expect(screen.getByLabelText('23 Oct 2026, follicular phase')).toBeTruthy();
  });

  it('opens past days but not future ones', async () => {
    const onPressDay = jest.fn();
    await render(
      <MonthGrid days={monthGrid(2026, 10)} dayInfo={dayInfo} today={TODAY} variant="full" onPressDay={onPressDay} />,
    );
    await fireEvent.press(screen.getByLabelText(/^2 Nov 2026/));
    expect(onPressDay).toHaveBeenCalledWith('2026-11-02', expect.objectContaining({ phase: expect.any(String) }));

    onPressDay.mockClear();
    await fireEvent.press(screen.getByLabelText(/^20 Nov 2026/));
    expect(onPressDay).not.toHaveBeenCalled();
  });

  it('marks today', async () => {
    await render(<MonthGrid days={monthGrid(2026, 10)} dayInfo={dayInfo} today={TODAY} variant="compact" />);
    expect(screen.getByLabelText(/^3 Nov 2026, today/)).toBeTruthy();
  });
});

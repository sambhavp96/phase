import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, Menu } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MonthGrid } from '@/components/month-grid';
import { PhaseIcon } from '@/components/phase-icon';
import { Button, Row, T } from '@/components/ui';
import { colors, GUTTER } from '@/constants/theme';
import { formatDate, formatRange, MONTHS, monthGrid } from '@/lib/dates';
import { useData } from '@/lib/periods';
import { useCycle } from '@/lib/use-cycle';

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const { error, refresh, addPeriod, updatePeriod } = useData();
  const { today, prediction: p, dayInfo, periods } = useCycle();
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const latest = periods[0]; // newest first
  const previous = p.ongoing ? periods[1] : periods[0];
  const todayInfo = dayInfo(today);
  const periodLen = Math.round(p.avgPeriodLength ?? 5);

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Couldn’t save', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // Top block copy.
  let label = 'No periods logged yet';
  let headline = 'Begin';
  let sub = 'Log the most recent period to see a prediction. It gets sharper with every cycle.';
  if (p.ongoing && p.cycleDay) {
    label = 'Period in progress';
    headline = `Day ${p.cycleDay}`;
    sub = `Usually lasts about ${plural(periodLen, 'day')}.`;
  } else if (p.nextStart && p.daysUntil !== null) {
    label = 'Next period, expected';
    headline = formatDate(p.nextStart);
    const when =
      p.daysUntil > 1
        ? `In ${p.daysUntil} days.`
        : p.daysUntil === 1
          ? 'Tomorrow.'
          : p.daysUntil === 0
            ? 'Today.'
            : `${plural(-p.daysUntil, 'day')} later than expected.`;
    sub = `Likely between ${formatRange(p.windowStart!, p.windowEnd!)}. ${when}`;
    if (p.cyclesUsed === 0) sub += ' Using a typical 28-day cycle until a second period is logged.';
  }

  let phaseName: string | null = null;
  let phaseNote = '';
  switch (todayInfo.phase) {
    case 'menstrual':
      phaseName = 'Menstrual phase';
      phaseNote = p.cycleDay ? `Day ${p.cycleDay} of about ${periodLen}` : '';
      break;
    case 'follicular':
      phaseName = 'Likely follicular phase';
      phaseNote = 'After the period, before the fertile window';
      break;
    case 'fertile':
      phaseName = 'Likely fertile window';
      phaseNote = todayInfo.ovulation
        ? 'Ovulation estimated around today'
        : `Ovulation estimated around ${formatDate(todayInfo.ovulationDate!)}`;
      break;
    case 'luteal':
      phaseName = 'Likely luteal phase';
      phaseNote = 'After ovulation, until the next period';
      break;
  }

  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7)) - 1;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.mint}
          onRefresh={async () => {
            setRefreshing(true);
            await refresh();
            setRefreshing(false);
          }}
        />
      }>
      <StatusBar style="light" />
      <View style={[styles.hero, { paddingTop: insets.top + 6 }]}>
        <View style={styles.header}>
          <T v="label" color={colors.mint} style={styles.wordmark}>
            Phase
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Menu"
            onPress={() => router.push('/menu')}
            style={styles.iconButton}>
            <Menu size={22} color={colors.mint} strokeWidth={1.5} />
          </Pressable>
        </View>

        <T v="label" color={colors.mint} style={styles.heroLabel}>
          {label}
        </T>
        <T v="display" color={colors.mint} adjustsFontSizeToFit numberOfLines={1}>
          {headline}
        </T>
        <T color={colors.mint} style={styles.heroSub}>
          {sub}
        </T>

        {phaseName && todayInfo.phase && (
          <View style={styles.phase}>
            <View style={styles.phaseIcon}>
              <PhaseIcon phase={todayInfo.phase} color={colors.mint} />
            </View>
            <View style={styles.flex}>
              <T v="strong" color={colors.mint} style={{ fontSize: 14 }}>
                {phaseName}
              </T>
              {phaseNote ? (
                <T v="small" color={colors.mint}>
                  {phaseNote}
                </T>
              ) : null}
            </View>
          </View>
        )}
        {error && (
          <T v="small" color={colors.mint} style={{ marginTop: 10 }}>
            {error}
          </T>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${MONTHS[month]} ${year}. Open calendar`}
        onPress={() => router.push('/calendar')}
        style={({ pressed }) => [styles.calendar, pressed && { opacity: 0.7 }]}>
        <View style={styles.calendarHead}>
          <T v="label" style={{ fontFamily: 'Jost_600SemiBold' }}>
            {MONTHS[month]} {year}
          </T>
          <ArrowRight size={18} color={colors.oxblood} strokeWidth={1.6} />
        </View>
        <MonthGrid days={monthGrid(year, month)} dayInfo={dayInfo} today={today} variant="compact" />
      </Pressable>

      <View style={styles.body}>
        <Row label="Average cycle" value={p.cyclesUsed > 0 ? `${p.avgCycleLength} days` : 'Not yet'} />
        <Row label="Average period" value={p.avgPeriodLength !== null ? `${p.avgPeriodLength} days` : 'Not yet'} />
        <Row
          label="Previous period"
          value={previous ? (previous.end_date ? formatRange(previous.start_date, previous.end_date) : formatDate(previous.start_date)) : 'None'}
          onPress={() => router.push('/history')}
          last
        />
      </View>

      <View style={[styles.action, { paddingBottom: insets.bottom + 20 }]}>
        {p.ongoing ? (
          <Button
            title="Period ended today"
            busy={busy}
            onPress={() => act(() => updatePeriod(latest.id, { end_date: today }))}
          />
        ) : (
          <Button
            title="Period started today"
            busy={busy}
            disabled={latest?.start_date === today}
            onPress={() => act(() => addPeriod({ start_date: today, end_date: null, notes: null }))}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, backgroundColor: colors.rose },
  hero: { backgroundColor: colors.oxblood, paddingHorizontal: GUTTER, paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: { fontSize: 13, letterSpacing: 3.9 },
  iconButton: { width: 44, height: 44, marginRight: -10, alignItems: 'center', justifyContent: 'center' },
  heroLabel: { marginTop: 18 },
  heroSub: { marginTop: 4 },
  phase: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderColor: colors.mint,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  phaseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendar: { paddingHorizontal: GUTTER, paddingTop: 12 },
  calendarHead: { height: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  body: { paddingHorizontal: GUTTER, marginTop: 8 },
  action: { marginTop: 'auto', paddingHorizontal: GUTTER, paddingTop: 20 },
});

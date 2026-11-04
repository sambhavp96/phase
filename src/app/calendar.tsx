import { router } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MonthGrid } from '@/components/month-grid';
import { PhaseIcon } from '@/components/phase-icon';
import { Screen, T } from '@/components/ui';
import { colors, fonts, GUTTER } from '@/constants/theme';
import { type DayInfo, PHASES, type Phase } from '@/lib/cycle';
import { MONTHS, monthGrid } from '@/lib/dates';
import { useCycle } from '@/lib/use-cycle';

const PHASE_ORDER: Phase[] = ['menstrual', 'follicular', 'fertile', 'luteal'];

export default function Calendar() {
  const { today, dayInfo, periods } = useCycle();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)) - 1);
  const [picking, setPicking] = useState(false);

  const isCurrent = year === Number(today.slice(0, 4)) && month === Number(today.slice(5, 7)) - 1;

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  function openDay(day: string, info: DayInfo) {
    // A day inside a logged period edits that period; any other past day starts a new one there.
    // `periods` is newest first, so the first one starting on or before the day is the one it belongs to.
    const period = info.mark === 'logged' ? periods.find((p) => p.start_date <= day) : undefined;
    if (period) router.push({ pathname: '/log', params: { id: period.id } });
    else router.push({ pathname: '/log', params: { date: day } });
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={picking ? 'Close month picker' : 'Choose month and year'}
            onPress={() => setPicking(!picking)}
            style={styles.flex}>
            <T v="label">{year}</T>
            <T v="title" numberOfLines={1} adjustsFontSizeToFit>
              {MONTHS[month]}
            </T>
          </Pressable>
          <View style={styles.arrows}>
            <IconButton label={picking ? 'Previous year' : 'Previous month'} onPress={() => (picking ? setYear(year - 1) : shift(-1))}>
              <ChevronLeft size={22} color={colors.oxblood} strokeWidth={1.5} />
            </IconButton>
            <IconButton label={picking ? 'Next year' : 'Next month'} onPress={() => (picking ? setYear(year + 1) : shift(1))}>
              <ChevronRight size={22} color={colors.oxblood} strokeWidth={1.5} />
            </IconButton>
          </View>
        </View>

        {!isCurrent && !picking && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setYear(Number(today.slice(0, 4)));
              setMonth(Number(today.slice(5, 7)) - 1);
            }}
            style={styles.todayLink}>
            <T v="label" style={{ fontFamily: fonts.semibold }}>
              Back to today
            </T>
          </Pressable>
        )}

        {picking ? (
          <View style={styles.months}>
            {MONTHS.map((name, i) => {
              const active = i === month;
              return (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setMonth(i);
                    setPicking(false);
                  }}
                  style={[styles.monthCell, active && { backgroundColor: colors.oxblood }]}>
                  <T v="label" color={active ? colors.mint : colors.oxblood}>
                    {name.slice(0, 3)}
                  </T>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.grid}>
            <MonthGrid
              days={monthGrid(year, month)}
              dayInfo={dayInfo}
              today={today}
              variant="full"
              onPressDay={openDay}
            />
            <T v="small" style={styles.hint}>
              Tap a day to log a period or change one.
            </T>
          </View>
        )}

        <View style={styles.legend}>
          <T v="label" style={styles.legendTitle}>
            Key
          </T>
          {PHASE_ORDER.map((phase) => (
            <View key={phase} style={styles.legendRow}>
              <View
                style={[
                  styles.legendIcon,
                  phase === 'menstrual' && { backgroundColor: colors.oxblood, borderColor: colors.oxblood },
                  phase === 'fertile' && { backgroundColor: colors.mint, borderColor: colors.mint },
                ]}>
                <PhaseIcon
                  phase={phase}
                  color={phase === 'menstrual' ? colors.mint : phase === 'fertile' ? colors.forest : colors.oxblood}
                />
              </View>
              <View style={styles.flex}>
                <T v="strong">{PHASES[phase].name}</T>
                <T v="small">{PHASES[phase].description}</T>
              </View>
            </View>
          ))}
          <View style={styles.marks}>
            <Mark label="Logged period" style={{ backgroundColor: colors.oxblood }} />
            <Mark label="Expected period" style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.oxblood }} />
            <Mark label="Likely ovulation" style={{ backgroundColor: colors.mint, borderWidth: 2, borderColor: colors.forest }} />
          </View>
          <T v="small" style={styles.disclaimer}>
            Phases are estimates based on the periods logged so far. They are not medical advice and should not be
            used as contraception.
          </T>
        </View>
      </ScrollView>
    </Screen>
  );
}

function IconButton({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}>
      {children}
    </Pressable>
  );
}

function Mark({ label, style }: { label: string; style: object }) {
  return (
    <View style={styles.mark}>
      <View style={[styles.markSwatch, style]} />
      <T v="small">{label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingBottom: 40 },
  head: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  arrows: { flexDirection: 'row', marginRight: -10 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  todayLink: { alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' },
  grid: { marginTop: 14 },
  hint: { marginTop: 8 },
  months: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, borderTopWidth: 1, borderLeftWidth: 1, borderColor: colors.oxblood },
  monthCell: {
    width: '33.333%',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.oxblood,
  },
  legend: { marginTop: 24, borderTopWidth: 1, borderColor: colors.oxblood, paddingTop: 14 },
  legendTitle: { marginBottom: 6 },
  legendRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 8 },
  legendIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.oxblood,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marks: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 },
  mark: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  markSwatch: { width: 16, height: 16, borderRadius: 8 },
  disclaimer: { marginTop: 16 },
});

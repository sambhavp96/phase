import { Pressable, StyleSheet, View } from 'react-native';

import { PhaseIcon } from '@/components/phase-icon';
import { T } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import type { DayInfo } from '@/lib/cycle';
import { formatDate, type ISODate } from '@/lib/dates';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type Props = {
  days: (ISODate | null)[];
  dayInfo: (day: ISODate) => DayInfo;
  today: ISODate;
  /** "compact" (home): periods only. "full" (calendar page): phases with icons, tappable days. */
  variant: 'compact' | 'full';
  onPressDay?: (day: ISODate, info: DayInfo) => void;
};

export function MonthGrid({ days, dayInfo, today, variant, onPressDay }: Props) {
  const full = variant === 'full';
  return (
    <View>
      <View style={styles.week}>
        {WEEKDAYS.map((d, i) => (
          <T key={i} v="label" style={styles.weekday}>
            {d}
          </T>
        ))}
      </View>
      <View style={styles.grid}>
        {days.map((day, i) => {
          if (!day) return <View key={`pad-${i}`} style={[styles.cell, full ? styles.cellFull : styles.cellCompact]} />;
          const info = dayInfo(day);
          const isToday = day === today;
          const future = day > today;

          let bg = 'transparent';
          let fg: string = colors.oxblood;
          let border: { borderWidth?: number; borderStyle?: 'dashed' | 'solid'; borderColor?: string } = {};
          if (info.mark === 'logged') {
            bg = colors.oxblood;
            fg = colors.mint;
          } else if (info.mark === 'expected') {
            border = { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.oxblood };
          } else if (full && info.phase === 'fertile') {
            bg = colors.mint;
            fg = colors.forest;
            if (info.ovulation) border = { borderWidth: 2, borderColor: colors.forest };
          }

          const label = [
            formatDate(day, true),
            isToday && 'today',
            info.mark === 'logged' && 'period logged',
            info.mark === 'expected' && 'period expected',
            full && info.phase && !info.mark && `${info.phase} phase`,
            info.ovulation && 'likely ovulation',
          ]
            .filter(Boolean)
            .join(', ');

          const inner = (
            <View style={[full ? styles.dayFull : styles.dayCompact, { backgroundColor: bg }, border]}>
              <T
                v="body"
                color={fg}
                style={[styles.num, isToday && { fontFamily: fonts.semibold }]}>
                {Number(day.slice(8))}
              </T>
              {full && info.phase ? (
                <PhaseIcon phase={info.phase} size={10} color={fg} />
              ) : (
                <View style={[styles.todayBar, { backgroundColor: isToday ? fg : 'transparent' }]} />
              )}
              {full && isToday && <View style={[styles.todayBar, { backgroundColor: fg }]} />}
            </View>
          );

          return onPressDay && !future ? (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => onPressDay(day, info)}
              style={({ pressed }) => [styles.cell, full ? styles.cellFull : styles.cellCompact, pressed && { opacity: 0.6 }]}>
              {inner}
            </Pressable>
          ) : (
            <View key={day} accessible accessibilityLabel={label} style={[styles.cell, full ? styles.cellFull : styles.cellCompact]}>
              {inner}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center' },
  cellCompact: { height: 34 },
  cellFull: { height: 58 },
  dayCompact: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayFull: { width: 44, height: 52, borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: 2 },
  num: { fontSize: 14, lineHeight: 18 },
  todayBar: { width: 12, height: 2, marginTop: 1 },
});

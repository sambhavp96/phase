import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Screen, T } from '@/components/ui';
import { colors, GUTTER } from '@/constants/theme';
import { daysBetween, formatDate, formatRange } from '@/lib/dates';
import { useData } from '@/lib/periods';

export default function History() {
  const { periods, couple } = useData(); // newest first
  const names = new Map(couple?.members.map((m) => [m.user_id, m.display_name]));

  return (
    <Screen>
      <FlatList
        data={periods}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.head}>
            <T v="label">{periods.length} logged</T>
            <T v="title">Previous periods</T>
          </View>
        }
        ListEmptyComponent={<T style={styles.empty}>Nothing logged yet.</T>}
        renderItem={({ item, index }) => {
          const previous = periods[index + 1];
          const cycle = previous ? daysBetween(previous.start_date, item.start_date) : null;
          const length = item.end_date ? daysBetween(item.start_date, item.end_date) + 1 : null;
          const by = item.created_by ? names.get(item.created_by) : undefined;
          const meta = [
            length ? `${length} days` : 'No end date',
            cycle !== null && `${cycle}-day cycle`,
            by && `Logged by ${by}`,
          ]
            .filter(Boolean)
            .join('  ·  ');
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/log', params: { id: item.id } })}
              style={({ pressed }) => [styles.row, index === periods.length - 1 && styles.last, pressed && { opacity: 0.6 }]}>
              <View style={styles.flex}>
                <T v="value">
                  {item.end_date ? formatRange(item.start_date, item.end_date) : formatDate(item.start_date)}{' '}
                  {item.start_date.slice(0, 4)}
                </T>
                <T v="small" style={styles.meta}>
                  {meta}
                </T>
                {item.notes ? (
                  <T v="small" style={styles.meta}>
                    {item.notes}
                  </T>
                ) : null}
              </View>
              <ChevronRight size={18} color={colors.oxblood} strokeWidth={1.6} />
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingHorizontal: GUTTER, paddingBottom: 40 },
  head: { marginBottom: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: colors.oxblood,
  },
  last: { borderBottomWidth: 1 },
  meta: { marginTop: 2 },
  empty: { marginTop: 24 },
});

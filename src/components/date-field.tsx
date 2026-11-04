import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { T } from '@/components/ui';
import { colors } from '@/constants/theme';
import { formatDate, fromISODate, type ISODate, toISODate, todayISO } from '@/lib/dates';

type Props = {
  label: string;
  value: ISODate;
  onChange: (value: ISODate) => void;
  minimumDate?: ISODate;
};

/** A labelled date row: compact native picker on iOS, a tap-to-open calendar dialog on Android. */
export function DateField({ label, value, onChange, minimumDate }: Props) {
  const max = fromISODate(todayISO());
  const min = minimumDate ? fromISODate(minimumDate) : undefined;

  return (
    <View style={styles.row}>
      <T v="label">{label}</T>
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          mode="date"
          display="compact"
          value={fromISODate(value)}
          maximumDate={max}
          minimumDate={min}
          accentColor={colors.oxblood}
          themeVariant="light"
          onValueChange={(_e, date) => onChange(toISODate(date))}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${formatDate(value, true)}. Change`}
          onPress={() =>
            DateTimePickerAndroid.open({
              mode: 'date',
              value: fromISODate(value),
              maximumDate: max,
              minimumDate: min,
              onValueChange: (_e, date) => onChange(toISODate(date)),
            })
          }
          style={styles.value}>
          <T v="value">{formatDate(value, true)}</T>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: colors.oxblood,
  },
  value: { minHeight: 44, justifyContent: 'center', paddingLeft: 12 },
});

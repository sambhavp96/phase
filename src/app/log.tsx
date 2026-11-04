import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { Button, Screen, T } from '@/components/ui';
import { colors, fonts, GUTTER } from '@/constants/theme';
import { addDays, type ISODate, todayISO } from '@/lib/dates';
import { useData } from '@/lib/periods';

export default function LogPeriod() {
  const { id, date } = useLocalSearchParams<{ id?: string; date?: string }>();
  const { periods, addPeriod, updatePeriod, deletePeriod } = useData();
  const existing = id ? periods.find((p) => p.id === id) : undefined;

  const today = todayISO();
  const initialStart = existing?.start_date ?? (date && date <= today ? date : today);
  const [start, setStart] = useState<ISODate>(initialStart);
  const [hasEnded, setHasEnded] = useState(existing ? existing.end_date !== null : initialStart < today);
  const [end, setEnd] = useState<ISODate>(() => {
    if (existing?.end_date) return existing.end_date;
    const guess = addDays(initialStart, 4); // a typical 5-day period, never in the future
    return guess > today ? today : guess;
  });
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [busy, setBusy] = useState(false);

  function changeStart(value: ISODate) {
    setStart(value);
    if (end < value) setEnd(value);
  }

  async function save() {
    setBusy(true);
    const input = { start_date: start, end_date: hasEnded ? end : null, notes: notes.trim() || null };
    try {
      if (existing) await updatePeriod(existing.id, input);
      else await addPeriod(input);
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t save', e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  function confirmDelete() {
    if (!existing) return;
    Alert.alert('Delete this period?', 'It will be removed for both of you.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePeriod(existing.id);
            router.back();
          } catch (e) {
            Alert.alert('Couldn’t delete', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? 'Edit period' : 'Log period' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <DateField label="Started" value={start} onChange={changeStart} />

        <View style={styles.row}>
          <T v="label">Has ended</T>
          <Switch
            value={hasEnded}
            onValueChange={setHasEnded}
            trackColor={{ true: colors.oxblood, false: colors.mint }}
            thumbColor={hasEnded ? colors.mint : colors.oxblood}
            ios_backgroundColor={colors.mint}
          />
        </View>

        {hasEnded && <DateField label="Ended" value={end} onChange={setEnd} minimumDate={start} />}

        <TextInput
          style={styles.notes}
          placeholder="Notes (optional)"
          placeholderTextColor={colors.oxblood}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <View style={styles.actions}>
          <Button title={existing ? 'Save changes' : 'Save'} onPress={save} busy={busy} />
          {existing && <Button title="Delete" variant="outline" icon={null} onPress={confirmDelete} />}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: GUTTER },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: colors.oxblood,
  },
  notes: {
    minHeight: 96,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.oxblood,
    paddingVertical: 14,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.oxblood,
    textAlignVertical: 'top',
  },
  actions: { marginTop: 24, gap: 10 },
});

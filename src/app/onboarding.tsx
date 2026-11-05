import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button, Screen, T } from '@/components/ui';
import { colors, fonts, GUTTER } from '@/constants/theme';
import { confirmDeleteAccount } from '@/lib/account';
import { useData } from '@/lib/periods';
import { supabase } from '@/lib/supabase';

export default function Onboarding() {
  const { createCouple, joinCouple, error } = useData();
  const [whose, setWhose] = useState<'mine' | 'partner'>('mine');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);

  async function act(kind: 'create' | 'join', fn: () => Promise<void>) {
    setBusy(kind);
    try {
      await fn(); // on success the navigator moves to the home screen
    } catch (e) {
      Alert.alert('Something went wrong', e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <T v="label">Get started</T>
          <T v="title" style={styles.title}>
            Set up tracking
          </T>
          {error && <T style={styles.gap}>{error}</T>}

          <View style={styles.section}>
            <T v="label">Whose cycle will this track?</T>
            <View style={styles.segment}>
              {(['mine', 'partner'] as const).map((option) => {
                const active = whose === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => setWhose(option)}
                    style={[styles.segmentItem, active && { backgroundColor: colors.oxblood }]}>
                    <T v="label" color={active ? colors.mint : colors.oxblood}>
                      {option === 'mine' ? 'Mine' : 'My partner’s'}
                    </T>
                  </Pressable>
                );
              })}
            </View>
            <Button
              title="Create and invite"
              onPress={() => act('create', () => createCouple(whose === 'mine'))}
              busy={busy === 'create'}
              disabled={busy !== null}
            />
          </View>

          <View style={styles.section}>
            <T v="label">Or join your partner</T>
            <TextInput
              style={styles.code}
              placeholder="ABCD-EFGH"
              placeholderTextColor={colors.oxblood}
              accessibilityLabel="Invite code"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={9}
              value={code}
              onChangeText={setCode}
            />
            <Button
              title="Join"
              variant="outline"
              onPress={() => act('join', () => joinCouple(code))}
              busy={busy === 'join'}
              disabled={busy !== null || code.replace(/[^A-Za-z0-9]/g, '').length !== 8}
            />
          </View>

          <T v="small" style={styles.privacy}>
            Only you and the one partner you connect with can see this data. The person whose cycle is tracked can
            disconnect the partner or delete everything at any time.
          </T>
          <View style={styles.footer}>
            <Pressable accessibilityRole="button" onPress={() => supabase.auth.signOut()} style={styles.signOut}>
              <T v="label" style={{ fontFamily: fonts.semibold }}>
                Sign out
              </T>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => confirmDeleteAccount(null)} style={styles.signOut}>
              <T v="label" style={{ fontFamily: fonts.semibold }}>
                Delete account
              </T>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingBottom: 40 },
  title: { marginBottom: 8 },
  gap: { marginTop: 8 },
  section: { marginTop: 24, borderTopWidth: 1, borderColor: colors.oxblood, paddingTop: 14, gap: 14 },
  segment: { flexDirection: 'row', borderWidth: 1, borderColor: colors.oxblood },
  segmentItem: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  code: {
    borderWidth: 1,
    borderColor: colors.oxblood,
    minHeight: 64,
    fontFamily: fonts.light,
    fontSize: 28,
    letterSpacing: 4,
    textAlign: 'center',
    color: colors.oxblood,
  },
  privacy: { marginTop: 28 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  signOut: { minHeight: 48, justifyContent: 'center' },
});

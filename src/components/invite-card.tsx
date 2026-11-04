import { Share as ShareIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';

import { Button, T } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { formatInviteCode, useData } from '@/lib/periods';

/** Shown while the couple has only one member. */
export function InviteCard() {
  const { couple, newInviteCode } = useData();
  const [busy, setBusy] = useState(false);
  if (!couple || couple.other) return null;

  const expires = couple.invite_expires_at ? new Date(couple.invite_expires_at) : null;
  const valid = couple.invite_code !== null && expires !== null && expires > new Date();
  const code = valid ? formatInviteCode(couple.invite_code!) : null;

  async function makeCode() {
    setBusy(true);
    try {
      await newInviteCode();
    } catch (e) {
      Alert.alert('Couldn’t make a code', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <T v="label">Invite your partner</T>
      <T style={styles.body}>They install the app, create an account and enter this code. It works once.</T>
      {code ? (
        <>
          <T selectable style={styles.code}>
            {code}
          </T>
          <T v="small" style={styles.expires}>
            Expires {expires!.getDate()} {expires!.toLocaleDateString('en', { month: 'short' })}
          </T>
          <Button
            title="Share code"
            icon={ShareIcon}
            onPress={() => Share.share({ message: `Join me on Phase with this code: ${code}` })}
          />
          <Button title="Make a new code" variant="outline" icon={null} onPress={makeCode} busy={busy} style={styles.second} />
        </>
      ) : (
        <Button title="Create invite code" onPress={makeCode} busy={busy} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.oxblood, paddingVertical: 16 },
  body: { marginTop: 6, marginBottom: 14 },
  code: { fontFamily: fonts.light, fontSize: 44, lineHeight: 52, letterSpacing: 4, textAlign: 'center' },
  expires: { textAlign: 'center', marginBottom: 14 },
  second: { marginTop: 10 },
});

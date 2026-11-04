import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { InviteCard } from '@/components/invite-card';
import { Button, Row, Screen, T } from '@/components/ui';
import { GUTTER } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/periods';

export default function PartnerSettings() {
  const { session } = useAuth();
  const { couple, removePartner, leaveCouple } = useData();
  if (!couple) return null;

  const { me, other } = couple;
  const iAmTracked = me.role === 'tracked';

  function confirm(title: string, message: string, action: string, fn: () => Promise<void>) {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action,
        style: 'destructive',
        onPress: async () => {
          try {
            await fn();
          } catch (e) {
            Alert.alert('Something went wrong', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <T v="label">{session?.user.email}</T>
        <T v="title" style={styles.title}>
          Partner and sharing
        </T>

        <Row label="You" value={`${me.display_name}${iAmTracked ? ', your cycle' : ''}`} />
        {other ? (
          <>
            <Row label="Shared with" value={other.display_name} last />
            <T v="small" style={styles.note}>
              {other.role === 'tracked'
                ? `You can see and log ${other.display_name}’s cycle.`
                : `${other.display_name} can see and log your cycle. Changes appear on both phones right away.`}
            </T>
            {iAmTracked && (
              <Button
                title="Disconnect partner"
                variant="outline"
                icon={null}
                style={styles.gap}
                onPress={() =>
                  confirm(
                    `Disconnect ${other.display_name}?`,
                    'They will lose access immediately. Your history stays with you.',
                    'Disconnect',
                    removePartner,
                  )
                }
              />
            )}
          </>
        ) : (
          <View style={styles.gap}>
            <InviteCard />
          </View>
        )}

        <View style={styles.danger}>
          {iAmTracked ? (
            <Button
              title="Delete all cycle data"
              variant="outline"
              icon={null}
              onPress={() =>
                confirm(
                  'Delete everything?',
                  'This permanently deletes your cycle history and disconnects your partner. It can’t be undone.',
                  'Delete',
                  leaveCouple,
                )
              }
            />
          ) : (
            <Button
              title="Stop following"
              variant="outline"
              icon={null}
              onPress={() =>
                confirm(
                  'Stop following?',
                  other
                    ? 'You will lose access. The history stays with your partner.'
                    : 'Nobody else has joined yet, so the history you logged will be deleted.',
                  'Stop',
                  leaveCouple,
                )
              }
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: GUTTER, paddingBottom: 40 },
  title: { marginBottom: 18 },
  note: { marginTop: 10 },
  gap: { marginTop: 18 },
  danger: { marginTop: 36 },
});

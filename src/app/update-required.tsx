import { Linking, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Screen, T } from '@/components/ui';
import { GUTTER } from '@/constants/theme';
import { APP_VERSION, useUpdateGate } from '@/lib/app-version';

export default function UpdateRequired() {
  const insets = useSafeAreaInsets();
  const { storeUrl, minVersion } = useUpdateGate();
  const store = Platform.OS === 'ios' ? 'the App Store' : 'Google Play';

  return (
    <Screen>
      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
        <T v="label">Phase</T>
        <T v="title" style={styles.title}>
          Update required
        </T>
        <T>
          This version of Phase is no longer supported. Update from {store} to keep using it. Your data is safe and
          will be there after the update.
        </T>
        <T v="small" style={styles.versions}>
          Installed {APP_VERSION}
          {minVersion ? `  ·  Needed ${minVersion} or later` : ''}
        </T>
        {storeUrl ? (
          <Button title={`Open ${store}`} onPress={() => Linking.openURL(storeUrl)} style={styles.button} />
        ) : (
          <T style={styles.button}>Open {store}, search for Phase and tap Update.</T>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: GUTTER },
  title: { marginTop: 4, marginBottom: 12 },
  versions: { marginTop: 12 },
  button: { marginTop: 'auto' },
});

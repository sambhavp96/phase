import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { CalendarDays, History, LogOut, ShieldCheck, Trash2, Users } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Row, Screen, T } from '@/components/ui';
import { PRIVACY_URL } from '@/constants/links';
import { GUTTER } from '@/constants/theme';
import { confirmDeleteAccount } from '@/lib/account';
import { APP_VERSION } from '@/lib/app-version';
import { useData } from '@/lib/periods';
import { supabase } from '@/lib/supabase';

export default function MenuScreen() {
  const { couple } = useData();
  const partner = couple?.other?.display_name;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <T v="label">Signed in as {couple?.me.display_name}</T>
        <T v="title" style={styles.title}>
          Menu
        </T>
        <Row label="Calendar" icon={CalendarDays} onPress={() => router.replace('/calendar')} />
        <Row label="Previous periods" icon={History} onPress={() => router.replace('/history')} />
        <Row
          label="Partner and sharing"
          value={partner ?? 'Invite'}
          icon={Users}
          onPress={() => router.replace('/settings')}
          last
        />

        <View style={styles.section}>
          <T v="label" style={styles.sectionLabel}>
            Account
          </T>
          <Row label="Privacy policy" icon={ShieldCheck} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} />
          <Row label="Sign out" icon={LogOut} onPress={() => supabase.auth.signOut()} />
          <Row label="Delete account" icon={Trash2} onPress={() => confirmDeleteAccount(couple)} last />
        </View>

        <T v="small" style={styles.version}>
          Phase {APP_VERSION}
        </T>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: GUTTER, paddingBottom: 40 },
  title: { marginBottom: 18 },
  section: { marginTop: 32 },
  sectionLabel: { marginBottom: 10 },
  version: { marginTop: 24 },
});

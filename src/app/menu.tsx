import { router } from 'expo-router';
import { CalendarDays, History, LogOut, Users } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Row, Screen, T } from '@/components/ui';
import { GUTTER } from '@/constants/theme';
import { useData } from '@/lib/periods';
import { supabase } from '@/lib/supabase';

export default function MenuScreen() {
  const { couple } = useData();
  const partner = couple?.other?.display_name;

  return (
    <Screen>
      <View style={styles.content}>
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
        />
        <Row label="Sign out" icon={LogOut} onPress={() => supabase.auth.signOut()} last />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: GUTTER },
  title: { marginBottom: 18 },
});

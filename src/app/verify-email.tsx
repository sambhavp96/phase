import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Field } from '@/components/field';
import { Button, Screen, T } from '@/components/ui';
import { fonts, GUTTER } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

/**
 * Confirms a new account with the code from the sign-up email (the "Confirm signup" email
 * template must show {{ .Token }}). A correct code signs the person in.
 */
export default function VerifyEmail() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = (params.email ?? '').trim();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function verify() {
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    // On success the app moves on to setup by itself.
    if (error) {
      setBusy(false);
      setMessage('That code is wrong or has expired. Check the latest email, or send a new code.');
    }
  }

  async function resend() {
    setMessage(null);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setMessage(error ? error.message : `A new code is on its way to ${email}.`);
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <T v="label">Almost there</T>
          <T v="title" style={styles.title}>
            Confirm your email
          </T>
          <T>Enter the code we sent to {email}. It can take a minute to arrive, and may land in spam.</T>

          <View style={styles.fields}>
            <Field
              label="Code from the email"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={10}
              first
              last
            />
          </View>
          {message && <T style={styles.message}>{message}</T>}

          <Button
            title="Confirm"
            onPress={verify}
            busy={busy}
            disabled={!/^\d{6,10}$/.test(code.trim())}
            style={styles.submit}
          />
          <Pressable accessibilityRole="button" onPress={resend} style={styles.link}>
            <T v="label" style={{ fontFamily: fonts.semibold }}>
              Send a new code
            </T>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingBottom: 40 },
  title: { marginTop: 4, marginBottom: 8 },
  fields: { marginTop: 28 },
  message: { marginTop: 14 },
  submit: { marginTop: 24 },
  link: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
});

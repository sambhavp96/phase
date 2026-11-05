import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button, Screen, T } from '@/components/ui';
import { colors, fonts, GUTTER } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

/**
 * Two steps, no web links: Supabase emails a one-time code (the "Reset password" email template
 * must show {{ .Token }}), then the code signs the person in and the new password is saved.
 */
export default function ForgotPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim());
    setBusy(false);
    if (err) setError(err.message);
    else setStep('code');
  }

  async function savePassword() {
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'recovery',
    });
    if (verifyError) {
      setBusy(false);
      setError('That code is wrong or has expired. Check the latest email, or send a new code.');
      return;
    }
    // Verifying signs the person in, so the app moves on to their home screen; this still runs.
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      Alert.alert(
        'Password not changed',
        `You are signed in, but the new password was not saved: ${updateError.message}. Try the reset again later.`,
      );
    }
  }

  const codeOk = /^\d{6,10}$/.test(code.trim());

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <T v="label">{step === 'email' ? 'Step 1 of 2' : 'Step 2 of 2'}</T>
          <T v="title" style={styles.title}>
            Reset password
          </T>

          {step === 'email' ? (
            <>
              <T>Enter your account email. We will send you a code to set a new password.</T>
              <View style={styles.fields}>
                <Field
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  first
                  last
                />
              </View>
              {error && <T style={styles.message}>{error}</T>}
              <Button title="Send code" onPress={sendCode} busy={busy} disabled={!email.includes('@')} style={styles.submit} />
            </>
          ) : (
            <>
              <T>Check {email.trim()} for an email with a code, then choose a new password.</T>
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
                />
                <Field
                  label="New password, 8 or more characters"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="new-password"
                  textContentType="newPassword"
                  last
                />
              </View>
              {error && <T style={styles.message}>{error}</T>}
              <Button
                title="Save new password"
                onPress={savePassword}
                busy={busy}
                disabled={!codeOk || password.length < 8}
                style={styles.submit}
              />
              <Pressable accessibilityRole="button" onPress={sendCode} disabled={busy} style={styles.link}>
                <T v="label" style={{ fontFamily: fonts.semibold }}>
                  Send a new code
                </T>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({
  label,
  first,
  last,
  ...input
}: React.ComponentProps<typeof TextInput> & { label: string; first?: boolean; last?: boolean }) {
  return (
    <View style={[styles.field, first && styles.fieldFirst, last && styles.fieldLast]}>
      <T v="label">{label}</T>
      <TextInput {...input} accessibilityLabel={label} style={styles.input} selectionColor={colors.oxblood} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingBottom: 40 },
  title: { marginTop: 4, marginBottom: 8 },
  fields: { marginTop: 28 },
  field: { borderTopWidth: 1, borderColor: colors.oxblood, paddingTop: 10 },
  fieldFirst: { borderTopWidth: 0, paddingTop: 0 },
  fieldLast: { borderBottomWidth: 1 },
  input: { fontFamily: fonts.regular, fontSize: 18, color: colors.oxblood, paddingVertical: 10, minHeight: 44 },
  message: { marginTop: 14 },
  submit: { marginTop: 24 },
  link: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
});

import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Screen, T } from '@/components/ui';
import { PRIVACY_URL } from '@/constants/links';
import { colors, fonts, GUTTER } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const signingUp = mode === 'signUp';
  const canSubmit = email.includes('@') && password.length >= (signingUp ? 8 : 1) && (!signingUp || name.trim());

  async function submit() {
    setBusy(true);
    setError(null);
    setNotice(null);
    if (signingUp) {
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: name.trim() } },
      });
      if (err) setError(err.message);
      else if (!data.session) {
        // Email confirmation is switched on in Supabase.
        setNotice('Check your email and tap the confirmation link, then sign in here.');
        setMode('signIn');
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (err) setError(err.message);
    }
    setBusy(false);
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled">
          <T v="label">Phase</T>
          <T v="display" style={styles.headline}>
            {signingUp ? 'Join' : 'Welcome'}
          </T>
          <T style={styles.intro}>Track a cycle privately and share it with one partner.</T>

          <View style={styles.fields}>
            {signingUp && (
              <Field
                label="First name"
                value={name}
                onChangeText={setName}
                autoComplete="given-name"
                textContentType="givenName"
                first
              />
            )}
            <Field
              label="Email"
              first={!signingUp}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <Field
              label={signingUp ? 'Password, 8 or more characters' : 'Password'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={signingUp ? 'new-password' : 'current-password'}
              textContentType={signingUp ? 'newPassword' : 'password'}
              onSubmitEditing={() => canSubmit && submit()}
              last
            />
          </View>

          {error && <T style={styles.message}>{error}</T>}
          {notice && <T style={styles.message}>{notice}</T>}

          {signingUp ? (
            <T v="small" style={styles.message}>
              By creating an account you agree to the{' '}
              <T v="small" style={styles.inlineLink} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}>
                privacy policy
              </T>
              .
            </T>
          ) : (
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push({ pathname: '/forgot-password', params: { email: email.trim() } })}
              style={styles.forgot}>
              <T v="small" style={styles.inlineLink}>
                Forgot password?
              </T>
            </Pressable>
          )}

          <Button
            title={signingUp ? 'Create account' : 'Sign in'}
            onPress={submit}
            busy={busy}
            disabled={!canSubmit}
            style={styles.submit}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setMode(signingUp ? 'signIn' : 'signUp');
              setError(null);
            }}
            style={styles.switch}>
            <T v="label" style={{ fontFamily: fonts.semibold }}>
              {signingUp ? 'I already have an account' : 'Create an account'}
            </T>
          </Pressable>
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
  content: { flexGrow: 1, paddingHorizontal: GUTTER },
  headline: { marginTop: 4 },
  intro: { marginTop: 4 },
  fields: { marginTop: 36 },
  field: { borderTopWidth: 1, borderColor: colors.oxblood, paddingTop: 10 },
  fieldFirst: { borderTopWidth: 0, paddingTop: 0 },
  fieldLast: { borderBottomWidth: 1 },
  input: { fontFamily: fonts.regular, fontSize: 18, color: colors.oxblood, paddingVertical: 10, minHeight: 44 },
  message: { marginTop: 14 },
  inlineLink: { textDecorationLine: 'underline', fontFamily: fonts.medium },
  forgot: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginTop: 4 },
  submit: { marginTop: 24 },
  switch: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
});

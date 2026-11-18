import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { friendlyAuthError, useAuth } from '@/lib/auth-context';

/**
 * Confirms a new account by the 6-digit code in the confirmation email,
 * typed into the app (Terry, 2026-11-09: tapping the email's link opened
 * a browser — "anything that takes the customer out of the app needs to
 * be redone"). Reached from Create Account right after sign-up, and from
 * Log In when Supabase says the email isn't confirmed yet.
 *
 * iOS offers the code from Mail above the keyboard (textContentType
 * "oneTimeCode"), so most customers never even switch to their inbox.
 *
 * Needs the Supabase "Confirm signup" email template to include
 * `{{ .Token }}` — see docs/archive/private-chat.md.
 */
export default function VerifyEmailScreen() {
  const { email = '', resent } = useLocalSearchParams<{ email: string; resent?: string }>();
  const { verifyEmailCode, resendEmailCode } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(resent ? 'We just sent you a new code.' : null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const cleaned = code.replace(/\s/g, '');
    if (!/^\d{6,10}$/.test(cleaned)) {
      setError('Enter the code from the email — numbers only.');
      return;
    }
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      const result = await verifyEmailCode(email, cleaned);
      if (result.error) {
        setError(friendlyAuthError(result.error));
        return;
      }
      router.replace('/(tabs)');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resend = async () => {
    setError(null);
    setNotice(null);
    const result = await resendEmailCode(email);
    if (result.error) setError(friendlyAuthError(result.error));
    else setNotice('New code sent — check your email.');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Confirm Your Email" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            We emailed a 6-digit code to <Text style={styles.email}>{email}</Text>. Enter it below to finish — no
            need to leave the app.
          </Text>
          <Field
            label="Confirmation Code"
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={10}
            autoFocus
            error={error ?? undefined}
          />
          {notice && <Text style={styles.notice}>{notice}</Text>}
          <Button label={isSubmitting ? 'Checking…' : 'Confirm & Continue'} onPress={submit} disabled={isSubmitting} />
          <Text style={styles.hint}>Not there? Check your Junk or Spam folder — it comes from “UCG App.”</Text>
          <Text style={styles.footer}>
            Still nothing?{' '}
            <Text style={styles.footerLink} onPress={resend}>
              Send a New Code
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, paddingHorizontal: Spacing.xxl },
  bodyContent: { paddingTop: Spacing.md, paddingBottom: Spacing.xl },
  intro: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted, lineHeight: 20, marginBottom: 20 },
  email: { fontFamily: Fonts.bodyBold, color: Colors.text },
  notice: { marginTop: -6, marginBottom: 12, fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.green },
  hint: {
    marginTop: 14,
    textAlign: 'center',
    fontFamily: Fonts.body,
    fontSize: 12.5,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  footer: { marginTop: 14, textAlign: 'center', fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted },
  footerLink: { fontFamily: Fonts.bodyBold, color: Colors.red },
});

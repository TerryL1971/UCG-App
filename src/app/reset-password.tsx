import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { friendlyAuthError, useAuth } from '@/lib/auth-context';
import { isValidEmail } from '@/lib/validation';

/**
 * "Forgot password?" handled entirely in the app: email → 6-digit code →
 * new password. Replaces the old WhatsApp-to-support hand-off and avoids
 * Supabase's default reset *link*, which opens a browser (Terry,
 * 2026-11-09: nothing should take the customer out of the app).
 *
 * Needs the Supabase "Reset password" email template to include
 * `{{ .Token }}` — see docs/archive/private-chat.md.
 */
export default function ResetPasswordScreen() {
  const { email: initialEmail = '' } = useLocalSearchParams<{ email?: string }>();
  const { sendPasswordResetCode, resetPasswordWithCode } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; code?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendCode = async () => {
    if (!isValidEmail(email)) {
      setErrors({ email: 'Enter a valid email address.' });
      return;
    }
    setErrors({});
    setFormError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      const result = await sendPasswordResetCode(email.trim());
      if (result.error) {
        setFormError(friendlyAuthError(result.error));
        return;
      }
      setStep('code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resend = async () => {
    setFormError(null);
    setNotice(null);
    const result = await sendPasswordResetCode(email.trim());
    if (result.error) setFormError(friendlyAuthError(result.error));
    else setNotice('New code sent — check your email.');
  };

  const savePassword = async () => {
    const cleaned = code.replace(/\s/g, '');
    const next: typeof errors = {};
    if (!/^\d{6,10}$/.test(cleaned)) next.code = 'Enter the code from the email — numbers only.';
    if (password.length < 6) next.password = 'Use at least 6 characters.';
    setErrors(next);
    setFormError(null);
    setNotice(null);
    if (Object.keys(next).length > 0) return;

    setIsSubmitting(true);
    try {
      const result = await resetPasswordWithCode(email.trim(), cleaned, password);
      if (result.error) {
        setFormError(friendlyAuthError(result.error));
        return;
      }
      // Verifying the code signed them in; the new password is set.
      router.replace('/(tabs)');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Reset Password" onBack={step === 'code' ? () => setStep('email') : undefined} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
          {step === 'email' ? (
            <>
              <Text style={styles.intro}>Enter your account email and we&apos;ll send you a 6-digit code.</Text>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                error={errors.email}
              />
              {formError && <Text style={styles.formError}>{formError}</Text>}
              <Button label={isSubmitting ? 'Sending…' : 'Send Code'} onPress={sendCode} disabled={isSubmitting} />
            </>
          ) : (
            <>
              <Text style={styles.intro}>
                If <Text style={styles.email}>{email.trim()}</Text> has an account, we emailed it a code. Enter it
                with your new password.
              </Text>
              <Field
                label="Code"
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={10}
                autoFocus
                error={errors.code}
              />
              <Field
                label="New Password"
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                secureTextEntry
                textContentType="newPassword"
                error={errors.password}
              />
              {notice && <Text style={styles.notice}>{notice}</Text>}
              {formError && <Text style={styles.formError}>{formError}</Text>}
              <Button
                label={isSubmitting ? 'Saving…' : 'Save New Password'}
                onPress={savePassword}
                disabled={isSubmitting}
              />
              <Text style={styles.hint}>Not there? Check your Junk or Spam folder — it comes from “UCG App.”</Text>
              <Text style={styles.footer}>
                Still nothing?{' '}
                <Text style={styles.footerLink} onPress={resend}>
                  Send a New Code
                </Text>
              </Text>
            </>
          )}
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
  notice: { marginBottom: 12, fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.green },
  formError: { marginBottom: 12, fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.red },
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

import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function CreateAccountScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmEmailSent, setConfirmEmailSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Enter your name.';
    if (!isValidEmail(email)) next.email = 'Enter a valid email address.';
    if (password.length < 6) next.password = 'Use at least 6 characters.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setIsSubmitting(true);
    try {
      // Async either way — a stub in local stand-in mode, a real network
      // call once real Supabase credentials exist (see auth-context.tsx).
      const result = await signUp(name.trim(), email.trim(), password);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      if (result.needsEmailConfirmation) {
        // Real Supabase account created, but no session yet — this
        // project has "Confirm email" on, so there's genuinely nothing
        // to log in to until that link is clicked. Telling the customer
        // that beats silently bouncing them to a signed-out home screen.
        setConfirmEmailSent(true);
        return;
      }
      router.replace('/(tabs)');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (confirmEmailSent) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <ScreenHeader title="Create Account" />
        <View style={[styles.body, { justifyContent: 'center', paddingHorizontal: Spacing.xxl }]}>
          <Text style={styles.intro}>
            Almost there — we sent a confirmation link to {email.trim()}. Tap it, then come back and log in.
          </Text>
          <Button label="Back to Log In" onPress={() => router.replace('/log-in')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Create Account" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            Create an account to save cars, track your deal, and pick up where you left off.
          </Text>

          <Field
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Jordan Rivera"
            autoCapitalize="words"
            error={errors.name}
          />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            error={errors.email}
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            secureTextEntry
            error={errors.password}
          />

          {formError && <Text style={styles.formError}>{formError}</Text>}

          <View style={{ marginTop: 8 }}>
            <Button
              label={isSubmitting ? 'Creating Account…' : 'Create Account'}
              onPress={handleSubmit}
              disabled={isSubmitting}
            />
          </View>

          <Text style={styles.footer}>
            Already have an account?{' '}
            <Text style={styles.footerLink} onPress={() => router.replace('/log-in')}>
              Log In
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
  intro: {
    fontFamily: Fonts.body,
    fontSize: 13.5,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: 20,
  },
  footer: {
    marginTop: 20,
    textAlign: 'center',
    fontFamily: Fonts.body,
    fontSize: 13.5,
    color: Colors.textMuted,
  },
  footerLink: {
    fontFamily: Fonts.bodyBold,
    color: Colors.red,
  },
  formError: {
    marginTop: 12,
    fontFamily: Fonts.bodySemibold,
    fontSize: 13,
    color: Colors.red,
  },
});

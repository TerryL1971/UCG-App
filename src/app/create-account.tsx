import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BasePicker } from '@/components/base-picker';
import { Field } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { friendlyAuthError, useAuth } from '@/lib/auth-context';
import { isValidEmail } from '@/lib/validation';

export default function CreateAccountScreen() {
  const { signUp, base: savedBase } = useAuth();
  // Required (Terry, 2026-11-17): each base has its own registration
  // rules, so the roadmap needs to know where the customer is stationed.
  const [base, setBase] = useState<string | null>(savedBase);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; base?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Enter your name.';
    if (!isValidEmail(email)) next.email = 'Enter a valid email address.';
    if (password.length < 6) next.password = 'Use at least 6 characters.';
    if (!base) next.base = 'Pick the base you’re stationed at.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0 || !base) return;

    setIsSubmitting(true);
    try {
      // Async either way — a stub in local stand-in mode, a real network
      // call once real Supabase credentials exist (see auth-context.tsx).
      const result = await signUp(name.trim(), email.trim(), password, base);
      if (result.error) {
        setFormError(friendlyAuthError(result.error));
        return;
      }
      if (result.needsEmailConfirmation) {
        // Real Supabase account created, but no session yet — this
        // project has "Confirm email" on. The customer confirms by typing
        // the emailed code in the app (verify-email.tsx), never by
        // tapping a link that opens a browser outside it (Terry,
        // 2026-11-09).
        router.replace({ pathname: '/verify-email', params: { email: email.trim() } });
        return;
      }
      router.replace('/(tabs)');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Create Account" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            Create an account to follow your deal, keep your paperwork, and chat with your salesperson.
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

          <Text style={styles.baseLabel}>Where are you stationed?</Text>
          <Text style={styles.baseHint}>Each base has its own rules for registering a car. You can change this later.</Text>
          <BasePicker value={base} onChange={setBase} error={errors.base} />

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
  baseLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12.5,
    color: Colors.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  baseHint: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textFaint, marginTop: 3, marginBottom: 10 },
  formError: {
    marginTop: 12,
    fontFamily: Fonts.bodySemibold,
    fontSize: 13,
    color: Colors.red,
  },
});

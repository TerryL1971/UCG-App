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

  const handleSubmit = () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Enter your name.';
    if (!isValidEmail(email)) next.email = 'Enter a valid email address.';
    if (password.length < 6) next.password = 'Use at least 6 characters.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    signUp(name.trim(), email.trim(), password);
    router.replace('/(tabs)');
  };

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

          <View style={{ marginTop: 8 }}>
            <Button label="Create Account" onPress={handleSubmit} />
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
});

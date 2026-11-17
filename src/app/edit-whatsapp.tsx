import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { normalizeWhatsapp } from '@/constants/salespeople';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

/** The customer's own WhatsApp number — how UCG reaches them. */
export default function EditWhatsappScreen() {
  const { user, setWhatsapp } = useAuth();
  const [value, setValue] = useState(user?.whatsapp ? `+${user.whatsapp}` : '');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const digits = normalizeWhatsapp(value);
    if (!digits) {
      setError('Include the country code, e.g. +49 151 2345 6789 or +1 555 123 4567.');
      return;
    }
    setSaving(true);
    const result = await setWhatsapp(digits);
    setSaving(false);
    if (result.error) {
      Alert.alert("Couldn't save", 'Check your connection and try again.');
      return;
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="My WhatsApp Number" />
      <View style={styles.content}>
        <Text style={styles.body}>UCG uses WhatsApp to reach you about your car. Keep this up to date if your number changes.</Text>
        <Field
          label="WhatsApp number"
          value={value}
          onChangeText={(v) => {
            setValue(v);
            setError(undefined);
          }}
          keyboardType="phone-pad"
          placeholder="+49 151 2345 6789"
          error={error}
        />
        <Button label={saving ? 'Saving…' : 'Save'} onPress={save} disabled={saving} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.xl },
  body: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, lineHeight: 20, marginBottom: 16 },
});

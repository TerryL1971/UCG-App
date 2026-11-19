import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BasePicker } from '@/components/base-picker';
import { ScreenHeader } from '@/components/ui/screen-header';
import { baseName } from '@/constants/bases';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { goBack } from '@/lib/navigation';

/**
 * Change where you're stationed (e.g. PCS from Wiesbaden to Stuttgart).
 * Every roadmap — buying or selling — then follows the new base's rules.
 */
export default function ChooseBaseScreen() {
  const { base, setBase } = useAuth();
  const [saving, setSaving] = useState(false);

  const choose = async (id: string) => {
    if (id === base) {
      goBack();
      return;
    }
    setSaving(true);
    const result = await setBase(id);
    setSaving(false);
    if (result.error) {
      Alert.alert("Couldn't save your base", 'Check your connection and try again.');
      return;
    }
    goBack();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Where Are You Stationed?" subtitle={base ? `Now: ${baseName(base)}` : undefined} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.body}>
          Every base has its own rules for registering and deregistering a car, so your roadmap follows the base
          you&apos;re at now. Moved? Pick your new base — any car you buy or sell from here on follows its rules.
        </Text>
        <BasePicker value={base} onChange={saving ? () => {} : choose} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.xl, gap: Spacing.lg },
  body: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, lineHeight: 20 },
});

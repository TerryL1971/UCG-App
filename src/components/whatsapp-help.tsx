import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { WhatsAppIcon } from '@/components/icons';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { openUrlWithFeedback } from '@/lib/linking';

// Store links (not https), so they open the App Store / Play Store app
// itself rather than the in-app browser.
const STORE_URL =
  Platform.OS === 'android'
    ? 'market://details?id=com.whatsapp'
    : 'itms-apps://apps.apple.com/app/id310633997';

/**
 * "Never used WhatsApp?" (Terry, 2026-11-19): many Americans haven't, and
 * a required WhatsApp number at sign-up would stop them cold without a
 * word on why and how.
 */
export function WhatsAppHelp() {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.wrap}>
      <Pressable style={styles.head} onPress={() => setOpen((o) => !o)} hitSlop={6}>
        <WhatsAppIcon size={16} color={Colors.green} />
        <Text style={styles.headText}>Never used WhatsApp?</Text>
        <Text style={styles.toggle}>{open ? '−' : '+'}</Text>
      </Pressable>
      {open && (
        <View style={{ gap: 8, marginTop: 8 }}>
          <Text style={styles.body}>
            Almost everyone in Germany uses WhatsApp instead of texting, and so does UCG. It’s free, and it works over
            Wi-Fi, so messages to and from the US cost nothing.
          </Text>
          <Text style={styles.body}>
            1. Get WhatsApp from the app store.{'\n'}2. Sign up with your phone number. Your US number works fine.
            {'\n'}3. Type that same number here, starting with your country code (+1 for the US, +49 for Germany).
          </Text>
          <Pressable style={styles.button} onPress={() => openUrlWithFeedback(STORE_URL, "Couldn't open the app store.")}>
            <Text style={styles.buttonLabel}>Get WhatsApp (free)</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: Colors.greenTint, borderRadius: Radius.md, padding: 12, marginTop: -6, marginBottom: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headText: { flex: 1, fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.text },
  toggle: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.green },
  body: { fontFamily: Fonts.body, fontSize: 13, color: Colors.text, lineHeight: 19 },
  button: { height: 40, borderRadius: Radius.sm, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
  buttonLabel: { fontFamily: Fonts.bodyBold, fontSize: 13.5, color: '#fff' },
});

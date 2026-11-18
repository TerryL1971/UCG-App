import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WhatsAppIcon } from '@/components/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { GOOD_TO_KNOW } from '@/constants/good-to-know';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useMyDeals } from '@/lib/my-deals-context';
import { messageSalesperson } from '@/lib/whatsapp';

/** The questions every customer asks, answered once (constants/good-to-know.ts). */
export default function GoodToKnowScreen() {
  const { selected } = useMyDeals();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Good to Know" subtitle="What customers ask us most" />
      <ScrollView contentContainerStyle={styles.content}>
        {GOOD_TO_KNOW.map((item, i) => {
          const isOpen = open === i;
          return (
            <Pressable key={item.q} style={styles.item} onPress={() => setOpen(isOpen ? null : i)}>
              <View style={styles.qRow}>
                <Text style={styles.q}>{item.q}</Text>
                <Text style={styles.toggle}>{isOpen ? '−' : '+'}</Text>
              </View>
              {isOpen && <Text style={styles.a}>{item.a}</Text>}
            </Pressable>
          );
        })}
        <Pressable style={styles.ask} onPress={() => messageSalesperson(selected?.deal, 'I have a question: ')}>
          <WhatsAppIcon size={18} color={Colors.green} />
          <Text style={styles.askLabel}>Something else? Ask on WhatsApp</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.xl, gap: 8 },
  item: { backgroundColor: '#fff', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 14 },
  qRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  q: { flex: 1, fontFamily: Fonts.bodyBold, fontSize: 14.5, color: Colors.text },
  toggle: { fontFamily: Fonts.bodyBold, fontSize: 20, color: Colors.navy },
  a: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted, lineHeight: 20, marginTop: 8 },
  ask: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, marginTop: 8 },
  askLabel: { fontFamily: Fonts.bodySemibold, fontSize: 14, color: Colors.green },
});

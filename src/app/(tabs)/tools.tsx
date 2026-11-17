import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClockIcon, DocumentIcon, MapPinIcon, ShieldIcon, UmbrellaIcon, WhatsAppIcon, WrenchIcon } from '@/components/icons';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useMyDeals } from '@/lib/my-deals-context';
import { messageSalesperson, salespersonLabel } from '@/lib/whatsapp';

/**
 * Tools — the handy extras around buying, selling, registering and
 * servicing a car with UCG (modelled on the Boris PCS app's Tools tab).
 * Car only, on purpose: that's UCG's lane.
 */
export default function ToolsScreen() {
  const { selected } = useMyDeals();
  const deal = selected?.deal;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navbar}>
        <Text style={styles.title}>Tools</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.group}>
          <ToolRow icon={<ShieldIcon size={20} color={Colors.navy} />} title="How to Pay" sub="UCG's payment details for your deal" href="/payment" />
          <ToolRow icon={<ClockIcon size={20} color={Colors.navy} />} title="Key Dates" sub="Pay-by, guarantee and other deadlines" href="/key-dates" />
          <ToolRow icon={<DocumentIcon size={20} color={Colors.navy} />} title="Every Step, Explained" sub="Your whole plan for your base" href="/road-to-plates" />
          <ToolRow icon={<MapPinIcon size={20} color={Colors.navy} />} title="VRO Checklist" sub="What to bring to register your car" href="/vro-checklist" />
          <ToolRow icon={<Text style={styles.currencyIcon}>$€</Text>} title="Currency Converter" sub="US dollars and euros, today's rate" href="/currency" />
        </View>

        <View style={styles.group}>
          <ToolRow
            icon={<UmbrellaIcon size={20} color={Colors.navy} />}
            title="American Auto Nation"
            sub="Car insurance for USAREUR drivers, from UCG"
            href="/insurance"
          />
          <ToolRow icon={<WrenchIcon size={20} color={Colors.navy} />} title="Service Center" sub="Oil changes, repairs, tires" href="/service" />
        </View>

        <View style={styles.group}>
          <Pressable style={styles.row} onPress={() => messageSalesperson(deal, 'Hi! ')}>
            <View style={styles.iconWrap}>
              <WhatsAppIcon size={20} color={Colors.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Message {salespersonLabel(deal)}</Text>
              <Text style={styles.rowSub}>{deal?.salesperson_whatsapp ? 'Your salesperson, on WhatsApp' : 'UCG on WhatsApp'}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToolRow({ icon, title, sub, href }: { icon: React.ReactNode; title: string; sub: string; href: Href }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]} onPress={() => router.push(href)}>
      <View style={styles.iconWrap}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  navbar: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontFamily: Fonts.display, fontSize: 20, color: Colors.text },
  content: { padding: Spacing.xl, gap: Spacing.lg },
  group: { backgroundColor: '#fff', borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.navyTint, alignItems: 'center', justifyContent: 'center' },
  currencyIcon: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.navy },
  rowTitle: { fontFamily: Fonts.bodyBold, fontSize: 14.5, color: Colors.text },
  rowSub: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, marginTop: 1 },
  chevron: { fontFamily: Fonts.bodyBold, fontSize: 20, color: Colors.textFaint },
});

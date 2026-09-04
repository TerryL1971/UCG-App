import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MapPinIcon, MessageIcon, PhoneIcon, WrenchIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { whatsappChatUrl } from '@/constants/mock-data';
import { serviceContact, serviceLinks, serviceOfferings } from '@/constants/service-center';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { directionsUrl } from '@/lib/maps';

/**
 * The Service Center hub. Deliberately reachable without a deal and
 * without an account — the service department is open to anyone stationed
 * in Germany, not just people who bought a car from UCG (Terry).
 *
 * No in-app scheduling: every action hands off to UCG's own hosted
 * request form or a direct contact method (see src/constants/service-center.ts).
 */
export default function ServiceScreen() {
  const openUrl = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Service Center" subtitle="Ramstein Superstore" />

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.introCard}>
          <WrenchIcon size={20} color={Colors.navy} />
          <Text style={styles.introText}>
            You don&apos;t need to have bought your car from UCG. Anyone stationed in Germany can book oil changes,
            repairs, tires, and more with our shop.
          </Text>
        </View>

        <Button label="Request an Appointment  →" onPress={() => openUrl(serviceLinks.appointmentRequest)} />

        <Text style={styles.sectionLabel}>What We Do</Text>
        {serviceOfferings.map((s) => (
          <View key={s.name} style={styles.serviceCard}>
            <Text style={styles.serviceName}>{s.name}</Text>
            <Text style={styles.serviceDetail}>{s.detail}</Text>
          </View>
        ))}

        <View style={styles.secondaryActions}>
          <Button
            label="Get a Tire Quote"
            variant="secondary"
            style={styles.secondaryBtn}
            onPress={() => openUrl(serviceLinks.tireQuote)}
          />
          <Button
            label="Warranty Assistance"
            variant="secondary"
            style={styles.secondaryBtn}
            onPress={() => openUrl(serviceLinks.warrantyAssistance)}
          />
        </View>

        <Text style={styles.sectionLabel}>Reach the Shop</Text>
        <ContactRow icon={<PhoneIcon size={17} color={Colors.navy} />} label={serviceContact.phone} onPress={() => openUrl(`tel:${serviceContact.phone.replace(/\s/g, '')}`)} />
        <ContactRow
          icon={<MessageIcon size={17} color={Colors.navy} />}
          label="Message the service team on WhatsApp"
          onPress={() => openUrl(whatsappChatUrl(serviceContact.whatsapp))}
        />
        <ContactRow
          icon={<MessageIcon size={17} color={Colors.navy} />}
          label={serviceContact.email}
          onPress={() => openUrl(`mailto:${serviceContact.email}`)}
        />
        <ContactRow
          icon={<MapPinIcon size={17} color={Colors.navy} />}
          label={serviceContact.address}
          onPress={() => openUrl(directionsUrl(serviceContact.address))}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ContactRow({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.contactRow} onPress={onPress} disabled={!onPress}>
      <View style={styles.contactIcon}>{icon}</View>
      <Text style={[styles.contactLabel, onPress && styles.contactLabelLink]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, paddingHorizontal: Spacing.xxl },
  bodyContent: { paddingTop: Spacing.md, paddingBottom: Spacing.xxl, gap: 12 },

  introCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: Colors.navyTint,
    borderRadius: Radius.lg,
    padding: 12,
  },
  introText: { flex: 1, fontFamily: Fonts.body, fontSize: 12.5, color: Colors.text, lineHeight: 18 },

  sectionLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginTop: 6,
  },

  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 12,
    gap: 3,
  },
  serviceName: { fontFamily: Fonts.bodyBold, fontSize: 13.5, color: Colors.text },
  serviceDetail: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted, lineHeight: 16 },

  secondaryActions: { gap: 10, marginTop: 2 },
  secondaryBtn: { marginBottom: 0 },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  contactIcon: { width: 20, alignItems: 'center' },
  contactLabel: { flex: 1, fontFamily: Fonts.body, fontSize: 13, color: Colors.text, lineHeight: 18 },
  contactLabelLink: { fontFamily: Fonts.bodySemibold, color: Colors.navy },
});

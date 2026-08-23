import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MessageIcon, PhoneIcon, StarIcon } from '@/components/icons';
import { SalespersonAvatarFull } from '@/components/salesperson-avatar';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { salesperson } from '@/constants/mock-data';
import { useDeal } from '@/lib/deal-context';

export default function SalespersonScreen() {
  const { car } = useDeal();
  const carLabel = car ? `${car.year} ${car.title}` : 'your next car';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="You're All Set" />

      <View style={styles.body}>
        <Text style={styles.eyebrow}>Meet Your Specialist</Text>

        <View style={styles.avatarWrap}>
          <SalespersonAvatarFull size={190} />
          <View style={styles.starBadge}>
            <StarIcon size={18} color="#fff" />
          </View>
        </View>

        <Text style={styles.name}>{salesperson.name}</Text>
        <View style={styles.ratingRow}>
          <StarIcon />
          <Text style={styles.ratingText}>
            {salesperson.topRated ? 'Top Rated · ' : ''}
            {salesperson.title}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={styles.actionItem} onPress={() => Linking.openURL(salesperson.phone)}>
            <View style={styles.actionCircle}>
              <PhoneIcon />
            </View>
            <Text style={styles.actionLabel}>Call</Text>
          </Pressable>
          <Pressable style={styles.actionItem} onPress={() => Linking.openURL(salesperson.phone.replace('tel:', 'sms:'))}>
            <View style={[styles.actionCircle, { backgroundColor: Colors.red }]}>
              <MessageIcon color="#fff" />
            </View>
            <Text style={styles.actionLabel}>Text</Text>
          </Pressable>
        </View>

        <View style={[styles.quoteCard, Shadow.card]}>
          <Text style={styles.quoteText}>
            &ldquo;Hi! I&apos;ll be helping you get into your {carLabel}. I&apos;ll walk with you through
            every step — text me anytime, day or night.&rdquo;
          </Text>
        </View>
      </View>

      <View style={styles.ctaWrap}>
        <Button label="View My Timeline  →" onPress={() => router.push('/(tabs)/deal')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.xxl, paddingTop: 6 },
  eyebrow: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  avatarWrap: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: Colors.navyTint,
    marginTop: 18,
    overflow: 'hidden',
    alignItems: 'center',
  },
  starBadge: { position: 'absolute', top: 8, right: 8 },
  name: { fontFamily: Fonts.display, fontSize: 24, color: Colors.text, marginTop: 16 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  ratingText: { fontFamily: Fonts.bodySemibold, fontSize: 13.5, color: Colors.red },
  actionsRow: { flexDirection: 'row', gap: 36, marginTop: 22 },
  actionItem: { alignItems: 'center', gap: 8 },
  actionCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.text },
  quoteCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    padding: 16,
    paddingHorizontal: 18,
    marginTop: 24,
    width: '100%',
  },
  quoteText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 21, fontStyle: 'italic' },
  ctaWrap: { paddingHorizontal: Spacing.xxl, paddingTop: 16, paddingBottom: 8 },
});

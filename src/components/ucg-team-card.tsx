import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WhatsAppIcon } from '@/components/icons';
import { dealershipForBase, dealershipTeam, SHOWROOM_HOURS } from '@/constants/salespeople';
import { Colors, Fonts, Radius, Shadow } from '@/constants/theme';
import type { Deal } from '@/lib/deals';
import { messageSalesperson, messageWhatsapp } from '@/lib/whatsapp';

/**
 * "Your UCG team" (Terry, 2026-11-18): the people behind the deal, one tap
 * away on WhatsApp — the salesperson first, then anyone else the customer
 * will deal with at that dealership (registration, logistics…), and the
 * showroom hours. In a real conversation the customer had to ask for the
 * registration contact's number; it should just be here.
 */
export function UcgTeamCard({ deal, baseId }: { deal: Deal; baseId: string | null }) {
  // The location that sold the car; if the customer didn't say, the UCG
  // location at their base (if there is one).
  const location = deal.dealership ?? dealershipForBase(baseId);
  const team = dealershipTeam(location);
  const hours = location ? SHOWROOM_HOURS[location] : undefined;
  const salesperson = deal.salesperson_name || 'Your salesperson';
  const initials = salesperson
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.card, Shadow.card]}>
      <Text style={styles.kicker}>Your UCG team{location ? ` · UCG ${location}` : ''}</Text>
      <Pressable style={styles.person} onPress={() => messageSalesperson(deal, 'Hi! ')}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{salesperson}</Text>
          <Text style={styles.role}>
            Your salesperson{deal.salesperson_whatsapp ? '' : ' · add their WhatsApp in your deal details'}
          </Text>
        </View>
        <WhatsAppIcon size={20} color={Colors.green} />
      </Pressable>
      {team.map((p) => (
        <Pressable key={p.name} style={styles.person} onPress={() => messageWhatsapp(p.whatsapp, `Hi ${p.name.split(' ')[0]}! `, p.name)}>
          <View style={[styles.avatar, styles.avatarAlt]}>
            <Text style={styles.initials}>{p.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{p.name}</Text>
            <Text style={styles.role}>{p.role}</Text>
          </View>
          <WhatsAppIcon size={20} color={Colors.green} />
        </Pressable>
      ))}
      {hours && <Text style={styles.hours}>Showroom hours: {hours}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: 14, gap: 10 },
  kicker: { fontFamily: Fonts.bodyBold, fontSize: 11.5, color: Colors.red, letterSpacing: 0.5, textTransform: 'uppercase' },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarAlt: { backgroundColor: Colors.textMuted },
  initials: { fontFamily: Fonts.bodyBold, fontSize: 15, color: '#fff' },
  name: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text },
  role: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, marginTop: 1 },
  hours: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.textMuted },
});

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeadlineBanner } from '@/components/deal-ui';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { addDays, currentDeadline, formatDate, parseDate, vehicleLabel } from '@/lib/deal-flow';
import { useMyDeals } from '@/lib/my-deals-context';

/**
 * Every deadline across the customer's deals in one place — what Boris
 * calls "Document Dates", for the car: pay-by date, Cost Estimate
 * validity, inspection guarantee, when UCG pays for a sold car.
 */
export default function KeyDatesScreen() {
  const { deals } = useMyDeals();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Key Dates" />
      <ScrollView contentContainerStyle={styles.content}>
        {deals.length === 0 ? (
          <Text style={styles.note}>Start your car plan on My Deal and your deadlines will show up here.</Text>
        ) : (
          deals.map(({ deal, milestones, files }) => {
            const deadline = currentDeadline(deal, milestones, undefined, files);
            return (
              <View key={deal.id} style={styles.card}>
                <Text style={styles.car}>{vehicleLabel(deal)}</Text>
                <Text style={styles.meta}>
                  Deal #{deal.deal_number} · {deal.kind === 'sale' ? 'Selling to UCG' : 'Buying from UCG'}
                </Text>
                {deadline ? (
                  <View style={{ marginTop: 10 }}>
                    <DeadlineBanner deadline={deadline} />
                  </View>
                ) : (
                  <Text style={styles.none}>No deadline right now.</Text>
                )}
                {deal.kind === 'purchase' && deal.is_den && (
                  <Text style={styles.line}>
                    Cost Estimate dated {formatDate(parseDate(deal.document_date))} (prices valid until{' '}
                    {formatDate(addDays(parseDate(deal.document_date), 30))}).
                  </Text>
                )}
              </View>
            );
          })
        )}
        <Text style={styles.note}>
          Dates follow what&apos;s ticked and scanned in your plan. German public holidays aren&apos;t counted, so
          confirm close deadlines with your salesperson.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.xl, gap: Spacing.md },
  card: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg },
  car: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text },
  meta: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, marginTop: 2 },
  none: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textFaint, marginTop: 10 },
  line: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, marginTop: 10, lineHeight: 18 },
  note: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, lineHeight: 18 },
});

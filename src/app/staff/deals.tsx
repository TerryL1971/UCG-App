import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SearchIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { useChat } from '@/lib/chat-context';
import { useDemoMode } from '@/lib/demo-mode';
import { dealTitle, vehicleLabel } from '@/lib/deal-flow';
import { fetchStaffDeals, subscribeToDealChanges, type Deal } from '@/lib/deals';

/**
 * Every deal in the app (all active staff see all deals — salespeople
 * cover for each other, and the buying team needs a car's documents at
 * sell-back). "Mine" first; search by Deal #, Stock #, name or VIN.
 */
export default function StaffDealsScreen() {
  const { user } = useAuth();
  const { staffProfile } = useChat();
  const demo = useDemoMode();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(() => {
    return fetchStaffDeals()
      .then((rows) => {
        setDeals(rows);
        setLoadFailed(false);
      })
      .catch((error) => {
        console.error('Loading deals failed:', error);
        setLoadFailed(true);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (staffProfile || demo) load();
    }, [staffProfile, demo, load]),
  );
  useEffect(() => {
    if (!staffProfile && !demo) return;
    return subscribeToDealChanges('staff-deals', () => {
      load();
    });
  }, [staffProfile, demo, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? deals.filter((d) =>
          [d.deal_number, d.stock_number, d.customer_name, d.vin, d.vehicle_make, d.vehicle_model]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
        )
      : deals;
    return [...matches].sort((a, b) => Number(b.salesperson_id === user?.id) - Number(a.salesperson_id === user?.id));
  }, [deals, query, user?.id]);

  if (!staffProfile && !demo) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Deals" />
        <Text style={styles.note}>This screen is only for UCG staff accounts.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Deals" subtitle="Open a deal to mark its status or add scans" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load().finally(() => setRefreshing(false));
            }}
            tintColor={Colors.navy}
          />
        }>
        <Button label="New Deal" onPress={() => router.push('/staff/deal-form')} />
        <View style={styles.search}>
          <SearchIcon />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Deal #, Stock #, name or VIN"
            placeholderTextColor={Colors.textFaint}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        {isLoading ? (
          <ActivityIndicator color={Colors.navy} style={{ marginTop: 24 }} />
        ) : loadFailed ? (
          <Text style={styles.note}>Couldn&apos;t load deals. Pull down to try again.</Text>
        ) : filtered.length === 0 ? (
          <Text style={styles.note}>{query ? 'No deals match that.' : 'No deals yet. Tap New Deal to add one.'}</Text>
        ) : (
          filtered.map((d) => (
            <Pressable
              key={d.id}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
              onPress={() => router.push({ pathname: '/staff/deal/[id]', params: { id: d.id } })}>
              <View style={styles.rowTop}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {d.customer_name}
                </Text>
                <Text style={styles.rowDeal}>#{d.deal_number}</Text>
              </View>
              <Text style={styles.rowCar}>
                {vehicleLabel(d)} · {d.stock_number}
              </Text>
              <Text style={styles.rowMeta}>
                {dealTitle(d)}
                {d.is_den ? ' · DEN' : ''} · {d.salesperson_id === user?.id ? 'Your deal' : (d.salesperson_name ?? 'Unassigned')}
                {d.customer_id ? ' · Customer connected' : ' · Customer not connected yet'}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.sm },
  note: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, textAlign: 'center', margin: Spacing.xl },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    marginTop: Spacing.sm,
  },
  searchInput: { flex: 1, height: 46, fontFamily: Fonts.body, fontSize: 14.5, color: Colors.text },
  row: { backgroundColor: '#fff', borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowName: { flex: 1, fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text },
  rowDeal: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.navy },
  rowCar: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.navy, marginTop: 2 },
  rowMeta: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted, marginTop: 4 },
});

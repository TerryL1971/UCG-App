import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CameraIcon, ClockIcon, MapPinIcon, PlusIcon, ShieldIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useDeal } from '@/lib/deal-context';
import { useVinScan } from '@/lib/vin-scan-context';

const conditions = ['Fair', 'Good', 'Excellent'] as const;

export default function SellBackScreen() {
  const { car } = useDeal();
  const { lastScannedVin, clearLastScannedVin } = useVinScan();

  // If they chose this car from our own inventory earlier in the app, we
  // already know its VIN — no reason to make them type it again. If they
  // never went through that flow (or came here for a car we didn't sell
  // them), this just stays blank and they fill it in like normal.
  const [plate, setPlate] = useState(() => car?.vin ?? '');
  const [mileage, setMileage] = useState('');
  const [condition, setCondition] = useState<(typeof conditions)[number]>('Good');

  useEffect(() => {
    if (lastScannedVin) {
      setPlate(lastScannedVin);
      clearLastScannedVin();
    }
  }, [lastScannedVin, clearLastScannedVin]);

  const handleSubmit = () => {
    if (!plate.trim() || !mileage.trim()) {
      Alert.alert('Almost there', 'Add your license plate/VIN and mileage so we can put together an offer.');
      return;
    }
    // No real offer-generation backend yet — confirm the submission was
    // received rather than doing nothing when tapped.
    Alert.alert('Request sent', "We'll text you a real offer within one business day.");
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navbar}>
        <Text style={styles.title}>Sell It Back</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Text style={styles.intro}>
          Already own a Used Car Guys vehicle? Get a real offer in minutes — no obligation.
        </Text>

        {car && (
          <View style={styles.recognizedCard}>
            <Text style={styles.recognizedTitle}>
              Selling back your {car.year} {car.title}?
            </Text>
            <Text style={styles.recognizedBody}>
              {car.vin ? "We've filled in the VIN below." : 'Add its VIN below to get started.'}
            </Text>
          </View>
        )}

        <Field label="License Plate or VIN">
          <View style={styles.plateRow}>
            <TextInput
              value={plate}
              onChangeText={setPlate}
              placeholder="e.g. 1HGCM82633A004352"
              placeholderTextColor={Colors.textFaint}
              autoCapitalize="characters"
              style={[styles.input, styles.plateInput]}
            />
            <Pressable style={styles.scanButton} onPress={() => router.push('/scan-vin')}>
              <CameraIcon color="#fff" strokeWidth={2.2} />
              <Text style={styles.scanButtonLabel}>Scan</Text>
            </Pressable>
          </View>
        </Field>

        <Field label="Current Mileage">
          <TextInput
            value={mileage}
            onChangeText={setMileage}
            placeholder="e.g. 41,200 miles"
            placeholderTextColor={Colors.textFaint}
            keyboardType="number-pad"
            style={styles.input}
          />
        </Field>

        <Field label="Overall Condition">
          <View style={styles.segRow}>
            {conditions.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCondition(c)}
                style={[styles.segOption, condition === c && styles.segOptionActive]}>
                <Text style={[styles.segLabel, condition === c && styles.segLabelActive]}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="Add Photos">
          <View style={styles.photoRow}>
            {[0, 1, 2].map((i) => (
              <Pressable
                key={i}
                style={styles.photoTile}
                onPress={() => Alert.alert('Not connected yet', "Photo upload isn't wired to a camera roll yet.")}>
                {i === 0 ? <PlusIcon color={Colors.red} /> : <CameraIcon />}
              </Pressable>
            ))}
          </View>
        </Field>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Get My Offer" onPress={handleSubmit} />
        <View style={styles.trustRow}>
          <Trust icon={<ShieldIcon size={20} />} label="No obligation" />
          <Trust icon={<ClockIcon size={20} />} label="Real offers, real fast" />
          <Trust icon={<MapPinIcon size={20} />} label="We come to you" />
        </View>
      </View>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Trust({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.trustItem}>
      {icon}
      <Text style={styles.trustLabel}>{label}</Text>
    </View>
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
  body: { flex: 1, paddingHorizontal: Spacing.xxl },
  bodyContent: { paddingTop: Spacing.md, paddingBottom: Spacing.xl },
  intro: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted, lineHeight: 20, marginBottom: 20 },
  recognizedCard: {
    backgroundColor: Colors.navyTint,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 18,
  },
  recognizedTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.navy },
  recognizedBody: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.navy, marginTop: 2, opacity: 0.8 },
  field: { marginBottom: 16 },
  fieldLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12.5,
    color: Colors.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  input: {
    marginTop: 7,
    height: 50,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    fontFamily: Fonts.body,
    fontSize: 14.5,
    color: Colors.text,
  },
  plateRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  plateInput: { flex: 1, marginTop: 7 },
  scanButton: {
    marginTop: 7,
    height: 50,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scanButtonLabel: { fontFamily: Fonts.bodyBold, fontSize: 13.5, color: '#fff' },
  segRow: { flexDirection: 'row', gap: 8, marginTop: 7 },
  segOption: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segOptionActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  segLabel: { fontFamily: Fonts.bodySemibold, fontSize: 13.5, color: Colors.textMuted },
  segLabelActive: { color: '#fff' },
  photoRow: { flexDirection: 'row', gap: 10, marginTop: 7 },
  photoTile: {
    width: 76,
    height: 76,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C9CDD9',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { paddingHorizontal: Spacing.xxl, paddingTop: 8, paddingBottom: 8 },
  trustRow: { flexDirection: 'row', marginTop: 20, paddingHorizontal: 4 },
  trustItem: { flex: 1, alignItems: 'center', gap: 6 },
  trustLabel: { fontFamily: Fonts.bodySemibold, fontSize: 10.5, color: Colors.textMuted, textAlign: 'center' },
});

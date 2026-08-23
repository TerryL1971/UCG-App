import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CameraIcon, ClockIcon, MapPinIcon, PlusIcon, ShieldIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

const conditions = ['Fair', 'Good', 'Excellent'] as const;

export default function SellBackScreen() {
  const [plate, setPlate] = useState('');
  const [mileage, setMileage] = useState('');
  const [condition, setCondition] = useState<(typeof conditions)[number]>('Good');

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Sell It Back" />

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Text style={styles.intro}>
          Already own a Used Car Guys vehicle? Get a real offer in minutes — no obligation.
        </Text>

        <Field label="License Plate or VIN">
          <TextInput
            value={plate}
            onChangeText={setPlate}
            placeholder="e.g. 1HGCM82633A004352"
            placeholderTextColor={Colors.textFaint}
            style={styles.input}
          />
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
            <View style={styles.photoTile}>
              <PlusIcon color={Colors.red} />
            </View>
            <View style={styles.photoTile}>
              <CameraIcon />
            </View>
            <View style={styles.photoTile}>
              <CameraIcon />
            </View>
          </View>
        </Field>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Get My Offer" />
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
  body: { flex: 1, paddingHorizontal: Spacing.xxl },
  bodyContent: { paddingTop: Spacing.md, paddingBottom: Spacing.xl },
  intro: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted, lineHeight: 20, marginBottom: 20 },
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

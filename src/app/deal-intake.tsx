import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Dimensions, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CameraIcon, CheckCircleIcon, IdCardIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import {
  salesperson,
  usareurBases,
  USAREUR_OFFICIAL_JKO_URL,
  USAREUR_STUDY_GUIDE_URL,
  type DealIntake,
  type LicenseStatus,
  type PaymentMethod,
} from '@/constants/mock-data';
import { useAuth } from '@/lib/auth-context';
import { useDeal } from '@/lib/deal-context';
import { useDealIntake } from '@/lib/deal-intake-context';
import { compressPhoto } from '@/lib/image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type LicenseSide = 'front' | 'back';

/**
 * The screen that replaces jumping straight from "Choose This Car" to a
 * salesperson-match screen with nothing behind it. There's no real deal —
 * and so no real timeline — until someone knows cash vs. financed, which
 * base the customer is headed to, and where they stand on a USAREUR
 * license. This gathers exactly that, in the customer's own words, so
 * their salesperson opens the conversation already knowing something
 * instead of starting from zero. See DealIntake in mock-data.ts for what
 * this stands in for on the real Dealer Team side.
 */
export default function DealIntakeScreen() {
  const { car } = useDeal();
  const { submitIntake } = useDealIntake();
  const { user } = useAuth();
  const carLabel = car ? `${car.year} ${car.title}` : 'your next car';

  const [fullName, setFullName] = useState(user?.name ?? '');
  const [contact, setContact] = useState('');
  const [base, setBase] = useState<string | null>(null);
  const [otherBase, setOtherBase] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [financingLender, setFinancingLender] = useState('');
  const [financingDownPayment, setFinancingDownPayment] = useState('');
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>('not_yet');
  const [licensePhotoFrontUri, setLicensePhotoFrontUri] = useState<string | null>(null);
  const [licensePhotoBackUri, setLicensePhotoBackUri] = useState<string | null>(null);
  const [capturingSide, setCapturingSide] = useState<LicenseSide | null>(null);
  const [notes, setNotes] = useState('');

  const isOtherBase = base === 'Other';
  const effectiveBase = isOtherBase ? otherBase.trim() : base;

  const captureLicense = async (side: LicenseSide, useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', `Allow ${useCamera ? 'camera' : 'photo library'} access to add your license.`);
      return;
    }

    const launch = useCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await launch({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    setCapturingSide(side);
    try {
      const compressed = await compressPhoto(result.assets[0].uri);
      if (side === 'front') setLicensePhotoFrontUri(compressed);
      else setLicensePhotoBackUri(compressed);
    } finally {
      setCapturingSide(null);
    }
  };

  const promptLicenseSource = (side: LicenseSide) => {
    Alert.alert(`Add ${side === 'front' ? 'Front' : 'Back'} of License`, undefined, [
      { text: 'Take Photo', onPress: () => captureLicense(side, true) },
      { text: 'Choose from Library', onPress: () => captureLicense(side, false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmit = () => {
    if (!fullName.trim() || !contact.trim() || !effectiveBase) {
      Alert.alert('Almost there', 'Add your name, a way to reach you, and which base you’re headed to.');
      return;
    }

    const intake: DealIntake = {
      fullName: fullName.trim(),
      contact: contact.trim(),
      base: effectiveBase,
      paymentMethod,
      financingLender: financingLender.trim(),
      financingDownPayment: financingDownPayment.trim(),
      licenseStatus,
      licensePhotoFrontUri,
      licensePhotoBackUri,
      notes: notes.trim(),
    };
    // No WhatsApp handoff here anymore — the "salesperson" you land on next
    // is the AI agent, not a human, so there's nothing to text. The intake
    // itself is what seeds the agent's first message on that screen (see
    // salesperson.tsx), and "Talk to a Human" (WhatsApp) is still there as
    // a real fallback if the agent can't help.
    submitIntake(intake);
    router.replace('/salesperson');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Start Your Deal" subtitle={carLabel} />

      {car && car.images.length > 0 && (
        <View>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
            {car.images.map((uri) => (
              <Image key={uri} source={{ uri }} style={{ width: SCREEN_WIDTH, height: 170 }} contentFit="cover" />
            ))}
          </ScrollView>
          {car.images.length > 1 && (
            <View style={styles.galleryBadge}>
              <Text style={styles.galleryBadgeText}>Swipe for all {car.images.length} photos</Text>
            </View>
          )}
        </View>
      )}

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Text style={styles.intro}>
          A quick heads-up for your salesperson &mdash; cash or financed, which base you&apos;re headed to, and
          where you stand on a license &mdash; so they can start putting your deal together instead of starting
          from scratch.
        </Text>

        <Field label="Your Name">
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Full name"
            placeholderTextColor={Colors.textFaint}
            style={styles.input}
          />
        </Field>

        <Field label="Phone or WhatsApp Number">
          <TextInput
            value={contact}
            onChangeText={setContact}
            placeholder="e.g. +1 555 123 4567"
            placeholderTextColor={Colors.textFaint}
            keyboardType="phone-pad"
            style={styles.input}
          />
        </Field>

        <Field label="Which Base Are You Headed To?">
          <View style={styles.chipRow}>
            {[...usareurBases, 'Other'].map((b) => (
              <Pressable
                key={b}
                onPress={() => setBase(b)}
                style={[styles.chip, base === b && styles.chipActive]}>
                <Text style={[styles.chipLabel, base === b && styles.chipLabelActive]}>{b}</Text>
              </Pressable>
            ))}
          </View>
          {isOtherBase && (
            <TextInput
              value={otherBase}
              onChangeText={setOtherBase}
              placeholder="Which base?"
              placeholderTextColor={Colors.textFaint}
              style={[styles.input, { marginTop: 10 }]}
            />
          )}
        </Field>

        <Field label="How Will You Pay?">
          <View style={styles.segRow}>
            <SegOption label="Cash" active={paymentMethod === 'cash'} onPress={() => setPaymentMethod('cash')} />
            <SegOption
              label="Financing"
              active={paymentMethod === 'financing'}
              onPress={() => setPaymentMethod('financing')}
            />
          </View>
        </Field>

        {paymentMethod === 'financing' && (
          <>
            <Field label="Preferred Lender (optional)">
              <TextInput
                value={financingLender}
                onChangeText={setFinancingLender}
                placeholder="e.g. USAA, Navy Federal, still deciding"
                placeholderTextColor={Colors.textFaint}
                style={styles.input}
              />
            </Field>
            <Field label="Planned Down Payment (optional)">
              <TextInput
                value={financingDownPayment}
                onChangeText={setFinancingDownPayment}
                placeholder="e.g. $2,000"
                placeholderTextColor={Colors.textFaint}
                keyboardType="numbers-and-punctuation"
                style={styles.input}
              />
            </Field>
          </>
        )}

        <Field label="USAREUR Driver's License">
          <View style={styles.segRow}>
            <SegOption label="I Have One" active={licenseStatus === 'have'} onPress={() => setLicenseStatus('have')} />
            <SegOption
              label="Not Yet"
              active={licenseStatus === 'not_yet'}
              onPress={() => setLicenseStatus('not_yet')}
            />
          </View>

          {licenseStatus === 'not_yet' ? (
            <View style={styles.licenseCard}>
              <IdCardIcon />
              <Text style={styles.licenseCardText}>
                You can take the actual exam online before you even land &mdash; not just practice for it. No CAC?
                Family members can request a free sponsored account instead.
              </Text>
              <Pressable style={styles.licenseLinkButton} onPress={() => Linking.openURL(USAREUR_OFFICIAL_JKO_URL)}>
                <Text style={styles.licenseLinkButtonLabel}>Take the Exam Online (JKO)  →</Text>
              </Pressable>
              <Text style={styles.licenseHint}>
                Heads up: your browser may flag this .mil site as &ldquo;not private.&rdquo; That&apos;s normal for
                DoD sites (they use a certificate most phones don&apos;t trust by default) &mdash; it&apos;s safe to
                continue through.
              </Text>
              <Text style={styles.licenseHint}>
                Search course <Text style={styles.licenseHintBold}>USA 007</Text>, complete it, then pass exam{' '}
                <Text style={styles.licenseHintBold}>USA 007B</Text> (85% or higher). Your score is valid 60 days
                &mdash; worth timing this close to your move rather than doing it too early.
              </Text>
              <Text style={styles.licenseHint}>
                On arrival: bring your printed certificate, stateside license, and DoD ID/CAC, plus a $30 fee, to
                the base testing station for a quick vision check and your physical license.
              </Text>
              <Text style={styles.licenseSubLink} onPress={() => Linking.openURL(USAREUR_STUDY_GUIDE_URL)}>
                Want to study the manual first? →
              </Text>
            </View>
          ) : (
            <View style={styles.licenseCard}>
              <Text style={styles.licenseCardText}>
                Scan the front and back now so it&apos;s already on file &mdash; one less thing to bring in later.
              </Text>
              <View style={styles.licenseSideRow}>
                <LicenseSideSlot
                  label="Front"
                  uri={licensePhotoFrontUri}
                  isCapturing={capturingSide === 'front'}
                  onPress={() => promptLicenseSource('front')}
                />
                <LicenseSideSlot
                  label="Back"
                  uri={licensePhotoBackUri}
                  isCapturing={capturingSide === 'back'}
                  onPress={() => promptLicenseSource('back')}
                />
              </View>
              <Text style={styles.licenseHint}>
                Saved in the app for {salesperson.name.split(' ')[0]} to view &mdash; WhatsApp can&apos;t attach it
                automatically yet, so mention it and he&apos;ll pull it up.
              </Text>
            </View>
          )}
        </Field>

        <Field label="Anything Else Marcus Should Know? (optional)">
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Trade-in, specific options, timeline..."
            placeholderTextColor={Colors.textFaint}
            multiline
            numberOfLines={3}
            style={[styles.input, styles.notesInput]}
          />
        </Field>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Submit for a Salesperson  →" onPress={handleSubmit} />
        <Text style={styles.footerHint}>Opens WhatsApp with everything above filled in for you.</Text>
      </View>
    </SafeAreaView>
  );
}

function LicenseSideSlot({
  label,
  uri,
  isCapturing,
  onPress,
}: {
  label: string;
  uri: string | null;
  isCapturing: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.licenseSideSlot} disabled={isCapturing} onPress={onPress}>
      {uri ? (
        <>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={styles.licenseThumbBadge}>
            <CheckCircleIcon />
          </View>
        </>
      ) : (
        <>
          <CameraIcon color={Colors.textFaint} strokeWidth={2} />
          <Text style={styles.licenseSideSlotLabel}>{isCapturing ? 'Saving...' : `Scan ${label}`}</Text>
        </>
      )}
    </Pressable>
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

function SegOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segOption, active && styles.segOptionActive]}>
      <Text style={[styles.segLabel, active && styles.segLabelActive]}>{label}</Text>
    </Pressable>
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
  notesInput: { height: 84, paddingTop: 12, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  chipLabel: { fontFamily: Fonts.bodySemibold, fontSize: 13, color: Colors.textMuted },
  chipLabelActive: { color: '#fff' },
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
  licenseCard: {
    marginTop: 10,
    backgroundColor: Colors.navyTint,
    borderRadius: Radius.lg,
    padding: 14,
    alignItems: 'flex-start',
    gap: 10,
  },
  licenseCardText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.navy, lineHeight: 19 },
  licenseLinkButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    backgroundColor: Colors.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  licenseLinkButtonLabel: { fontFamily: Fonts.bodyBold, fontSize: 13.5, color: '#fff' },
  licenseSubLink: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 12.5,
    color: Colors.navy,
    textDecorationLine: 'underline',
    lineHeight: 18,
  },
  licenseSideRow: { flexDirection: 'row', gap: 10 },
  licenseSideSlot: {
    width: 130,
    height: 84,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C9CDD9',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  licenseSideSlotLabel: { fontFamily: Fonts.bodySemibold, fontSize: 12, color: Colors.textMuted },
  licenseThumbBadge: { position: 'absolute', top: 4, right: 4 },
  licenseHint: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.navy, opacity: 0.8, lineHeight: 16 },
  licenseHintBold: { fontFamily: Fonts.bodyBold, opacity: 1 },
  gallery: { backgroundColor: Colors.navyTint },
  galleryBadge: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(39,51,104,0.85)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  galleryBadgeText: { fontFamily: Fonts.bodySemibold, fontSize: 11.5, color: '#fff' },
  footer: { paddingHorizontal: Spacing.xxl, paddingTop: 8, paddingBottom: 8 },
  footerHint: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textMuted, textAlign: 'center', marginTop: 10 },
});

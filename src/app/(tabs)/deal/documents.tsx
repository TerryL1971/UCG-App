import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DocumentIcon, IdCardIcon, MapPinIcon, ShieldIcon, UploadIcon } from '@/components/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatusChip } from '@/components/ui/chip';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { dealDocuments, salesperson, type DealDocument } from '@/constants/mock-data';
import { compressPhoto } from '@/lib/image';

const iconFor: Record<DealDocument['icon'], (color: string) => React.ReactNode> = {
  id: (c) => <IdCardIcon color={c} />,
  insurance: (c) => <ShieldIcon color={c} />,
  income: (c) => <DocumentIcon color={c} />,
  residence: (c) => <MapPinIcon color={c} />,
};

const statusLabel: Record<DealDocument['status'], string> = {
  needed: 'Needed',
  uploaded: 'Uploaded',
  approved: 'Approved',
};

/** Local-only — every mock document starts "approved" (see dealDocuments'
 * comment in mock-data.ts), which was a real bug: tapping one only ever
 * offered to "download" it (also not connected), with no way to correct
 * a wrong upload once a document had any status other than "needed."
 * `uri` is the locally-captured replacement, if any — real capture via
 * expo-image-picker, same pattern as Sell It Back's photos and the
 * license scan in deal-intake.tsx, still no real file storage backend. */
type DocumentState = DealDocument & { uri?: string };

function DocRow({
  doc,
  isReplacing,
  onReplace,
}: {
  doc: DocumentState;
  isReplacing: boolean;
  onReplace: () => void;
}) {
  return (
    <Pressable style={[styles.row, Shadow.card]} onPress={onReplace} disabled={isReplacing}>
      <View style={styles.rowIcon}>
        {doc.uri ? (
          <Image source={{ uri: doc.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          iconFor[doc.icon](Colors.navy)
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{doc.name}</Text>
        <View style={{ marginTop: 5 }}>
          <StatusChip status={doc.status} label={isReplacing ? 'Saving…' : statusLabel[doc.status]} />
        </View>
      </View>
      <View style={[styles.action, { backgroundColor: Colors.red }]}>
        <UploadIcon color="#fff" />
      </View>
    </Pressable>
  );
}

export default function DocumentsScreen() {
  // Local-only simulation — there's no real file storage backend yet, but
  // every document can now actually be replaced regardless of its current
  // status, not just ones still "needed." That was the real bug: with
  // dealDocuments defaulting every document to "approved," there was no
  // way to fix a wrong upload at all before this.
  const [documents, setDocuments] = useState<DocumentState[]>(dealDocuments);
  const [replacingId, setReplacingId] = useState<string | null>(null);

  const captureFor = async (id: string, useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', `Allow ${useCamera ? 'camera' : 'photo library'} access to upload a document.`);
      return;
    }

    const launch = useCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await launch({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    setReplacingId(id);
    try {
      const compressed = await compressPhoto(result.assets[0].uri);
      // A fresh upload goes back to "uploaded," not "approved" — a real
      // salesperson/backend would need to actually review the new file,
      // so keeping it marked "approved" after replacing it would be
      // dishonest about what's actually happened.
      setDocuments((docs) => docs.map((d) => (d.id === id ? { ...d, status: 'uploaded', uri: compressed } : d)));
    } finally {
      setReplacingId(null);
    }
  };

  const promptReplace = (doc: DocumentState) => {
    Alert.alert(doc.status === 'needed' ? `Upload ${doc.name}` : `Replace ${doc.name}`, undefined, [
      { text: 'Take Photo', onPress: () => captureFor(doc.id, true) },
      { text: 'Choose from Library', onPress: () => captureFor(doc.id, false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader title="Documents" subtitle="For your financing application" />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list}>
        {documents.map((doc) => (
          <DocRow key={doc.id} doc={doc} isReplacing={replacingId === doc.id} onReplace={() => promptReplace(doc)} />
        ))}
        <Text style={styles.hint}>
          Tap any document — including an already-approved one — to upload a replacement. We&apos;ll notify{' '}
          {salesperson.name.split(' ')[0]} the moment it&apos;s ready for review.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  headerWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border },
  list: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: 40 },
  row: {
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: Colors.navyTint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rowName: { fontFamily: Fonts.bodyBold, fontSize: 14.5, color: Colors.text },
  action: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    textAlign: 'center',
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
    marginTop: 4,
    paddingHorizontal: 10,
  },
});

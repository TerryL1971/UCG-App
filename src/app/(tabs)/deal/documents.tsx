import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DocumentIcon, DownloadIcon, IdCardIcon, MapPinIcon, PlusIcon, ShieldIcon, UploadIcon } from '@/components/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatusChip } from '@/components/ui/chip';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { dealDocuments, salesperson, type DealDocument } from '@/constants/mock-data';

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

function DocRow({ doc, onUpload }: { doc: DealDocument; onUpload: () => void }) {
  const isApproved = doc.status === 'approved';
  const isUploaded = doc.status === 'uploaded';

  const handlePress = () => {
    if (doc.status === 'needed') {
      onUpload();
      return;
    }
    // No real file storage backend yet — be upfront about it rather than
    // silently doing nothing when someone taps download.
    Alert.alert('Not connected yet', "Downloading isn't wired to real document storage yet.");
  };

  return (
    <View style={[styles.row, Shadow.card]}>
      <View style={styles.rowIcon}>{iconFor[doc.icon](Colors.navy)}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{doc.name}</Text>
        <View style={{ marginTop: 5 }}>
          <StatusChip status={doc.status} label={statusLabel[doc.status]} />
        </View>
      </View>
      <Pressable
        onPress={handlePress}
        style={[
          styles.action,
          { backgroundColor: isApproved ? Colors.greenTint : isUploaded ? Colors.navyTint : Colors.red },
        ]}>
        {doc.status === 'needed' ? (
          <UploadIcon color="#fff" />
        ) : (
          <DownloadIcon color={isApproved ? Colors.green : Colors.navy} />
        )}
      </Pressable>
    </View>
  );
}

export default function DocumentsScreen() {
  // Local-only simulation of an upload flipping status — there's no camera
  // roll or file storage wired up yet, but this at least makes tapping
  // "Upload" feel like it did something instead of being a dead tap.
  const [documents, setDocuments] = useState<DealDocument[]>(dealDocuments);

  const markUploaded = (id: string) => {
    setDocuments((docs) => docs.map((d) => (d.id === id ? { ...d, status: 'uploaded' } : d)));
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader title="Documents" subtitle="For your financing application" />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list}>
        {documents.map((doc) => (
          <DocRow key={doc.id} doc={doc} onUpload={() => markUploaded(doc.id)} />
        ))}
        <Text style={styles.hint}>
          Tap to upload — we&apos;ll notify {salesperson.name.split(' ')[0]} the moment it&apos;s ready for
          review.
        </Text>
      </ScrollView>

      <Pressable
        style={[styles.fab, Shadow.button]}
        onPress={() =>
          Alert.alert('Not connected yet', "Camera/photo upload isn't wired to a real backend yet.")
        }>
        <PlusIcon />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  headerWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border },
  list: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: 100 },
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

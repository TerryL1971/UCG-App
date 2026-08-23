import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DocumentIcon, DownloadIcon, IdCardIcon, MapPinIcon, PlusIcon, ShieldIcon, UploadIcon } from '@/components/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatusChip } from '@/components/ui/chip';
import { Colors, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { dealDocuments, type DealDocument } from '@/constants/mock-data';

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

function DocRow({ doc }: { doc: DealDocument }) {
  const isApproved = doc.status === 'approved';
  const isUploaded = doc.status === 'uploaded';
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
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader title="Documents" subtitle="For your financing application" />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {dealDocuments.map((doc) => (
          <DocRow key={doc.id} doc={doc} />
        ))}
        <Text style={styles.hint}>
          Tap to upload — we&apos;ll notify {'Marcus'} the moment it&apos;s ready for review.
        </Text>
      </ScrollView>

      <Pressable style={[styles.fab, Shadow.button]}>
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

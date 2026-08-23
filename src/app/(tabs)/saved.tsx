import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeartIcon } from '@/components/icons';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export default function SavedScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navbar}>
        <Text style={styles.title}>Saved Cars</Text>
      </View>
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <HeartIcon size={28} color={Colors.red} strokeWidth={2} />
        </View>
        <Text style={styles.emptyTitle}>Nothing saved yet</Text>
        <Text style={styles.emptyBody}>Tap the heart on any car in Browse to keep it here.</Text>
      </View>
    </SafeAreaView>
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
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.redTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.text },
  emptyBody: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted, textAlign: 'center' },
});

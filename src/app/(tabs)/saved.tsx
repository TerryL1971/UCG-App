import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CarCard } from '@/components/car-card';
import { HeartIcon } from '@/components/icons';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useSaved } from '@/lib/saved-context';

export default function SavedScreen() {
  const { savedCars } = useSaved();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navbar}>
        <Text style={styles.title}>Saved Cars</Text>
      </View>

      {savedCars.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <HeartIcon size={28} color={Colors.red} strokeWidth={2} />
          </View>
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptyBody}>Tap the heart on any car in Browse to keep it here.</Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={savedCars}
          keyExtractor={(c) => c.slug}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.lg }} />}
          renderItem={({ item }) => <CarCard car={item} />}
        />
      )}
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
  list: {
    padding: Spacing.xl,
  },
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

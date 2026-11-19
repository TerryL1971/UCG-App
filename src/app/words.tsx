import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { GLOSSARY } from '@/constants/glossary';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

/** Words You'll Hear: the whole glossary (constants/glossary.ts). */
export default function WordsScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title="Words You'll Hear" subtitle="Army, customs and German words, in plain English" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.group}>
          {GLOSSARY.map((t, i) => (
            <View key={t.term} style={[styles.row, i === GLOSSARY.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={styles.term}>{t.term}</Text>
              <Text style={styles.meaning}>{t.meaning}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  group: { backgroundColor: '#fff', borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  row: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 3 },
  term: { fontFamily: Fonts.bodyBold, fontSize: 14.5, color: Colors.text },
  meaning: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted, lineHeight: 19 },
});

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { termsIn } from '@/constants/glossary';
import { Colors, Fonts, Radius } from '@/constants/theme';

/**
 * "New words: VRO, TT Doc" under a step, which opens to a one-line plain
 * English meaning for each (constants/glossary.ts). The term names are in
 * the closed label, so the customer sees right away that help is there.
 */
export function WordsToKnow({ texts }: { texts: (string | null | undefined)[] }) {
  const [open, setOpen] = useState(false);
  const terms = termsIn(...texts);
  if (terms.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => setOpen((o) => !o)} hitSlop={6} style={styles.head}>
        <Text style={styles.headText} numberOfLines={open ? undefined : 1}>
          <Text style={styles.headStrong}>What do these words mean? </Text>
          {open ? '' : terms.map((t) => t.term).join(', ')}
        </Text>
        <Text style={styles.toggle}>{open ? '−' : '+'}</Text>
      </Pressable>
      {open && (
        <View style={{ gap: 8, marginTop: 8 }}>
          {terms.map((t) => (
            <Text key={t.term} style={styles.line}>
              <Text style={styles.term}>{t.term}: </Text>
              {t.meaning}
            </Text>
          ))}
          <Text style={styles.all} onPress={() => router.push('/words')}>
            All the words you’ll hear
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12, backgroundColor: Colors.bg, borderRadius: Radius.md, padding: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headText: { flex: 1, fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted },
  headStrong: { fontFamily: Fonts.bodyBold, color: Colors.navy },
  toggle: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.navy },
  line: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.text, lineHeight: 18 },
  term: { fontFamily: Fonts.bodyBold },
  all: { fontFamily: Fonts.bodySemibold, fontSize: 12.5, color: Colors.navy, textDecorationLine: 'underline' },
});

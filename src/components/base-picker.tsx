import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BASES } from '@/constants/bases';
import { Colors, Fonts, Radius } from '@/constants/theme';

/** Where the customer is stationed — one tap per base. */
export function BasePicker({ value, onChange, error }: { value: string | null; onChange: (id: string) => void; error?: string }) {
  return (
    <View>
      <View style={styles.grid}>
        {BASES.map((b) => {
          const active = b.id === value;
          return (
            <Pressable key={b.id} onPress={() => onChange(b.id)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.label, active && styles.labelActive]}>{b.name}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  label: { fontFamily: Fonts.bodySemibold, fontSize: 13.5, color: Colors.text },
  labelActive: { color: '#fff' },
  error: { marginTop: 6, fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.red },
});

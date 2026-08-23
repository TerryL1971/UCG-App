import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius } from '@/constants/theme';

export function FilterChip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.red,
    borderColor: Colors.red,
  },
  label: {
    fontFamily: Fonts.bodySemibold,
    fontSize: 13.5,
    color: Colors.text,
  },
  labelActive: {
    color: '#fff',
  },
});

export function StatusChip({ status, label }: { status: 'needed' | 'uploaded' | 'approved'; label: string }) {
  const palette = {
    needed: { bg: Colors.amberTint, fg: Colors.amber },
    uploaded: { bg: Colors.navyTint, fg: Colors.navy },
    approved: { bg: Colors.greenTint, fg: Colors.green },
  }[status];
  return (
    <View style={[chipStyles.base, { backgroundColor: palette.bg }]}>
      <Text style={[chipStyles.label, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
  },
});

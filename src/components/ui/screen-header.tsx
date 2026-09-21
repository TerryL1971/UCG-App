import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ArrowLeftIcon } from '@/components/icons';
import { Colors, Fonts, Radius } from '@/constants/theme';

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  badge,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** Optional accessory next to the title — a "✓ Submitted"-style pill,
   * say, when a screen represents a step in a larger deal that's already
   * complete (Terry, 2026-09-21: a completed step "should have a check
   * mark or something that lets the customer know this step is
   * complete"). Absent by default — every existing caller renders
   * exactly as before. */
  badge?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onBack ?? (() => router.back())}
        hitSlop={8}
        style={styles.backButton}>
        <ArrowLeftIcon />
      </Pressable>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {badge}
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 19,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
});

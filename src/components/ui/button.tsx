import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Fonts, Radius, Shadow } from '@/constants/theme';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  /** Optional leading icon, e.g. `<LockIcon />` — rendered to the left of
   * the label as one centered group. Omitted entirely by default so every
   * existing call site is unaffected. */
  icon?: ReactNode;
}

export function Button({ label, onPress, variant = 'primary', style, disabled, icon }: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        isPrimary && Shadow.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <View style={styles.content}>
        {icon}
        <Text
          numberOfLines={2}
          style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelSecondary]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    // minHeight (not a fixed height) so a long label that wraps grows the
    // button instead of being clipped inside a rigid 54px box — which was
    // the "padding inside the buttons seems off" report. paddingHorizontal
    // keeps text off the rounded corners.
    minHeight: 54,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  primary: {
    backgroundColor: Colors.red,
  },
  secondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Colors.navy,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 19,
    lineHeight: 22,
    letterSpacing: 0.3,
    textAlign: 'center',
    // Barlow Condensed renders with extra space above the glyphs on
    // Android (includeFontPadding), which reads as the label sitting too
    // low / uneven padding inside the button. Off = optically centered.
    includeFontPadding: false,
    // Lets a long label wrap/shrink to the space left over once a leading
    // icon and its gap take some of the row, instead of overflowing it.
    flexShrink: 1,
  },
  labelPrimary: {
    color: '#fff',
  },
  labelSecondary: {
    color: Colors.navy,
  },
});

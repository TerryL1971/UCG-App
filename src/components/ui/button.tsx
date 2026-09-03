import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Fonts, Radius, Shadow } from '@/constants/theme';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', style, disabled }: ButtonProps) {
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
      <Text
        numberOfLines={2}
        style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelSecondary]}>
        {label}
      </Text>
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
  },
  labelPrimary: {
    color: '#fff',
  },
  labelSecondary: {
    color: Colors.navy,
  },
});

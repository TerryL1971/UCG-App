import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Fonts, Radius, Shadow } from '@/constants/theme';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', style }: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        isPrimary && Shadow.button,
        pressed && styles.pressed,
        style,
      ]}>
      <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelSecondary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
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
  label: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 19,
    letterSpacing: 0.3,
  },
  labelPrimary: {
    color: '#fff',
  },
  labelSecondary: {
    color: Colors.navy,
  },
});

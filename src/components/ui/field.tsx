import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Colors, Fonts, Radius } from '@/constants/theme';

interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Field({ label, error, style, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={Colors.textFaint}
        style={[styles.input, error && styles.inputError, style]}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12.5,
    color: Colors.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  input: {
    marginTop: 7,
    height: 50,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    fontFamily: Fonts.body,
    fontSize: 14.5,
    color: Colors.text,
  },
  inputError: {
    borderColor: Colors.red,
  },
  error: {
    marginTop: 5,
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.red,
  },
});

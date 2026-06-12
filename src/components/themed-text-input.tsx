import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Einheitliches Eingabefeld: gleiche Grautöne wie Karten/Buttons statt
 * durchscheinendem Seitenhintergrund.
 */
export function ThemedTextInput({ style, ...rest }: TextInputProps) {
  const theme = useTheme();

  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      {...rest}
      style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSelected }, style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 44,
  },
});

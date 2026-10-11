import React from 'react';
import { View, TextInput, TextInputProps, StyleSheet, TouchableOpacity } from 'react-native';
import { Typography } from './Typography';
import { theme } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  hint?: string;
}

export const TextField: React.FC<TextFieldProps> = ({ label, hint, style, multiline, ...props }) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];

  return (
    <View style={styles.wrapper}>
      {!!label && <Typography variant="bodySm" weight="semibold" style={styles.label}>{label}</Typography>}
      <TextInput
        placeholderTextColor={activeTheme.textSecondary}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.multiline,
          { color: activeTheme.text, borderColor: activeTheme.border, backgroundColor: activeTheme.surface },
          style,
        ]}
        {...props}
      />
      {!!hint && <Typography variant="caption" color={activeTheme.textSecondary} style={styles.hint}>{hint}</Typography>}
    </View>
  );
};

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export const Chip: React.FC<ChipProps> = ({ label, selected, onPress }) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? activeTheme.primary : activeTheme.surfaceVariant }]}
      accessibilityState={{ selected }}
    >
      <Typography variant="bodySm" weight="semibold" style={{ color: selected ? '#fff' : activeTheme.textSecondary }}>
        {label}
      </Typography>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  hint: {
    marginTop: spacing.xs,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
});

import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { theme } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CardProps extends ViewProps {
  variant?: 'elevated' | 'outlined' | 'flat';
  padding?: keyof typeof spacing;
}

export const Card: React.FC<CardProps> = ({
  variant = 'elevated',
  padding = 'md',
  style,
  children,
  ...props
}) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];

  const getVariantStyle = () => {
    switch (variant) {
      case 'elevated': return {
        backgroundColor: activeTheme.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
      };
      case 'outlined': return {
        backgroundColor: 'transparent' as const,
        borderWidth: 1,
        borderColor: activeTheme.border,
      };
      case 'flat': return {
        backgroundColor: activeTheme.surfaceVariant,
      };
      default: return {};
    }
  };

  return (
    <View 
      style={[
        styles.base,
        getVariantStyle(),
        { padding: spacing[padding] },
        style
      ] as any} 
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
});

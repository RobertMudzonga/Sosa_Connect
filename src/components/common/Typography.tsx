import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { theme } from '../../theme/colors';
import { typography } from '../../theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface AppTextProps extends TextProps {
  variant?: 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodySm' | 'caption';
  weight?: 'light' | 'regular' | 'medium' | 'semibold' | 'bold';
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export const Typography: React.FC<AppTextProps> = ({
  variant = 'body',
  weight = 'regular',
  color,
  align = 'left',
  style,
  ...props
}) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];

  const variantStyles = styles[variant];
  const weightStyle = { fontWeight: typography.weights[weight] as any };
  const customStyle = {
    color: color || activeTheme.text,
    textAlign: align,
  };

  return <Text style={[variantStyles, weightStyle, customStyle, style]} {...props} />;
};

const styles = StyleSheet.create({
  display: { fontSize: typography.sizes.display, lineHeight: 48 },
  h1: { fontSize: typography.sizes.xxxl, lineHeight: 40 },
  h2: { fontSize: typography.sizes.xxl, lineHeight: 32 },
  h3: { fontSize: typography.sizes.xl, lineHeight: 28 },
  body: { fontSize: typography.sizes.md, lineHeight: 24 },
  bodySm: { fontSize: typography.sizes.sm, lineHeight: 20 },
  caption: { fontSize: typography.sizes.xs, lineHeight: 16 },
});

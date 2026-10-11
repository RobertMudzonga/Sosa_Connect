import React from 'react';
import { 
  TouchableOpacity, 
  TouchableOpacityProps, 
  StyleSheet, 
  ActivityIndicator, 
  View,
  Platform
} from 'react-native';
import { theme } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { Typography } from './Typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  style,
  disabled,
  onPress,
  ...props
}) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];

  const getVariantStyle = () => {
    switch (variant) {
      case 'primary': return { backgroundColor: activeTheme.primary };
      case 'secondary': return { backgroundColor: activeTheme.surfaceVariant };
      case 'outline': return {
        backgroundColor: 'transparent' as const,
        borderWidth: 1,
        borderColor: activeTheme.primary,
      };
      case 'ghost': return { backgroundColor: 'transparent' as const };
      case 'danger': return { backgroundColor: activeTheme.error };
      default: return {};
    }
  };

  const buttonStyle = [
    styles.base,
    styles[size],
    getVariantStyle(),
    disabled && styles.disabled,
    style,
  ];

  const textVariant = size === 'sm' ? 'bodySm' : 'body';
  const textColor = variant === 'outline' || variant === 'ghost' 
    ? activeTheme.primary 
    : variant === 'danger' ? '#fff' : activeTheme.background;

  const handlePress = (event?: any) => {
    if (!disabled && !loading && onPress) {
      onPress(event);
    }
  };

  // For web, use a button element; for native, use TouchableOpacity
  if (Platform.OS === 'web') {
    const variantBg = variant === 'primary' ? activeTheme.primary 
      : variant === 'secondary' ? activeTheme.surfaceVariant
      : variant === 'danger' ? activeTheme.error : 'transparent';
    
    const variantText = variant === 'outline' || variant === 'ghost' 
      ? activeTheme.primary 
      : variant === 'danger' ? '#fff' : activeTheme.background;

    return (
      <button
        type="button"
        onClick={handlePress}
        disabled={disabled || loading}
        style={{
          borderRadius: radius.md,
          padding: size === 'sm' ? '6px 12px' : size === 'md' ? '10px 16px' : '12px 20px',
          border: variant === 'outline' ? `1px solid ${activeTheme.primary}` : 'none',
          backgroundColor: variantBg,
          color: variantText,
          fontSize: size === 'sm' ? '14px' : '16px',
          fontWeight: 600,
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          opacity: disabled || loading ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          ...(StyleSheet.flatten(style) as object),
        } as React.CSSProperties}
      >
        {icon}
        {loading ? '…' : label}
      </button>
    );
  }

  return (
    <TouchableOpacity 
      style={buttonStyle as any} 
      disabled={disabled || loading} 
      activeOpacity={0.8}
      onPress={handlePress}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Typography 
            variant={textVariant} 
            weight="semibold" 
            style={{ color: textColor }}
          >
            {label}
          </Typography>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  sm: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  md: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  disabled: { opacity: 0.5 },
});

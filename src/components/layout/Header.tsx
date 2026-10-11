import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Typography } from '../common/Typography';
import { theme } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { useAppStore } from '../../store/app-store';
import { useAuthStore } from '../../store/auth-store';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const Header: React.FC = () => {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const { mode, toggleMode } = useAppStore();
  const { user } = useAuthStore();

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <View style={styles.topRow}>
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: activeTheme.primary }]}>
            <Typography variant="h3" weight="bold" style={{ color: '#fff' }}>K</Typography>
          </View>
          <View>
            <Typography variant="h3" weight="bold">KUWANA</Typography>
            <Typography variant="caption" color={activeTheme.textSecondary} style={{ marginTop: -4 }}>Find What Matters</Typography>
          </View>
        </View>
        <TouchableOpacity style={[styles.profilePic, { backgroundColor: activeTheme.surfaceVariant }]}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <Typography variant="body" weight="bold" color={activeTheme.primary}>
              {user?.fullName?.charAt(0) || '?'}
            </Typography>
          )}
          <View style={[styles.onlineIndicator, { borderColor: activeTheme.background }]} />
        </TouchableOpacity>
      </View>

      <View style={styles.greetingContainer}>
        <Typography variant="h2" weight="regular">
          {getTimeGreeting()}, <Typography variant="h2" weight="bold" color={activeTheme.primary}>{user?.fullName?.split(' ')[0] || 'there'}</Typography>
        </Typography>
      </View>

      <View style={[styles.modeToggle, { backgroundColor: activeTheme.surfaceVariant }]}>
        <TouchableOpacity 
          style={[styles.modeButton, mode === 'buyer' && { backgroundColor: activeTheme.primary }]}
          onPress={() => mode !== 'buyer' && toggleMode()}
        >
          <Typography 
            variant="bodySm" 
            weight="semibold" 
            style={{ color: mode === 'buyer' ? '#fff' : activeTheme.textSecondary }}
          >
            Buyer Mode
          </Typography>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.modeButton, mode === 'seller' && { backgroundColor: activeTheme.primary }]}
          onPress={() => mode !== 'seller' && toggleMode()}
        >
          <Typography 
            variant="bodySm" 
            weight="semibold" 
            style={{ color: mode === 'seller' ? '#fff' : activeTheme.textSecondary }}
          >
            Seller Mode
          </Typography>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: radius.full,
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
  },
  greetingContainer: {
    marginBottom: spacing.lg,
  },
  modeToggle: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.md,
    gap: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
});

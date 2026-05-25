import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Card } from '@/src/components/common/Card';
import { Button } from '@/src/components/common/Button';
import { theme, palette } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/src/store/auth-store';
import { useAppStore } from '@/src/store/app-store';
import { User, Bell, Shield, LogOut, ChevronRight, AlertCircle, ShoppingBag, CreditCard, Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { mode, toggleMode } = useAppStore();

  const MENU_ITEMS = [
    { id: 'orders', label: 'My Orders', icon: ShoppingBag, route: '/orders', requiresAuth: true },
    { id: 'payments', label: 'Payment Methods', icon: CreditCard, route: '/payments', requiresAuth: true },
    { id: 'notifications', label: 'Notifications', icon: Bell, right: <Switch value={true} />, route: '/notifications', requiresAuth: true },
    { id: 'security', label: 'Privacy & Security', icon: Shield, route: '/security', requiresAuth: true },
  ];

  if (user?.role === 'ADMIN') {
    MENU_ITEMS.unshift({ id: 'admin', label: 'Admin Dashboard', icon: Settings, route: '/admin' });
  }

  const goToLogin = () => {
    try {
      console.log('[goToLogin] Attempting navigation to /(auth)/login');
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('[goToLogin] Navigation error:', error);
      // Fallback to href-based navigation
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = '/(auth)/login';
      }
    }
  };

  const handleMenuItemPress = (item: any) => {
    if (item.requiresAuth && !user) {
      goToLogin();
      return;
    }
    if (item.route) {
      router.push(item.route);
    }
  };

  const handleLogout = () => {
    console.log('[Logout] Clearing auth and navigating to login...');
    clearAuth();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <View style={styles.header}>
        <View style={[styles.avatarBox, { backgroundColor: activeTheme.surfaceVariant }]}>
          <Typography variant="h1" weight="bold" color={activeTheme.primary}>
            {user?.fullName?.charAt(0) || 'A'}
          </Typography>
        </View>
        <Typography variant="h2" weight="bold" style={{ marginTop: spacing.md }}>
          {user?.fullName || 'Guest User'}
        </Typography>
        <Typography variant="bodySm" color={activeTheme.textSecondary}>
          {user?.email || 'Sign in to access your profile'}
        </Typography>
        
        <View style={styles.badgeRow}>
          <View style={[styles.roleBadge, { backgroundColor: activeTheme.primary + '20' }]}>
            <Typography variant="caption" weight="bold" color={activeTheme.primary}>
              {user ? 'VERIFIED USER' : 'GUEST'}
            </Typography>
          </View>
          {user?.role === 'PROVIDER' && (
            <View style={[styles.roleBadge, { backgroundColor: palette.success + '20' }]}>
              <Typography variant="caption" weight="bold" color={palette.success}>TOP SELLER</Typography>
            </View>
          )}
        </View>

        {!user && (
          <Button 
            label="Sign In Now" 
            variant="primary" 
            size="sm"
            onPress={goToLogin}
            style={{ marginTop: 20 }}
          />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card variant="flat" style={styles.modeCard}>
          <View style={styles.modeInfo}>
            <Typography variant="body" weight="bold">Switch to {mode === 'buyer' ? 'Seller' : 'Buyer'} Mode</Typography>
            <Typography variant="caption" color={activeTheme.textSecondary}>
              {mode === 'buyer' ? 'Manage your listings and orders' : 'Discover products and services'}
            </Typography>
          </View>
          <Switch value={mode === 'seller'} onValueChange={toggleMode} />
        </Card>

        {mode === 'seller' && (
          <Card variant="outlined" style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <AlertCircle size={18} color={palette.warning} />
              <Typography variant="bodySm" weight="bold" color={palette.warning}>Listing Integrity</Typography>
            </View>
            <Typography variant="caption" color={activeTheme.textSecondary} style={{ marginTop: 4 }}>
              You have 0 strikes. Maintain high-quality listings to keep your verified status.
            </Typography>
          </Card>
        )}

        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity 
              key={item.id} 
              style={[
                styles.menuItem, 
                { borderBottomWidth: index === MENU_ITEMS.length - 1 ? 0 : 1, borderBottomColor: activeTheme.border }
              ]}
              onPress={() => handleMenuItemPress(item)}
            >
              <View style={styles.menuLeft}>
                <item.icon size={20} color={activeTheme.textSecondary} />
                <Typography variant="body" style={{ marginLeft: spacing.md }}>{item.label}</Typography>
              </View>
              {item.right || <ChevronRight size={20} color={activeTheme.border} />}
            </TouchableOpacity>
          ))}
        </View>

        <Button 
          label="Log Out" 
          variant="outline" 
          onPress={handleLogout} 
          style={styles.logoutBtn}
          icon={<LogOut size={18} color={activeTheme.primary} />}
        />
        
        <Typography variant="caption" color={activeTheme.textSecondary} align="center" style={{ marginTop: 24 }}>
          Kuwana v1.0.0
        </Typography>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 24,
  },
  avatarBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  modeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  modeInfo: {
    flex: 1,
  },
  alertCard: {
    padding: spacing.md,
    borderColor: palette.warning + '50',
    marginBottom: spacing.md,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuSection: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutBtn: {
    marginTop: spacing.xl,
  }
});

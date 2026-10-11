import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Card } from '@/src/components/common/Card';
import { theme, palette } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/src/store/auth-store';
import { api } from '@/src/services/api';
import { notify } from '@/src/utils/notify';
import { getErrorMessage } from '@/src/utils/format';
import { Mail, Lock, LogIn, Shield, Store, User as UserIcon } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (overrideEmail?: string, overridePass?: string) => {
    const finalEmail = overrideEmail || email;
    const finalPass = overridePass || password;

    if (!finalEmail || !finalPass) {
      notify('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: finalEmail.trim().toLowerCase(),
        password: finalPass,
      });
      const { accessToken, refreshToken, user } = data.data;
      setAuth(accessToken, refreshToken, user);
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      notify('Login Failed', getErrorMessage(error, 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  };

  // Seeded demo accounts — development builds only, never shipped to users
  const QUICK_LOGINS = !__DEV__ ? [] : [
    { label: 'Admin Account', email: 'admin@sosaconnect.zw', pass: 'Admin@Sosa2024!', icon: Shield, color: palette.primary[600] },
    { label: 'Seller Account', email: 'emmanuel.k@example.zw', pass: 'Provider@1234!', icon: Store, color: palette.secondary[600] },
    { label: 'Buyer Account', email: 'amara.moyo@example.zw', pass: 'User@1234!', icon: UserIcon, color: palette.neutral[600] },
  ];

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: activeTheme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={[styles.logoBox, { backgroundColor: activeTheme.primary }]}>
            <Typography variant="h1" weight="bold" style={{ color: '#fff' }}>K</Typography>
          </View>
          <Typography variant="h1" weight="bold" style={styles.title}>KUWANA</Typography>
          <Typography variant="body" color={activeTheme.textSecondary}>Find What Matters</Typography>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Mail size={20} color={activeTheme.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Email Address"
              placeholderTextColor={activeTheme.textSecondary}
              style={[styles.input, { color: activeTheme.text, borderColor: activeTheme.border }]}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color={activeTheme.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Password"
              placeholderTextColor={activeTheme.textSecondary}
              style={[styles.input, { color: activeTheme.text, borderColor: activeTheme.border }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Typography
            variant="bodySm"
            weight="semibold"
            color={activeTheme.primary}
            align="right"
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            Forgot password?
          </Typography>

          <Button 
            label="Log In" 
            variant="primary" 
            onPress={() => handleLogin()} 
            loading={loading}
            style={styles.loginBtn}
          />

          <View style={styles.signupRow}>
            <Typography variant="bodySm" color={activeTheme.textSecondary}>New to Kuwana? </Typography>
            <Typography variant="bodySm" weight="bold" color={activeTheme.primary} onPress={() => router.push('/(auth)/register')}>
              Create an account
            </Typography>
          </View>
        </View>

        {QUICK_LOGINS.length > 0 && <>
        <View style={styles.dividerRow}>
          <View style={[styles.line, { backgroundColor: activeTheme.border }]} />
          <Typography variant="caption" color={activeTheme.textSecondary} style={{ marginHorizontal: 12 }}>OR QUICK LOGIN</Typography>
          <View style={[styles.line, { backgroundColor: activeTheme.border }]} />
        </View>

        <View style={styles.quickGrid}>
          {QUICK_LOGINS.map((item) => (
            <TouchableOpacity 
              key={item.email} 
              style={[styles.quickCard, { backgroundColor: activeTheme.surfaceVariant }]}
              onPress={() => handleLogin(item.email, item.pass)}
            >
              <View style={[styles.quickIcon, { backgroundColor: item.color }]}>
                <item.icon size={20} color="#fff" />
              </View>
              <Typography variant="caption" weight="bold">{item.label}</Typography>
            </TouchableOpacity>
          ))}
        </View>
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: 100,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    letterSpacing: 2,
  },
  form: {
    gap: spacing.md,
  },
  inputContainer: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 18,
    zIndex: 1,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingLeft: 48,
    paddingRight: 16,
    fontSize: 16,
  },
  loginBtn: {
    marginTop: spacing.sm,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  line: {
    flex: 1,
    height: 1,
  },
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  quickCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    gap: 8,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

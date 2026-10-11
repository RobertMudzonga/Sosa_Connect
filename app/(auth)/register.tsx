import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { TextField } from '@/src/components/common/TextField';
import { theme } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/src/store/auth-store';
import { api } from '@/src/services/api';
import { notify } from '@/src/utils/notify';
import { getErrorMessage } from '@/src/utils/format';
import { getPasswordProblem, PASSWORD_HINT } from '@/src/utils/password';

export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const setAuth = useAuthStore((s) => s.setAuth);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      notify('Missing details', 'Please enter your name, email and a password.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      notify('Invalid email', 'Please enter a valid email address.');
      return;
    }
    const passwordProblem = getPasswordProblem(password);
    if (passwordProblem) {
      notify('Choose a stronger password', passwordProblem);
      return;
    }
    if (password !== confirmPassword) {
      notify('Passwords do not match', 'Please re-enter your password.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.replace(/[\s-]/g, '') || undefined,
        password,
      });
      setAuth(data.data.accessToken, data.data.refreshToken, data.data.user);
      router.replace('/(tabs)');
      if (phone.trim()) router.push('/verify-phone');
    } catch (error) {
      notify('Sign up failed', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: activeTheme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Typography variant="h1" weight="bold">Create account</Typography>
        <Typography variant="body" color={activeTheme.textSecondary} style={styles.subtitle}>
          Order food and goods from sellers near you.
        </Typography>

        <TextField label="Full name" value={fullName} onChangeText={setFullName} autoComplete="name" />
        <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <TextField label="Mobile number (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="07X XXX XXXX" hint="We'll text you a code to verify it" />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry hint={PASSWORD_HINT} />
        <TextField label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

        <Button label="Create account" variant="primary" size="lg" loading={loading} onPress={handleRegister} />

        <View style={styles.footer}>
          <Typography variant="bodySm" color={activeTheme.textSecondary}>Already have an account? </Typography>
          <Typography variant="bodySm" weight="bold" color={activeTheme.primary} onPress={() => router.replace('/(auth)/login')}>
            Log in
          </Typography>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.xl, paddingTop: 80, flexGrow: 1 },
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.xl },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
});

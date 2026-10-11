import React, { useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { TextField } from '@/src/components/common/TextField';
import { theme } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/src/services/api';
import { notify } from '@/src/utils/notify';
import { getErrorMessage } from '@/src/utils/format';
import { getPasswordProblem, PASSWORD_HINT } from '@/src/utils/password';

/** Opened from the emailed link: kuwana://reset-password?token=... */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    const problem = getPasswordProblem(password);
    if (problem) return notify('Choose a stronger password', problem);
    if (password !== confirmPassword) return notify('Passwords do not match', 'Please re-enter your new password.');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      notify('Password reset', 'You can now log in with your new password.');
      router.replace('/(auth)/login');
    } catch (error) {
      notify('Could not reset password', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: activeTheme.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Typography variant="h1" weight="bold">New password</Typography>
      {!token ? (
        <>
          <Typography variant="body" color={activeTheme.textSecondary} style={styles.subtitle}>
            This reset link is incomplete. Request a new one.
          </Typography>
          <Button label="Request a new link" variant="primary" onPress={() => router.replace('/(auth)/forgot-password')} />
        </>
      ) : (
        <>
          <Typography variant="body" color={activeTheme.textSecondary} style={styles.subtitle}>
            Choose a new password for your Kuwana account.
          </Typography>
          <TextField label="New password" secureTextEntry value={password} onChangeText={setPassword} hint={PASSWORD_HINT} />
          <TextField label="Confirm new password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
          <Button label="Reset password" variant="primary" size="lg" loading={loading} disabled={!password} onPress={handleReset} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingTop: 80, flexGrow: 1 },
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.xl },
});

import React, { useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { TextField } from '@/src/components/common/TextField';
import { theme } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/src/services/api';
import { notify } from '@/src/utils/notify';
import { getErrorMessage } from '@/src/utils/format';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (error) {
      notify('Something went wrong', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: activeTheme.background }} contentContainerStyle={styles.scroll}>
      <Typography variant="h1" weight="bold">Reset password</Typography>
      {sent ? (
        <Typography variant="body" color={activeTheme.textSecondary} style={styles.subtitle}>
          If an account exists for {email.trim()}, we have sent a link to reset your password. Check your inbox.
        </Typography>
      ) : (
        <>
          <Typography variant="body" color={activeTheme.textSecondary} style={styles.subtitle}>
            Enter your account email and we will send you a reset link.
          </Typography>
          <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Button label="Send reset link" variant="primary" size="lg" loading={loading} disabled={!email.trim()} onPress={handleSubmit} />
        </>
      )}
      <Button label="Back to log in" variant="ghost" onPress={() => router.replace('/(auth)/login')} style={{ marginTop: spacing.md }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingTop: 80, flexGrow: 1 },
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.xl },
});

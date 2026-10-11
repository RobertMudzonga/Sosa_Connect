import React, { useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
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

export default function SecurityScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    const passwordProblem = getPasswordProblem(newPassword);
    if (passwordProblem) {
      notify('Choose a stronger password', passwordProblem);
      return;
    }
    if (newPassword !== confirmPassword) {
      notify('Passwords do not match', 'Please re-enter your new password.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify('Password changed', 'Your password has been updated.');
    } catch (error) {
      notify('Could not change password', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: activeTheme.background }} contentContainerStyle={styles.scroll}>
      <Typography variant="h3" weight="bold" style={{ marginBottom: spacing.md }}>Change password</Typography>
      <TextField label="Current password" secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} />
      <TextField label="New password" secureTextEntry value={newPassword} onChangeText={setNewPassword} hint={PASSWORD_HINT} />
      <TextField label="Confirm new password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
      <Button label="Update password" variant="primary" loading={saving} disabled={!currentPassword || !newPassword} onPress={handleChange} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
});

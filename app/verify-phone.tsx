import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { TextField } from '@/src/components/common/TextField';
import { theme, palette } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore, UserProfile } from '@/src/store/auth-store';
import { api } from '@/src/services/api';
import { notify } from '@/src/utils/notify';
import { getErrorMessage } from '@/src/utils/format';
import { normalizeZwPhone } from '@/src/utils/phone';

const RESEND_SECONDS = 60;

export default function VerifyPhoneScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const { user, setUser } = useAuthStore();

  const [phone, setPhone] = useState(user?.phone ?? '');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [changingNumber, setChangingNumber] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const finish = () => {
    if (returnTo === 'checkout') router.replace('/checkout');
    else if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const sendCode = async () => {
    const normalized = normalizeZwPhone(phone);
    if (!normalized) {
      notify('Invalid number', 'Enter a Zimbabwean mobile number, e.g. 077 123 4567.');
      return;
    }
    setSending(true);
    try {
      await api.post('/auth/phone/send-code', { phone: normalized });
      setSentTo(normalized);
      setCode('');
      setCooldown(RESEND_SECONDS);
    } catch (error) {
      notify('Could not send code', getErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    if (!sentTo || code.length !== 6) return;
    setVerifying(true);
    try {
      const { data } = await api.post('/auth/phone/verify', { phone: sentTo, code });
      setUser(data.data as UserProfile);
      notify('Phone verified', 'Thanks! Sellers and drivers can now reach you about your orders.');
      finish();
    } catch (error) {
      notify('Verification failed', getErrorMessage(error, 'That code is incorrect or has expired.'));
    } finally {
      setVerifying(false);
    }
  };

  if (user?.phoneVerified && !changingNumber) {
    return (
      <View style={[styles.done, { backgroundColor: activeTheme.background }]}>
        <ShieldCheck size={48} color={palette.success} />
        <Typography variant="h3" weight="bold" style={{ marginTop: spacing.md }}>Phone verified</Typography>
        <Typography variant="body" color={activeTheme.textSecondary}>{user.phone}</Typography>
        <Button label="Change number" variant="ghost" onPress={() => setChangingNumber(true)} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: activeTheme.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Typography variant="body" color={activeTheme.textSecondary} style={{ marginBottom: spacing.lg }}>
        We will text you a 6-digit code. A verified number lets sellers and drivers contact you, and is required to place orders.
      </Typography>

      <TextField
        label="Mobile number"
        placeholder="077 123 4567"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        editable={!sending}
      />
      <Button
        label={cooldown > 0 ? `Resend code in ${cooldown}s` : sentTo ? 'Resend code' : 'Send code'}
        variant={sentTo ? 'secondary' : 'primary'}
        loading={sending}
        disabled={cooldown > 0}
        onPress={sendCode}
      />

      {!!sentTo && (
        <View style={{ marginTop: spacing.xl }}>
          <TextField
            label={`Code sent to ${sentTo}`}
            placeholder="123456"
            keyboardType="number-pad"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            maxLength={6}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
          />
          <Button label="Verify" variant="primary" size="lg" loading={verifying} disabled={code.length !== 6} onPress={verify} />
        </View>
      )}

      {returnTo !== 'checkout' && (
        <Button label="Skip for now" variant="ghost" onPress={finish} style={{ marginTop: spacing.lg }} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
});

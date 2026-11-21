import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { OptionPicker } from '@/src/components/common/OptionPicker';
import { Field, Panel, Tabs } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useOnboardSeller } from '@/src/hooks/useMerchant';
import { useCities } from '@/src/hooks/useCatalog';
import { useAuthStore } from '@/src/store/auth-store';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { spacing } from '@/src/theme/spacing';

export default function MerchantOnboarding() {
  const t = useMarketTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: cities } = useCities();
  const onboard = useOnboardSeller();
  const [tier, setTier] = useState<'INFORMAL' | 'REGISTERED'>('REGISTERED');
  const [businessName, setBusinessName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState(user?.phone ?? '+263');
  const [cityId, setCityId] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  const missing = !businessName.trim() ? 'Enter your business name'
    : tier === 'REGISTERED' && !taxNumber.trim() ? 'Enter your ZIMRA BP number'
    : tier === 'INFORMAL' && !nationalId.trim() ? 'Enter your national ID number'
    : !cityId ? 'Choose where you trade from'
    : null;

  const submit = async () => {
    try {
      await onboard.mutateAsync({
        businessName: businessName.trim(),
        kycTier: tier,
        taxNumber: tier === 'REGISTERED' ? taxNumber.trim() : undefined,
        nationalId: tier === 'INFORMAL' ? nationalId.trim() : undefined,
        phone: phone.trim(),
        cityId: cityId!,
        description: description.trim() || undefined,
      });
      router.replace('/merchant');
    } catch (e) {
      notify('Could not create your seller account', getErrorMessage(e));
    }
  };

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View>
        <Typography variant="h2" weight="bold">Sell on Kuwana</Typography>
        <Typography variant="bodySm" color={t.textSecondary}>
          Reach buyers near your shops. List the stock on your shelves; when an order comes in you pack it and a nearby Kuwana driver collects and delivers it.
        </Typography>
      </View>

      <Panel title="Your business">
        <Tabs value={tier} onChange={setTier} options={[{ value: 'REGISTERED', label: 'Registered company' }, { value: 'INFORMAL', label: 'Informal trader' }]} />
        <Field label="Business name" value={businessName} onChangeText={setBusinessName} placeholder="e.g. Harare Gadget Hub" />
        {tier === 'REGISTERED' ? (
          <Field label="ZIMRA BP number" value={taxNumber} onChangeText={setTaxNumber} placeholder="e.g. 200123456" hint="From your tax clearance certificate." />
        ) : (
          <Field label="National ID number" value={nationalId} onChangeText={setNationalId} placeholder="e.g. 63-1234567-X-63" hint="Informal traders start with lower limits." />
        )}
        <Field label="Business phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" hint="We text new orders and payouts here." />
        <OptionPicker label="Where you trade from" placeholder="Choose a town" value={cityId}
          options={(cities ?? []).map((c) => ({ value: c.id, label: c.name, hint: c.province }))} onChange={setCityId} />
        <Field label="About your business (optional)" value={description} onChangeText={setDescription} multiline placeholder="What do you sell?" />
      </Panel>

      <Typography variant="caption" color={t.textSecondary}>
        Kuwana checks your details before your offers go live. Commission is charged per sale, by category.
      </Typography>
      {missing && <Typography variant="caption" color={t.textSecondary} align="center">{missing}</Typography>}
      <Button label="Create seller account" size="lg" onPress={submit} loading={onboard.isPending} disabled={!!missing} style={{ marginTop: spacing.xs }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
});

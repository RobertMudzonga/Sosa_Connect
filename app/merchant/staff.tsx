import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { OptionPicker } from '@/src/components/common/OptionPicker';
import { Field, Panel, Pill } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useMyBranches } from '@/src/hooks/useMerchant';
import { useCreateStaff, useStoreStaff, useUpdateStaff, StoreStaff } from '@/src/hooks/useStore';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { spacing } from '@/src/theme/spacing';

const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

function StaffRow({ s, branchOptions }: { s: StoreStaff; branchOptions: { value: string; label: string }[] }) {
  const t = useMarketTheme();
  const update = useUpdateStaff();
  const save = (dto: { branchId?: string; active?: boolean }) => {
    update.mutateAsync({ id: s.id, ...dto }).catch((e) => notify('Could not update', getErrorMessage(e)));
  };
  return (
    <Panel title={s.fullName} right={<Pill label={s.active ? 'Active' : 'Suspended'} tone={s.active ? 'good' : 'bad'} />}>
      <Typography variant="caption" color={t.textSecondary}>{s.email}{s.phone ? ` · ${s.phone}` : ''}</Typography>
      <OptionPicker label="Branch" placeholder="Choose a branch" value={s.branch?.id ?? null} searchable={false} options={branchOptions} onChange={(v) => save({ branchId: v })} />
      <View style={styles.switchRow}>
        <Typography variant="bodySm" weight="semibold" style={styles.flex}>Can sign in</Typography>
        <Switch value={s.active} onValueChange={(v) => save({ active: v })} disabled={update.isPending} />
      </View>
    </Panel>
  );
}

/** Store owner: branch staff accounts. Staff sign in with these details and see only their branch's orders. */
export default function StoreStaffScreen() {
  const t = useMarketTheme();
  const { data: staff, isLoading } = useStoreStaff();
  const { data: branches } = useMyBranches();
  const create = useCreateStaff();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [branchId, setBranchId] = useState<string | null>(null);
  const branchOptions = (branches ?? []).filter((b) => b.isActive).map((b) => ({ value: b.id, label: `${b.name} · ${b.code}` }));

  const missing = fullName.trim().length < 2 ? 'Enter their name'
    : !/^\S+@\S+\.\S+$/.test(email.trim()) ? 'Enter their email'
    : phone.trim() && !/^\+2637\d{8}$/.test(phone.trim()) ? 'Phone must look like +2637XXXXXXXX'
    : !PASSWORD_RULE.test(password) ? 'Password: 8+ characters with a capital letter and a number'
    : !branchId ? 'Choose their branch'
    : null;

  const add = async () => {
    try {
      await create.mutateAsync({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim() || undefined, password, branchId: branchId! });
      notify('Staff member added', `Share the email and password with ${fullName.trim()}. They sign in to the Kuwana app and open Store orders.`);
      setFullName(''); setEmail(''); setPhone(''); setPassword('');
    } catch (e) {
      notify('Could not add staff', getErrorMessage(e));
    }
  };

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Typography variant="bodySm" color={t.textSecondary}>
        Counter staff accept and pack orders and give drivers the pickup PIN. They don’t see your earnings or other branches.
      </Typography>
      {isLoading && <ActivityIndicator color={t.accent} />}
      {(staff ?? []).map((s) => <StaffRow key={s.id} s={s} branchOptions={branchOptions} />)}

      <Panel title="Add a staff member">
        <Field label="Full name" value={fullName} onChangeText={setFullName} />
        <Field label="Email (their sign-in)" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Field label="Mobile (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+2637XXXXXXXX" />
        <Field label="Temporary password" value={password} onChangeText={setPassword} secureTextEntry hint="8+ characters, a capital letter and a number" />
        <OptionPicker label="Branch" placeholder="Choose a branch" value={branchId} searchable={false} options={branchOptions} onChange={setBranchId} />
        {missing && <Typography variant="caption" color={t.textSecondary}>{missing}</Typography>}
        <Button label="Add staff member" onPress={add} loading={create.isPending} disabled={!!missing} />
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
});

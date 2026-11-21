import React, { useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { OptionPicker } from '@/src/components/common/OptionPicker';
import { Field, Panel, Pill, Tabs } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useStaffList, useOpsAction, opsApi } from '@/src/hooks/useOps';
import { useHubs } from '@/src/hooks/useMerchant';
import { usePickupPoints } from '@/src/hooks/useMarket';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { spacing } from '@/src/theme/spacing';

type Role = 'WAREHOUSE' | 'DRIVER' | 'PICKUP_AGENT';
const ROLE_LABEL: Record<Role, string> = { WAREHOUSE: 'Hub team', DRIVER: 'Driver', PICKUP_AGENT: 'Pickup agent' };

export default function StaffScreen() {
  const t = useMarketTheme();
  const { data: staff, isLoading } = useStaffList();
  const { data: hubs } = useHubs();
  const { data: points } = usePickupPoints();
  const [role, setRole] = useState<Role>('WAREHOUSE');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [hubId, setHubId] = useState<string | null>(null);
  const [pointId, setPointId] = useState<string | null>(null);
  const save = useOpsAction(() => opsApi.saveStaff({
    email: email.trim(), fullName: name.trim(), role,
    hubId: role !== 'PICKUP_AGENT' ? hubId ?? undefined : undefined,
    pickupPointId: role === 'PICKUP_AGENT' ? pointId ?? undefined : undefined,
    password: password || undefined,
  }));

  const missing = !email.includes('@') ? 'Enter an email' : name.trim().length < 2 ? 'Enter their name'
    : role === 'WAREHOUSE' && !hubId ? 'Choose a hub' : role === 'PICKUP_AGENT' && !pointId ? 'Choose a pickup point' : null;

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Panel title="Add or reassign staff">
        <Tabs value={role} onChange={setRole} options={[{ value: 'WAREHOUSE', label: 'Hub team' }, { value: 'DRIVER', label: 'Driver' }, { value: 'PICKUP_AGENT', label: 'Pickup agent' }]} />
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Field label="Full name" value={name} onChangeText={setName} />
        {role !== 'PICKUP_AGENT' ? (
          <OptionPicker label={role === 'DRIVER' ? 'Home hub (optional)' : 'Hub'} placeholder="Choose a hub" value={hubId} searchable={false}
            options={(hubs ?? []).map((h) => ({ value: h.id, label: h.name, hint: h.address }))} onChange={setHubId} />
        ) : (
          <OptionPicker label="Pickup point" placeholder="Choose a pickup point" value={pointId}
            options={(points ?? []).map((p) => ({ value: p.id, label: p.name, hint: `${p.city.name} · ${p.address}` }))} onChange={setPointId} />
        )}
        <Field label="Temporary password (new accounts)" value={password} onChangeText={setPassword} secureTextEntry hint="Leave blank to change the role of an existing account." />
        {missing && <Typography variant="caption" color={t.textSecondary}>{missing}</Typography>}
        <Button label="Save" disabled={!!missing} loading={save.isPending}
          onPress={() => save.mutateAsync(undefined).then(() => { setEmail(''); setName(''); setPassword(''); }).catch((e) => notify('Could not save', getErrorMessage(e)))} />
      </Panel>

      {isLoading && <ActivityIndicator color={t.accent} />}
      {(staff ?? []).map((s) => (
        <Panel key={s.id} title={s.name} right={<Pill label={ROLE_LABEL[s.role]} tone="info" />}>
          <Typography variant="caption" color={t.textSecondary}>
            {s.email}{s.hub ? ` · ${s.hub.name}` : ''}{s.pickupPoint ? ` · ${s.pickupPoint.name}` : ''}{s.role === 'DRIVER' && !s.hub ? ' · any hub' : ''}
          </Typography>
        </Panel>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
});

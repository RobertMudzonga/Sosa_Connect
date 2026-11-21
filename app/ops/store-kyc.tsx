import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, Circle, MapPin } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field, Panel, Pill } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useOpsAction, opsApi } from '@/src/hooks/useOps';
import { controlApi, useStoreKyc } from '@/src/hooks/useControl';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { spacing } from '@/src/theme/spacing';

const details = (d: Record<string, string> | null) => (d && Object.keys(d).length ? Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(' · ') : 'Not added');

/** Admin: everything needed to approve a store — identity, payout accounts, branch pins — plus payout holds */
export default function StoreKycScreen() {
  const t = useMarketTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: s, isLoading } = useStoreKyc(id);
  const [note, setNote] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const verify = useOpsAction(({ branchId, verified }: { branchId: string; verified: boolean }) => controlApi.verifyPin(branchId, verified));
  const kyc = useOpsAction((status: 'APPROVED' | 'REJECTED' | 'SUSPENDED') => opsApi.sellerKyc(id!, { status, note: note.trim() || undefined }));
  const hold = useOpsAction((reason: string | null) => controlApi.holdStore(id!, reason));
  const err = (title: string) => (e: unknown) => notify(title, getErrorMessage(e));

  if (isLoading || !s) return <View style={styles.center}><ActivityIndicator color={t.accent} /></View>;
  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: s.businessName }} />
      <Panel title="Checklist" right={<Pill label={s.kycStatus.toLowerCase()} tone={s.kycStatus === 'APPROVED' ? 'good' : s.kycStatus === 'PENDING' ? 'warn' : 'bad'} />}>
        {s.checklist.map((c) => (
          <View key={c.key} style={styles.inline}>
            {c.ok ? <CheckCircle2 size={16} color={t.success} /> : <Circle size={16} color={t.textSecondary} />}
            <Typography variant="bodySm" color={c.ok ? t.text : t.textSecondary}>{c.label}</Typography>
          </View>
        ))}
      </Panel>

      <Panel title="Owner & identity">
        <Typography variant="bodySm">{s.owner.name ?? '—'} · {s.owner.email}</Typography>
        <Typography variant="bodySm">{s.owner.phone ?? 'No phone'}{s.owner.phoneVerified ? ' (verified)' : ' (not verified)'}</Typography>
        <Typography variant="bodySm">National ID: {s.nationalId ?? '—'}{s.kycTier === 'REGISTERED' ? ` · ZIMRA BP: ${s.taxNumber ?? '—'}` : ' · informal trader'}</Typography>
      </Panel>

      <Panel title="Payout accounts">
        <Typography variant="bodySm">USD: {details(s.payout.usd)}</Typography>
        <Typography variant="bodySm">ZiG: {details(s.payout.zig)}</Typography>
      </Panel>

      <Panel title={`Branches (${s.branches.length})`}>
        {s.branches.length === 0 && <Typography variant="bodySm" color={t.textSecondary}>No branches yet; the store can’t sell until it adds one.</Typography>}
        {s.branches.map((b) => (
          <View key={b.id} style={[styles.branch, { borderColor: t.border }]}>
            <View style={styles.rowBetween}>
              <Typography variant="bodySm" weight="semibold" style={styles.flex}>{b.name} · {b.code}</Typography>
              {!b.isActive ? <Pill label="Closed" tone="bad" /> : b.locationVerifiedAt ? <Pill label="Pin checked" tone="good" /> : <Pill label="Pin not checked" tone="warn" />}
            </View>
            <Typography variant="caption" color={t.textSecondary}>{b.address}{b.suburb ? `, ${b.suburb}` : ''}, {b.city}{b.landmark ? ` · ${b.landmark}` : ''}</Typography>
            <View style={styles.rowBetween}>
              <TouchableOpacity onPress={() => Linking.openURL(b.mapUrl)} style={styles.inline}>
                <MapPin size={14} color={t.accent} /><Typography variant="caption" weight="semibold" color={t.accent}>Open pin {b.lat.toFixed(4)}, {b.lng.toFixed(4)}</Typography>
              </TouchableOpacity>
              <Button label={b.locationVerifiedAt ? 'Unmark' : 'Pin matches the shop'} size="sm" variant={b.locationVerifiedAt ? 'ghost' : 'outline'} loading={verify.isPending && verify.variables?.branchId === b.id}
                onPress={() => verify.mutateAsync({ branchId: b.id, verified: !b.locationVerifiedAt }).catch(err('Not saved'))} />
            </View>
          </View>
        ))}
        <Typography variant="caption" color={t.textSecondary}>Check the pin against Street View or a photo of the shopfront. Moving a pin clears the check.</Typography>
      </Panel>

      <Panel title="Decision">
        <Field label="Note to the store (needed to reject or suspend)" value={note} onChangeText={setNote} />
        <View style={styles.row}>
          {s.kycStatus !== 'APPROVED' && <Button label={s.readyToApprove ? 'Approve' : 'Approve anyway'} size="sm" style={styles.flex} loading={kyc.isPending && kyc.variables === 'APPROVED'} onPress={() => kyc.mutateAsync('APPROVED').catch(err('Not saved'))} />}
          {s.kycStatus === 'PENDING' && <Button label="Reject" variant="outline" size="sm" style={styles.flex} disabled={note.trim().length < 3} onPress={() => kyc.mutateAsync('REJECTED').catch(err('Not saved'))} />}
          {s.kycStatus === 'APPROVED' && <Button label="Suspend" variant="danger" size="sm" style={styles.flex} disabled={note.trim().length < 3} onPress={() => kyc.mutateAsync('SUSPENDED').catch(err('Not saved'))} />}
        </View>
      </Panel>

      {s.kycStatus === 'APPROVED' && (
        <Panel title="Payouts" right={s.payoutHold ? <Pill label="On hold" tone="bad" /> : <Pill label="Open" tone="good" />}>
          <Typography variant="caption" color={t.textSecondary}>
            On-time {s.slaScore.toFixed(0)}% · disputes {s.disputeRate.toFixed(1)}%. A hold stops payout requests and approvals; earnings keep building in escrow.
          </Typography>
          {s.payoutHold ? (
            <>
              <Typography variant="bodySm">Held: {s.payoutHold.reason}</Typography>
              <Button label="Lift the hold" size="sm" variant="outline" loading={hold.isPending} onPress={() => hold.mutateAsync(null).catch(err('Not saved'))} />
            </>
          ) : (
            <>
              <Field label="Reason (sent to the store)" value={holdReason} onChangeText={setHoldReason} />
              <Button label="Hold payouts" size="sm" variant="danger" disabled={holdReason.trim().length < 3} loading={hold.isPending}
                onPress={() => hold.mutateAsync(holdReason.trim()).then(() => setHoldReason('')).catch(err('Not saved'))} />
            </>
          )}
        </Panel>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  branch: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, gap: 4 },
});

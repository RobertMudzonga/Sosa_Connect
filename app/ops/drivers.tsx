import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field, Panel, Pill, Tabs, usd } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useAdminDrivers, useAdminDriverAction, useAdminDriverWithdrawals, DriverKyc, DriverProfile, DriverWithdrawalRow } from '@/src/hooks/useDriver';
import { formatDateTime, getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

function Docs({ d }: { d: DriverProfile }) {
  const t = useMarketTheme();
  const docs = [['ID', d.documents.idDocUrl], ['Licence', d.documents.licenseDocUrl], ['Selfie', d.documents.selfieUrl]] as const;
  return (
    <View style={styles.docs}>
      {docs.map(([label, url]) => (
        <TouchableOpacity key={label} disabled={!url} onPress={() => url && Linking.openURL(url)} style={[styles.doc, { backgroundColor: t.surfaceVariant }]}>
          {url ? <Image source={{ uri: url }} style={styles.docImg} contentFit="cover" /> : <Typography variant="caption" color={t.textSecondary}>No {label.toLowerCase()}</Typography>}
          <Typography variant="caption" color={t.textSecondary}>{label}</Typography>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function DriverCard({ d }: { d: DriverProfile }) {
  const t = useMarketTheme();
  const act = useAdminDriverAction();
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [ref, setRef] = useState('');
  const [cap, setCap] = useState(d.maxParcelValueUsd ? String(d.maxParcelValueUsd) : '');
  const capValue = cap.trim() ? Number(cap) : null;
  const run = (path: string, body?: Record<string, unknown>, done?: string) =>
    act.mutateAsync({ path, body }).then(() => { if (done) notify(done, ''); setNote(''); setAmount(''); setRef(''); }).catch((e) => notify('Not done', getErrorMessage(e)));

  return (
    <Panel title={d.fullName} right={<Pill label={d.kycStatus.toLowerCase()} tone={d.kycStatus === 'APPROVED' ? 'good' : d.kycStatus === 'PENDING' ? 'warn' : 'bad'} />}>
      <Typography variant="bodySm">{d.vehicleClass.toLowerCase()} · {d.vehicleReg ?? 'no reg'}{d.vehicleDescription ? ` · ${d.vehicleDescription}` : ''} · {d.city?.name ?? ''}</Typography>
      <Typography variant="caption" color={t.textSecondary}>ID {d.nationalId}{d.licenseNumber ? ` · licence ${d.licenseNumber}` : ''}{d.licenseExpiry ? ` (exp ${d.licenseExpiry.slice(0, 10)})` : ''}</Typography>
      <Typography variant="caption" color={t.textSecondary}>{d.phone} · {d.email} · applied {formatDateTime(d.createdAt)}</Typography>
      {d.kycStatus === 'PENDING' && <Docs d={d} />}
      {d.kycStatus === 'APPROVED' && (
        <Typography variant="caption" color={t.textSecondary}>
          {d.isOnline ? 'Online' : 'Offline'} · {d.completedJobs} deliveries{d.maxParcelValueUsd ? ` · parcels up to ${usd(d.maxParcelValueUsd)}` : ''} · float {usd(d.wallet.availableFloatUsd)} free, {usd(d.wallet.lockedFloatUsd)} locked · earnings {usd(d.wallet.withdrawableEarningsUsd)}
        </Typography>
      )}
      {!!d.rejectionNote && d.kycStatus !== 'APPROVED' && <Typography variant="caption" color={t.error}>{d.rejectionNote}</Typography>}

      {d.kycStatus === 'PENDING' && (
        <>
          <Field label="Note to the driver (needed to return the application)" value={note} onChangeText={setNote} />
          <View style={styles.row2}>
            <Button label="Return" variant="outline" size="sm" style={styles.flex} disabled={note.trim().length < 3} onPress={() => run(`${d.id}/reject`, { note }, 'Returned to the driver')} />
            <Button label="Approve" size="sm" style={styles.flex} loading={act.isPending} onPress={() => run(`${d.id}/approve`, { maxParcelValueUsd: capValue }, 'Driver approved')} />
          </View>
          <Field label="Highest parcel value they may carry (USD)" value={cap} onChangeText={setCap} keyboardType="decimal-pad" placeholder="No limit beyond their float" hint="Start new drivers low; raise it as they build a record" />
        </>
      )}
      {d.kycStatus === 'APPROVED' && (
        <>
          <Typography variant="bodySm" weight="semibold">Record a float deposit (cash at an agent) or correction</Typography>
          <View style={styles.row2}>
            <View style={styles.flex}><Field label="Amount (USD, − to correct)" value={amount} onChangeText={setAmount} keyboardType="numbers-and-punctuation" /></View>
            <View style={styles.flex}><Field label="Receipt / ref" value={ref} onChangeText={setRef} /></View>
          </View>
          <Button label="Record" size="sm" variant="outline" disabled={!Number(amount)}
            onPress={() => run(`${d.id}/wallet/adjust`, { amountUsd: Number(amount), reference: ref || undefined, memo: ref ? `Agent deposit ${ref}` : 'Float adjustment by admin' }, 'Float updated')} />
          <View style={styles.row2}>
            <View style={styles.flex}><Field label="Parcel value limit (USD)" value={cap} onChangeText={setCap} keyboardType="decimal-pad" placeholder="No limit" /></View>
            <Button label="Set limit" size="sm" variant="outline" style={styles.capBtn} disabled={capValue === (d.maxParcelValueUsd ?? null) || (capValue !== null && !(capValue > 0))}
              onPress={() => run(`${d.id}/parcel-cap`, { maxParcelValueUsd: capValue }, capValue ? `Limit set to ${usd(capValue)}` : 'Limit removed')} />
          </View>
          <Field label="Reason (to suspend)" value={note} onChangeText={setNote} />
          <Button label="Suspend driver" size="sm" variant="ghost" disabled={note.trim().length < 3} onPress={() => run(`${d.id}/suspend`, { note }, 'Driver suspended')} />
        </>
      )}
      {d.kycStatus === 'SUSPENDED' && <Button label="Reinstate" size="sm" variant="outline" onPress={() => run(`${d.id}/approve`, {}, 'Driver reinstated')} />}
    </Panel>
  );
}

function WithdrawalRow({ w }: { w: DriverWithdrawalRow }) {
  const t = useMarketTheme();
  const act = useAdminDriverAction();
  const [ref, setRef] = useState('');
  const run = (path: string, body: Record<string, unknown>) => act.mutateAsync({ path, body }).catch((e) => notify('Not done', getErrorMessage(e)));
  return (
    <Panel title={`${usd(w.amountUsd)} · ${w.driverName}`} right={<Pill label={w.bucket === 'FLOAT' ? 'float' : 'earnings'} tone="info" />}>
      <Typography variant="caption" color={t.textSecondary}>{w.method} {w.destination.phone ?? ''} · {formatDateTime(w.createdAt)}</Typography>
      <Field label="Transfer reference" value={ref} onChangeText={setRef} />
      <View style={styles.row2}>
        <Button label="Reject" variant="outline" size="sm" style={styles.flex} onPress={() => run(`withdrawals/${w.id}/reject`, { note: 'Rejected by admin' })} />
        <Button label="Mark paid" size="sm" style={styles.flex} disabled={ref.trim().length < 2} onPress={() => run(`withdrawals/${w.id}/paid`, { externalRef: ref.trim() })} />
      </View>
    </Panel>
  );
}

/** Admin: driver applications, accounts, floats and withdrawals */
export default function OpsDrivers() {
  const t = useMarketTheme();
  const [tab, setTab] = useState<DriverKyc | 'WITHDRAWALS'>('PENDING');
  const drivers = useAdminDrivers(tab === 'WITHDRAWALS' ? 'PENDING' : tab);
  const withdrawals = useAdminDriverWithdrawals();
  const loading = tab === 'WITHDRAWALS' ? withdrawals.isLoading : drivers.isLoading;
  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Tabs value={tab} onChange={setTab} options={[
        { value: 'PENDING', label: 'To review' }, { value: 'APPROVED', label: 'Active' }, { value: 'SUSPENDED', label: 'Suspended' },
        { value: 'WITHDRAWALS', label: `Payouts${withdrawals.data?.length ? ` (${withdrawals.data.length})` : ''}` },
      ]} />
      {loading && <ActivityIndicator color={t.accent} />}
      {tab === 'WITHDRAWALS'
        ? (withdrawals.data ?? []).map((w) => <WithdrawalRow key={w.id} w={w} />)
        : (drivers.data ?? []).map((d) => <DriverCard key={d.id} d={d} />)}
      {!loading && (tab === 'WITHDRAWALS' ? withdrawals.data?.length === 0 : drivers.data?.length === 0) && (
        <Typography variant="bodySm" color={t.textSecondary} align="center">Nothing here.</Typography>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  row2: { flexDirection: 'row', gap: spacing.sm },
  capBtn: { alignSelf: 'flex-end', marginBottom: 4 },
  docs: { flexDirection: 'row', gap: spacing.sm },
  doc: { flex: 1, aspectRatio: 0.9, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 2, padding: 4 },
  docImg: { width: '100%', height: '80%', borderRadius: radius.sm },
});

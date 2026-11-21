import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field, Panel, Pill, Tabs } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useAdminSellers, useOpsAction, opsApi, AdminSeller } from '@/src/hooks/useOps';
import { getErrorMessage, formatDateTime } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { spacing } from '@/src/theme/spacing';

function SellerCard({ s }: { s: AdminSeller }) {
  const t = useMarketTheme();
  const router = useRouter();
  const [note, setNote] = useState('');
  const kyc = useOpsAction((status: 'APPROVED' | 'REJECTED' | 'SUSPENDED') => opsApi.sellerKyc(s.id, { status, note: note.trim() || undefined }));
  const act = (status: 'APPROVED' | 'REJECTED' | 'SUSPENDED') => kyc.mutateAsync(status).catch((e) => notify('Could not update seller', getErrorMessage(e)));
  return (
    <Panel title={s.businessName} right={<Pill label={s.kycTier === 'REGISTERED' ? 'Registered' : 'Informal'} tone="info" />}>
      <Typography variant="caption" color={t.textSecondary}>
        {s.ownerEmail}{s.phone ? ` · ${s.phone}` : ''}{s.city ? ` · ${s.city.name}` : ''} · applied {formatDateTime(s.createdAt)}
      </Typography>
      <Typography variant="bodySm">{s.kycTier === 'REGISTERED' ? `ZIMRA BP: ${s.taxNumber ?? '—'}` : `National ID: ${s.nationalId ?? '—'}`}</Typography>
      {s.kycStatus === 'APPROVED' && (
        <Typography variant="caption" color={t.textSecondary}>On-time dispatch {s.slaScore.toFixed(0)}% · disputes {s.disputeRate.toFixed(1)}%</Typography>
      )}
      {!s.isFirstParty && <Button label="Review ID, payout accounts & branch pins" size="sm" variant="ghost" onPress={() => router.push({ pathname: '/ops/store-kyc', params: { id: s.id } })} />}
      {!s.isFirstParty && (
        <>
          <Field label="Note to seller (for rejection or suspension)" value={note} onChangeText={setNote} />
          <View style={styles.row}>
            {s.kycStatus !== 'APPROVED' && <Button label="Approve" size="sm" onPress={() => act('APPROVED')} loading={kyc.isPending} style={styles.flex} />}
            {s.kycStatus === 'PENDING' && <Button label="Reject" variant="outline" size="sm" disabled={note.trim().length < 3} onPress={() => act('REJECTED')} style={styles.flex} />}
            {s.kycStatus === 'APPROVED' && <Button label="Suspend" variant="danger" size="sm" disabled={note.trim().length < 3} onPress={() => act('SUSPENDED')} style={styles.flex} />}
          </View>
          {s.kycStatus === 'APPROVED' && <Typography variant="caption" color={t.textSecondary}>Suspending hides all of this seller&apos;s offers from buyers immediately.</Typography>}
        </>
      )}
    </Panel>
  );
}

export default function SellersScreen() {
  const t = useMarketTheme();
  const [tab, setTab] = useState<'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED'>('PENDING');
  const { data, isLoading } = useAdminSellers(tab);
  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Tabs value={tab} onChange={setTab} options={[{ value: 'PENDING', label: 'To review' }, { value: 'APPROVED', label: 'Approved' }, { value: 'SUSPENDED', label: 'Suspended' }, { value: 'REJECTED', label: 'Rejected' }]} />
      {isLoading && <ActivityIndicator color={t.accent} />}
      {(data ?? []).map((s) => <SellerCard key={s.id} s={s} />)}
      {!isLoading && !data?.length && <Typography variant="bodySm" color={t.textSecondary} align="center">No sellers here.</Typography>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', gap: spacing.sm },
});

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { OptionPicker } from '@/src/components/common/OptionPicker';
import { Field, Panel, Pill } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useInbound, useCreateInbound, useInboundAction, useMyOffers, useHubs, InboundNotice } from '@/src/hooks/useMerchant';
import { getErrorMessage } from '@/src/utils/format';
import { notify, confirmAction } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

const STATUS: Record<InboundNotice['status'], { label: string; tone: 'info' | 'warn' | 'good' | 'bad' }> = {
  DRAFT: { label: 'Draft', tone: 'warn' },
  SUBMITTED: { label: 'On its way to the hub', tone: 'info' },
  RECEIVED: { label: 'Received', tone: 'good' },
  CANCELLED: { label: 'Cancelled', tone: 'bad' },
};

function NoticeCard({ n }: { n: InboundNotice }) {
  const t = useMarketTheme();
  const act = useInboundAction();
  const s = STATUS[n.status];
  const run = async (action: 'submit' | 'cancel') => {
    if (action === 'cancel' && !(await confirmAction('Cancel this notice?', 'The hub will not expect this stock.', 'Cancel notice', true))) return;
    try {
      await act.mutateAsync({ id: n.id, action });
    } catch (e) {
      notify('Could not update', getErrorMessage(e));
    }
  };
  return (
    <Panel title={n.reference} right={<Pill label={s.label} tone={s.tone} />}>
      <Typography variant="caption" color={t.textSecondary}>
        To {n.hub.name} · {n.hub.address}
        {n.expectedArrival ? ` · expected ${new Date(n.expectedArrival).toLocaleDateString()}` : ''}
      </Typography>
      {n.items.map((i) => (
        <View key={i.id} style={styles.rowBetween}>
          <Typography variant="bodySm" style={styles.flex} numberOfLines={1}>{i.title}</Typography>
          <Typography variant="caption" color={t.textSecondary}>
            {n.status === 'RECEIVED' ? `${i.quantityReceived ?? 0} of ${i.quantityExpected}${i.quantityDamaged ? ` · ${i.quantityDamaged} damaged` : ''}` : `${i.quantityExpected} units`}
          </Typography>
        </View>
      ))}
      {n.status === 'RECEIVED' && (n.totals.shortfall > 0 || n.totals.damaged > 0) && (
        <Typography variant="caption" color={t.warning}>
          {n.totals.shortfall ? `${n.totals.shortfall} units short. ` : ''}{n.totals.damaged ? `${n.totals.damaged} damaged and not stocked. ` : ''}{n.receivingNotes ?? ''}
        </Typography>
      )}
      {n.status === 'DRAFT' && (
        <Typography variant="caption" color={t.textSecondary}>Write {n.reference} on every box, then send the notice so the hub expects you.</Typography>
      )}
      {(n.status === 'DRAFT' || n.status === 'SUBMITTED') && (
        <View style={styles.row2}>
          <Button label="Cancel" variant="ghost" size="sm" onPress={() => run('cancel')} style={styles.flex} />
          {n.status === 'DRAFT' && <Button label="Send to hub" size="sm" onPress={() => run('submit')} loading={act.isPending} style={styles.flex} />}
        </View>
      )}
    </Panel>
  );
}

export default function MerchantInbound() {
  const t = useMarketTheme();
  const router = useRouter();
  const { data: notices, isLoading } = useInbound();
  const { data: offers } = useMyOffers();
  const { data: hubs } = useHubs();
  const create = useCreateInbound();
  const [creating, setCreating] = useState(false);
  const [hubId, setHubId] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [carrier, setCarrier] = useState('');
  const [arrival, setArrival] = useState('');

  const hubOffers = useMemo(() => (offers ?? []).filter((o) => o.fulfilmentType === 'PLATFORM_FULFILLED' && o.hub?.id === hubId), [offers, hubId]);
  const hubsWithOffers = (hubs ?? []).filter((h) => (offers ?? []).some((o) => o.hub?.id === h.id));
  const lines = hubOffers.map((o) => ({ offerId: o.id, quantity: Math.round(Number(qty[o.id]) || 0) })).filter((l) => l.quantity > 0);
  const arrivalValid = !arrival.trim() || /^\d{4}-\d{2}-\d{2}$/.test(arrival.trim());

  const submit = async () => {
    try {
      await create.mutateAsync({
        hubId: hubId!,
        items: lines,
        carrier: carrier.trim() || undefined,
        expectedArrival: arrival.trim() || undefined,
      });
      setCreating(false);
      setQty({});
      setCarrier('');
      setArrival('');
    } catch (e) {
      notify('Could not create the notice', getErrorMessage(e));
    }
  };

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Typography variant="bodySm" color={t.textSecondary}>
        Send stock to a Kuwana hub and we store, pick, pack and deliver it. Stock goes on sale as soon as the hub counts it in.
      </Typography>

      {!creating ? (
        <Button label="New inbound notice" onPress={() => setCreating(true)} />
      ) : (
        <Panel title="New inbound notice">
          {hubsWithOffers.length === 0 ? (
            <>
              <Typography variant="bodySm" color={t.textSecondary}>
                First add a product as “Kuwana hub” so it has a place to go.
              </Typography>
              <Button label="Add a product" variant="outline" onPress={() => router.push('/merchant/new-offer')} />
            </>
          ) : (
            <>
              <OptionPicker label="Hub" placeholder="Choose a hub" value={hubId} searchable={false}
                options={hubsWithOffers.map((h) => ({ value: h.id, label: h.name, hint: h.address }))} onChange={setHubId} />
              {hubOffers.map((o) => (
                <View key={o.id} style={styles.qtyRow}>
                  <View style={styles.flex}>
                    <Typography variant="bodySm" numberOfLines={2}>{o.product.title}</Typography>
                    <Typography variant="caption" color={t.textSecondary}>{o.stockQty} at the hub now</Typography>
                  </View>
                  <View style={styles.qtyInput}>
                    <Field label="Units" value={qty[o.id] ?? ''} onChangeText={(v) => setQty((q) => ({ ...q, [o.id]: v.replace(/\D/g, '') }))} keyboardType="number-pad" placeholder="0" />
                  </View>
                </View>
              ))}
              {!!hubId && (
                <View style={styles.row2}>
                  <View style={styles.flex}><Field label="Carrier (optional)" value={carrier} onChangeText={setCarrier} placeholder="e.g. own truck" /></View>
                  <View style={styles.flex}><Field label="Arriving (optional)" value={arrival} onChangeText={setArrival} placeholder="YYYY-MM-DD" /></View>
                </View>
              )}
              <View style={styles.row2}>
                <Button label="Cancel" variant="ghost" onPress={() => setCreating(false)} style={styles.flex} />
                <Button label="Save draft" onPress={submit} loading={create.isPending} disabled={!hubId || !lines.length || !arrivalValid} style={styles.flex} />
              </View>
            </>
          )}
        </Panel>
      )}

      {isLoading && <ActivityIndicator color={t.accent} />}
      {(notices ?? []).map((n) => <NoticeCard key={n.id} n={n} />)}
      {!isLoading && notices?.length === 0 && !creating && (
        <Typography variant="bodySm" color={t.textSecondary} align="center">No inbound notices yet.</Typography>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  row2: { flexDirection: 'row', gap: spacing.sm },
  qtyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, borderRadius: radius.sm },
  qtyInput: { width: 90 },
});

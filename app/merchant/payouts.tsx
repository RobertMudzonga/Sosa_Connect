import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field, Panel, Pill, StatTile, Tabs, parseAmount, usd } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import {
  useBalances, usePayouts, useStatement, useRequestPayout, useMySellerProfile, useUpdateSellerProfile, fetchStatementCsv, Payout,
} from '@/src/hooks/useMerchant';
import { useExchangeRate } from '@/src/hooks/useCatalog';
import { formatPrice, getErrorMessage, formatDateTime } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { spacing } from '@/src/theme/spacing';

const PAYOUT_STATUS: Record<Payout['status'], { label: string; tone: 'info' | 'good' | 'bad' | 'warn' }> = {
  REQUESTED: { label: 'Requested', tone: 'warn' },
  APPROVED: { label: 'Approved', tone: 'info' },
  PAID: { label: 'Paid', tone: 'good' },
  REJECTED: { label: 'Returned to balance', tone: 'bad' },
};

function PayoutDetails() {
  const t = useMarketTheme();
  const { data: profile } = useMySellerProfile();
  const save = useUpdateSellerProfile();
  const usdD = profile?.usdPayoutDetails ?? {};
  const zigD = profile?.zigPayoutDetails ?? {};
  const [bank, setBank] = useState('');
  const [accName, setAccName] = useState('');
  const [accNo, setAccNo] = useState('');
  const [branch, setBranch] = useState('');
  const [zigMethod, setZigMethod] = useState<'ZWG_BANK' | 'ECOCASH_MERCHANT'>('ECOCASH_MERCHANT');
  const [zigA, setZigA] = useState('');
  const [zigB, setZigB] = useState('');

  useEffect(() => {
    setBank(usdD.bank ?? ''); setAccName(usdD.accountName ?? ''); setAccNo(usdD.accountNumber ?? ''); setBranch(usdD.branch ?? '');
    setZigMethod(zigD.method === 'ZWG_BANK' ? 'ZWG_BANK' : 'ECOCASH_MERCHANT');
    setZigA(zigD.method === 'ZWG_BANK' ? zigD.bank ?? '' : zigD.merchantCode ?? '');
    setZigB(zigD.method === 'ZWG_BANK' ? zigD.accountNumber ?? '' : zigD.merchantName ?? '');
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    try {
      await save.mutateAsync({
        usdPayoutDetails: bank.trim() ? { bank: bank.trim(), accountName: accName.trim(), accountNumber: accNo.trim(), branch: branch.trim() } : undefined,
        zigPayoutDetails: zigA.trim()
          ? zigMethod === 'ZWG_BANK'
            ? { method: 'ZWG_BANK', bank: zigA.trim(), accountNumber: zigB.trim() }
            : { method: 'ECOCASH_MERCHANT', merchantCode: zigA.trim(), merchantName: zigB.trim() }
          : undefined,
      });
      notify('Saved', 'Your payout details are up to date.');
    } catch (e) {
      notify('Could not save', getErrorMessage(e));
    }
  };

  return (
    <Panel title="Where we pay you">
      <Typography variant="bodySm" weight="semibold">USD (nostro / FCA account)</Typography>
      <Field label="Bank" value={bank} onChangeText={setBank} placeholder="e.g. CBZ" />
      <View style={styles.row2}>
        <View style={styles.flex}><Field label="Account name" value={accName} onChangeText={setAccName} /></View>
        <View style={styles.flex}><Field label="Account number" value={accNo} onChangeText={setAccNo} keyboardType="number-pad" /></View>
      </View>
      <Field label="Branch (optional)" value={branch} onChangeText={setBranch} />
      <Typography variant="bodySm" weight="semibold" style={styles.mt}>ZiG</Typography>
      <Tabs value={zigMethod} onChange={setZigMethod} options={[{ value: 'ECOCASH_MERCHANT', label: 'EcoCash merchant' }, { value: 'ZWG_BANK', label: 'ZiG bank account' }]} />
      <View style={styles.row2}>
        <View style={styles.flex}><Field label={zigMethod === 'ZWG_BANK' ? 'Bank' : 'Merchant code'} value={zigA} onChangeText={setZigA} /></View>
        <View style={styles.flex}><Field label={zigMethod === 'ZWG_BANK' ? 'Account number' : 'Merchant name'} value={zigB} onChangeText={setZigB} /></View>
      </View>
      <Button label="Save payout details" variant="outline" onPress={submit} loading={save.isPending} />
      <Typography variant="caption" color={t.textSecondary}>Changes apply to new payout requests.</Typography>
    </Panel>
  );
}

export default function MerchantPayouts() {
  const t = useMarketTheme();
  const { data: b, isLoading } = useBalances();
  const { data: payouts } = usePayouts();
  const { data: st } = useStatement();
  const { data: rate } = useExchangeRate();
  const request = useRequestPayout();
  const [currency, setCurrency] = useState<'USD' | 'ZWG'>('USD');
  const [amount, setAmount] = useState('');

  if (isLoading || !b) return <View style={[styles.center, { backgroundColor: t.background }]}><ActivityIndicator color={t.accent} /></View>;

  const amountUsd = parseAmount(amount);
  const withdraw = amountUsd ?? b.available.usd;
  const preview = currency === 'ZWG' && rate ? `≈ ZiG ${(withdraw * rate.rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} at today's rate` : null;

  const submit = async () => {
    try {
      const p = await request.mutateAsync({ currency, amountUsd });
      setAmount('');
      notify('Payout requested', `${p.reference}: ${p.currency === 'USD' ? usd(p.amount) : `ZiG ${p.amount.toFixed(2)}`}. We'll text you when it's sent.`);
    } catch (e) {
      notify('Could not request a payout', getErrorMessage(e));
    }
  };

  const downloadCsv = async () => {
    try {
      const csv = await fetchStatementCsv();
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `kuwana-statement-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        notify('Download on the web', 'Open the seller portal on a computer to download your CSV statement.');
      }
    } catch (e) {
      notify('Could not download', getErrorMessage(e));
    }
  };

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.tiles}>
        <StatTile label="Available" value={usd(b.available.usd)} tone="good" />
        <StatTile label="Pending" value={usd(b.pending.usd)} hint={`Held ${b.holdHours} h after delivery for disputes`} />
      </View>
      {b.inPayout.usd > 0 && <Typography variant="caption" color={t.textSecondary}>{usd(b.inPayout.usd)} is in payouts being processed.</Typography>}

      <Panel title="Withdraw">
        <Tabs value={currency} onChange={setCurrency} options={[{ value: 'USD', label: 'Pay me in USD' }, { value: 'ZWG', label: 'Pay me in ZiG' }]} />
        <Field label="Amount (USD)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={`${b.available.usd.toFixed(2)} (everything available)`} />
        {preview && <Typography variant="caption" color={t.textSecondary}>{preview}. The rate is fixed when you request.</Typography>}
        <Button label={`Request ${usd(withdraw)}`} onPress={submit} loading={request.isPending} disabled={withdraw <= 0} />
      </Panel>

      <PayoutDetails />

      {!!payouts?.length && (
        <Panel title="Payouts">
          {payouts.map((p) => (
            <View key={p.id} style={styles.rowBetween}>
              <View style={styles.flex}>
                <Typography variant="bodySm" weight="semibold">{p.currency === 'USD' ? usd(p.amount) : `ZiG ${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</Typography>
                <Typography variant="caption" color={t.textSecondary}>
                  {p.reference} · {formatDateTime(p.createdAt)}{p.externalRef ? ` · ref ${p.externalRef}` : ''}{p.note ? ` · ${p.note}` : ''}
                </Typography>
              </View>
              <Pill label={PAYOUT_STATUS[p.status].label} tone={PAYOUT_STATUS[p.status].tone} />
            </View>
          ))}
        </Panel>
      )}

      <Panel title="Statement · last 30 days" right={<Button label="CSV" size="sm" variant="ghost" onPress={downloadCsv} />}>
        {st?.entries.length ? st.entries.slice().reverse().map((e) => (
          <View key={e.id} style={styles.rowBetween}>
            <View style={styles.flex}>
              <Typography variant="bodySm">{e.label}{e.orderReference ? ` · ${e.orderReference}` : ''}</Typography>
              <Typography variant="caption" color={t.textSecondary} numberOfLines={1}>
                {formatDateTime(e.date)}{e.memo ? ` · ${e.memo}` : ''}{e.currency === 'ZWG' ? ` · ZiG ${e.grossTx.toFixed(2)}` : ''}
              </Typography>
            </View>
            <Typography variant="bodySm" weight="semibold" color={e.netUsd < 0 ? t.text : t.success}>
              {e.netUsd < 0 ? '−' : '+'}{usd(Math.abs(e.netUsd))}
            </Typography>
          </View>
        )) : <Typography variant="caption" color={t.textSecondary}>No activity in this period.</Typography>}
        <Typography variant="caption" color={t.textSecondary}>
          Lifetime: {formatPrice(b.lifetime.sales, 'USD')} sales, {formatPrice(b.lifetime.commission, 'USD')} commission, {formatPrice(b.lifetime.fulfilmentFees, 'USD')} fulfilment fees, {formatPrice(b.lifetime.paidOut, 'USD')} paid out.
        </Typography>
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  tiles: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  row2: { flexDirection: 'row', gap: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  mt: { marginTop: spacing.sm },
});

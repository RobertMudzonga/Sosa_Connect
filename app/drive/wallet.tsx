import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field, Panel, Pill, StatTile, Tabs, parseAmount, usd } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useDriverWallet, useDriverWithdraw, useFloatDeposit } from '@/src/hooks/useDriver';
import { useAuthStore } from '@/src/store/auth-store';
import { formatDateTime, getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { spacing } from '@/src/theme/spacing';

const ENTRY_LABEL: Record<string, string> = {
  FLOAT_DEPOSIT: 'Float top-up',
  FLOAT_WITHDRAWAL: 'Float withdrawal',
  COLLATERAL_LOCK: 'Locked for a job',
  COLLATERAL_RELEASE: 'Unlocked',
  COD_OFFSET: 'Cash you kept',
  DELIVERY_EARNING: 'Delivery fee',
  EARNINGS_WITHDRAWAL: 'Earnings withdrawal',
  PENALTY: 'Penalty',
  ADJUSTMENT: 'Adjustment',
};
const ZW = /^\+2637\d{8}$/;

/** The driver's collateral float (refundable) and earnings */
export default function DriverWalletScreen() {
  const t = useMarketTheme();
  const user = useAuthStore((s) => s.user);
  const { data: w, isLoading } = useDriverWallet();
  const deposit = useFloatDeposit();
  const withdraw = useDriverWithdraw();
  const [mode, setMode] = useState<'TOPUP' | 'WITHDRAW'>('TOPUP');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'ECOCASH' | 'INNBUCKS'>('ECOCASH');
  const [bucket, setBucket] = useState<'EARNINGS' | 'FLOAT'>('EARNINGS');
  const [phone, setPhone] = useState(user?.phone ?? '+263');

  if (isLoading || !w) return <View style={styles.center}><ActivityIndicator color={t.accent} /></View>;
  const value = parseAmount(amount);
  const max = mode === 'WITHDRAW' ? (bucket === 'EARNINGS' ? w.withdrawableEarningsUsd : w.availableFloatUsd) : 10_000;
  const missing = !value ? 'Enter an amount' : value > max ? `You can withdraw up to ${usd(max)}` : !ZW.test(phone) ? 'Enter the mobile number (+2637…)' : null;

  const submit = async () => {
    try {
      if (mode === 'TOPUP') {
        const res = await deposit.mutateAsync({ amountUsd: value!, method, phone });
        notify(res.status === 'PAID' ? 'Float topped up' : 'Approve on your phone', res.instructions ?? '');
      } else {
        await withdraw.mutateAsync({ bucket, amountUsd: value!, method, phone });
        notify('Withdrawal requested', 'Kuwana sends it to your mobile money, usually the same day.');
      }
      setAmount('');
    } catch (e) {
      notify('Not done', getErrorMessage(e));
    }
  };

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.tiles}>
        <StatTile label="Free float" value={usd(w.availableFloatUsd)} hint="Lets you take parcels" />
        <StatTile label="Locked" value={usd(w.lockedFloatUsd)} hint="In parcels you carry" />
      </View>
      <StatTile label="Earnings" value={usd(w.withdrawableEarningsUsd)} tone="good" hint="Delivery fees ready to withdraw" />
      <Typography variant="caption" color={t.textSecondary}>
        Your float is a refundable deposit. To take a job you need free float worth the parcel; it’s locked until you deliver. For cash orders you keep the cash and the same amount comes off your float. You can also top up with cash at a Kuwana agent.
      </Typography>

      <Panel>
        <Tabs value={mode} onChange={setMode} options={[{ value: 'TOPUP', label: 'Top up float' }, { value: 'WITHDRAW', label: 'Withdraw' }]} />
        {mode === 'WITHDRAW' && <Tabs value={bucket} onChange={setBucket} options={[{ value: 'EARNINGS', label: 'Earnings' }, { value: 'FLOAT', label: 'Free float' }]} />}
        <Field label="Amount (USD)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
        <Tabs value={method} onChange={setMethod} options={[{ value: 'ECOCASH', label: 'EcoCash' }, { value: 'INNBUCKS', label: 'InnBucks' }]} />
        <Field label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        {missing && <Typography variant="caption" color={t.textSecondary}>{missing}</Typography>}
        <Button label={mode === 'TOPUP' ? 'Top up' : 'Request withdrawal'} onPress={submit} loading={deposit.isPending || withdraw.isPending} disabled={!!missing} />
      </Panel>

      {w.withdrawals.length > 0 && (
        <Panel title="Withdrawals">
          {w.withdrawals.map((x) => (
            <View key={x.id} style={styles.row}>
              <Typography variant="bodySm" style={styles.flex}>{usd(x.amountUsd)} {x.bucket === 'FLOAT' ? 'float' : 'earnings'} · {x.method}</Typography>
              <Pill label={x.status.toLowerCase()} tone={x.status === 'PAID' ? 'good' : x.status === 'REJECTED' ? 'bad' : 'warn'} />
            </View>
          ))}
        </Panel>
      )}

      <Panel title="History">
        {w.entries.length === 0 && <Typography variant="bodySm" color={t.textSecondary}>Nothing yet.</Typography>}
        {w.entries.map((e) => {
          const delta = e.availableDeltaUsd + e.earningsDeltaUsd;
          return (
            <View key={e.id} style={styles.row}>
              <View style={styles.flex}>
                <Typography variant="bodySm">{ENTRY_LABEL[e.type] ?? e.type}{e.jobReference ? ` · ${e.jobReference}` : ''}</Typography>
                <Typography variant="caption" color={t.textSecondary}>{formatDateTime(e.createdAt)}</Typography>
              </View>
              <Typography variant="bodySm" weight="semibold" color={delta >= 0 ? t.success : t.text}>{delta >= 0 ? '+' : '−'}{usd(Math.abs(delta))}</Typography>
            </View>
          );
        })}
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
});

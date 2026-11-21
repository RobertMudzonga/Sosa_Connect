import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography } from '../common/Typography';
import { Button } from '../common/Button';
import { Field } from '../merchant/ui';
import { useMarketTheme } from '../marketplace/useMarketTheme';
import { useOpsAction, opsApi, OpsShipment } from '../../hooks/useOps';
import { getErrorMessage } from '../../utils/format';
import { notify } from '../../utils/notify';
import { spacing } from '../../theme/spacing';
import { money } from './OpsShipmentCard';

/** PIN (and cash, for COD) handover form shared by drivers and pickup agents */
export function HandoverForm({ s, onDone, label = 'Confirm handover' }: { s: OpsShipment; onDone: () => void; label?: string }) {
  const t = useMarketTheme();
  const [pin, setPin] = useState('');
  const [cash, setCash] = useState(s.cashToCollect ? String(s.cashToCollect.amount) : '');
  const handover = useOpsAction(() => opsApi.handover(s.id, { pin, cashCollected: s.cashToCollect ? Number(cash) : undefined }));
  const go = async () => {
    try {
      await handover.mutateAsync(undefined);
      onDone();
    } catch (e) {
      notify('Not handed over', getErrorMessage(e));
      setPin('');
    }
  };
  return (
    <View style={styles.form}>
      <Field label="Recipient's PIN" value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} placeholder="6 digits"
        hint="The recipient has it by SMS. Only hand over when it matches." />
      {s.cashToCollect && (
        <Field label={`Cash collected (${s.cashToCollect.currency === 'USD' ? 'USD' : 'ZiG'})`} value={cash} onChangeText={setCash} keyboardType="decimal-pad"
          hint={`Due: ${money(s.cashToCollect.amount, s.cashToCollect.currency)}. Enter what you actually received.`} />
      )}
      <View style={styles.row2}>
        <Button label="Cancel" variant="ghost" size="sm" onPress={onDone} style={styles.flex} />
        <Button label={label} size="sm" loading={handover.isPending} disabled={pin.length !== 6 || (!!s.cashToCollect && cash.trim() === '')} onPress={go} style={styles.flex} />
      </View>
      {!!s.cashToCollect && Number(cash) < s.cashToCollect.amount && cash.trim() !== '' && (
        <Typography variant="caption" color={t.warning}>Short by {money(s.cashToCollect.amount - Number(cash), s.cashToCollect.currency)}. This will show at cash-up.</Typography>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: spacing.sm },
  row2: { flexDirection: 'row', gap: spacing.sm },
});

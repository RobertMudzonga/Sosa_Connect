import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Switch, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Bike, Car, Truck, MapPin, Store, Wallet, ChevronRight, Banknote } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Panel, Pill, StatTile, usd } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useAvailableJobs, useDriverMe, useDriverStatus, useJobAction, useMyJobs, DriverJob } from '@/src/hooks/useDriver';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

const VEHICLE = { BIKE: Bike, CAR: Car, BAKKIE: Truck } as const;
const LOCATION_EVERY_MS = 60_000;

const ACTIVE_LABEL: Record<string, string> = {
  CLAIMED: 'Go to the store',
  IN_TRANSIT: 'Deliver',
  RETURNING: 'Take it back to the store',
};

async function currentPosition() {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') throw new Error('Allow location access to go online: stores and customers are matched to you by distance.');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

function JobCard({ j, onOpen, onClaim, claiming }: { j: DriverJob; onOpen?: () => void; onClaim?: () => void; claiming?: boolean }) {
  const t = useMarketTheme();
  const Icon = VEHICLE[j.vehicleRequired];
  // A disabled touchable would also disable the claim button inside it (on web), so feed cards are plain views
  const Card = onOpen ? TouchableOpacity : View;
  return (
    <Card onPress={onOpen} style={[styles.job, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={styles.rowBetween}>
        <Typography variant="h3" weight="bold" color={t.success}>{usd(j.earningsUsd)}</Typography>
        <View style={styles.inline}>
          <Icon size={15} color={t.textSecondary} />
          <Typography variant="caption" color={t.textSecondary}>{j.tripKm.toFixed(1)} km trip{j.kmToStore !== null ? ` · store ${j.kmToStore} km away` : ''}</Typography>
        </View>
      </View>
      <View style={styles.inline}>
        <Store size={13} color={t.textSecondary} />
        <Typography variant="bodySm" weight="semibold" style={styles.flex}>{j.store.name}</Typography>
      </View>
      <View style={styles.inline}>
        <MapPin size={13} color={t.textSecondary} />
        <Typography variant="bodySm" style={styles.flex}>
          {j.dropoff.type === 'PICKUP_POINT' ? `To ${j.dropoff.name ?? 'a pickup point'}, ` : 'To '}{j.dropoff.area || 'customer'}
        </Typography>
      </View>
      <Typography variant="caption" color={t.textSecondary}>{j.parcel.items.join(' · ')}</Typography>
      <View style={styles.inline}>
        <Typography variant="caption" color={t.textSecondary}>Locks {usd(j.collateralUsd)} of your float</Typography>
        {j.cashOnDelivery && (
          <>
            <Banknote size={12} color={t.warning} />
            <Typography variant="caption" color={t.warning}>Collect {usd(j.cashOnDelivery.amountUsd)} cash</Typography>
          </>
        )}
      </View>
      {ACTIVE_LABEL[j.status] && <Pill label={ACTIVE_LABEL[j.status]} tone={j.status === 'RETURNING' ? 'warn' : 'info'} />}
      {onClaim && (
        j.canClaim
          ? <Button label="Take this job" size="sm" onPress={onClaim} loading={claiming} />
          : <Typography variant="caption" color={t.error}>Top up {usd(j.floatShortUsd ?? 0)} more float to take this job</Typography>
      )}
    </Card>
  );
}

/** Driver home: status, float, jobs in hand and nearby jobs */
export default function DriveHome() {
  const t = useMarketTheme();
  const router = useRouter();
  const { data: me, isLoading, refetch } = useDriverMe();
  const approved = me?.kycStatus === 'APPROVED';
  const online = approved && !!me?.isOnline;
  const status = useDriverStatus();
  const { data: mine, refetch: refetchMine } = useMyJobs(approved);
  const { data: feed, error: feedError, isFetching: feedLoading, refetch: refetchFeed } = useAvailableJobs(online);
  const act = useJobAction();
  const statusRef = useRef(status);
  statusRef.current = status;

  // Keep sharing location while online so the feed and broadcasts stay accurate
  useEffect(() => {
    if (!online) return;
    const tick = () => currentPosition().then((p) => statusRef.current.mutateAsync(p)).catch(() => {});
    const timer = setInterval(tick, LOCATION_EVERY_MS);
    return () => clearInterval(timer);
  }, [online]);

  const toggle = useCallback(async (next: boolean) => {
    try {
      if (next) await status.mutateAsync({ isOnline: true, ...(await currentPosition()) });
      else await status.mutateAsync({ isOnline: false });
    } catch (e) {
      notify(next ? 'Could not go online' : 'Could not go offline', getErrorMessage(e));
    }
  }, [status]);

  const claim = async (j: DriverJob) => {
    try {
      await act.mutateAsync({ id: j.id, action: 'claim' });
      router.push({ pathname: '/drive/job/[id]', params: { id: j.id } });
    } catch (e) {
      notify('Could not take this job', getErrorMessage(e));
    }
  };

  if (isLoading) return <View style={[styles.center, { backgroundColor: t.background }]}><ActivityIndicator color={t.accent} /></View>;

  if (!me || me.kycStatus !== 'APPROVED') {
    const copy = !me
      ? { title: 'Earn by delivering from local stores', body: 'Use your motorbike, car or bakkie. Pick up packed orders from shops near you and deliver them to customers or pickup points.', cta: 'Apply to drive' }
      : me.kycStatus === 'PENDING'
        ? { title: 'Application received', body: 'We’re checking your documents. We’ll text you when your account is approved.', cta: null }
        : me.kycStatus === 'REJECTED'
          ? { title: 'Your application needs changes', body: me.rejectionNote ?? 'Check your details and resend.', cta: 'Fix and resend' }
          : { title: 'Your driver account is suspended', body: me.rejectionNote ?? 'Contact Kuwana support.', cta: null };
    return (
      <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll}>
        <Panel title={copy.title}>
          <Typography variant="bodySm" color={t.textSecondary}>{copy.body}</Typography>
          {copy.cta && <Button label={copy.cta} onPress={() => router.push('/drive/apply')} />}
        </Panel>
      </ScrollView>
    );
  }

  const w = me.wallet;
  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => { refetch(); refetchMine(); if (online) refetchFeed(); }} />}
    >
      <Panel>
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <Typography variant="h3" weight="bold">{online ? 'You’re online' : 'You’re offline'}</Typography>
            <Typography variant="caption" color={t.textSecondary}>
              {online ? 'Nearby stores can send you jobs.' : 'Go online to see jobs near you.'} · {me.completedJobs} deliveries
            </Typography>
          </View>
          <Switch value={online} onValueChange={toggle} disabled={status.isPending} />
        </View>
      </Panel>

      <TouchableOpacity onPress={() => router.push('/drive/wallet')}>
        <View style={styles.tiles}>
          <StatTile label="Free float" value={usd(w.availableFloatUsd)} hint={w.lockedFloatUsd ? `${usd(w.lockedFloatUsd)} locked in jobs` : 'Covers the parcels you carry'} />
          <StatTile label="Earnings" value={usd(w.withdrawableEarningsUsd)} tone="good" hint="Ready to withdraw" />
        </View>
        <View style={[styles.inline, styles.walletLink]}>
          <Wallet size={14} color={t.accent} />
          <Typography variant="bodySm" weight="semibold" color={t.accent}>Top up, withdraw and history</Typography>
          <ChevronRight size={14} color={t.accent} />
        </View>
      </TouchableOpacity>

      {!!mine?.active.length && (
        <View style={styles.gap}>
          <Typography variant="body" weight="bold">In hand ({mine.active.length})</Typography>
          {mine.active.map((j) => <JobCard key={j.id} j={j} onOpen={() => router.push({ pathname: '/drive/job/[id]', params: { id: j.id } })} />)}
        </View>
      )}

      {online && (
        <View style={styles.gap}>
          <View style={styles.rowBetween}>
            <Typography variant="body" weight="bold">Jobs near you</Typography>
            {feedLoading && <ActivityIndicator size="small" color={t.accent} />}
          </View>
          {feedError && <Typography variant="bodySm" color={t.error}>{getErrorMessage(feedError)}</Typography>}
          {feed?.length === 0 && <Typography variant="bodySm" color={t.textSecondary}>No jobs nearby right now. New ones appear as stores pack orders.</Typography>}
          {(feed ?? []).map((j) => (
            <JobCard key={j.id} j={j} onClaim={() => claim(j)} claiming={act.isPending && act.variables?.id === j.id} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  walletLink: { marginTop: spacing.xs, alignSelf: 'flex-end' },
  gap: { gap: spacing.sm },
  job: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: 6 },
});

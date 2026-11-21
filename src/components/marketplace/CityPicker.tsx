import React, { useMemo, useState } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, FlatList, TextInput, Pressable, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { MapPin, Check, X, LocateFixed, ChevronLeft } from 'lucide-react-native';
import { Typography } from '../common/Typography';
import { useCities, City } from '../../hooks/useCatalog';
import { locationLabel, useMarketStore } from '../../store/market-store';
import { radius, spacing } from '../../theme/spacing';
import { useMarketTheme } from './useMarketTheme';

/** Straight-line km, for snapping a GPS fix to the nearest town */
function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/**
 * "Deliver to Avondale, Harare ▾" chip. Opens a sheet to pick a town, then (optionally) a suburb,
 * or to use the device's GPS. Stores are ranked by distance from the chosen spot, so the more
 * precise the location, the better the delivery estimates.
 */
export const CityPicker: React.FC = () => {
  const t = useMarketTheme();
  const { city, suburb, pin, setCity, setSuburb, setPin } = useMarketStore();
  const { data: cities, isLoading } = useCities();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  /** Town whose suburbs are being shown */
  const [step, setStep] = useState<City | null>(null);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (step) return step.suburbs.filter((s) => !f || s.name.toLowerCase().includes(f));
    return (cities ?? []).filter((c) => !f || c.name.toLowerCase().includes(f) || c.province.toLowerCase().includes(f));
  }, [cities, filter, step]);

  const close = () => {
    setOpen(false);
    setFilter('');
    setStep(null);
    setGpsError(null);
  };

  const chooseCity = (c: City | null) => {
    if (!c) {
      setCity(null);
      return close();
    }
    setCity({ slug: c.slug, name: c.name });
    if (c.suburbs.length) {
      setStep(c);
      setFilter('');
    } else {
      close();
    }
  };

  const useMyLocation = async () => {
    setGpsError(null);
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setGpsError('Location permission was not given. Choose your town instead.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const nearest = (cities ?? [])
        .filter((c) => c.lat != null && c.lng != null)
        .map((c) => ({ c, d: km(here, { lat: c.lat!, lng: c.lng! }) }))
        .sort((a, b) => a.d - b.d)[0];
      if (!nearest || nearest.d > 60) {
        setGpsError('You seem to be outside our delivery towns. Choose where to deliver instead.');
        return;
      }
      setPin({ slug: nearest.c.slug, name: nearest.c.name }, here);
      close();
    } catch {
      setGpsError('Could not get your location. Choose your town instead.');
    } finally {
      setLocating(false);
    }
  };

  const label = locationLabel({ city, suburb, pin });

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[styles.chip, { backgroundColor: t.surfaceVariant, borderColor: t.border }]}
        accessibilityRole="button"
        accessibilityLabel={`Delivery location: ${label ?? 'not set'}. Change`}
      >
        {pin ? <LocateFixed size={14} color={t.accent} /> : <MapPin size={14} color={t.accent} />}
        <Typography variant="bodySm" weight="semibold" numberOfLines={1} style={styles.chipText}>
          {label ? `Deliver to ${label}` : 'Set delivery location'}
        </Typography>
        <Typography variant="bodySm" color={t.textSecondary}>▾</Typography>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={[styles.sheet, { backgroundColor: t.surface }]}>
          <View style={styles.sheetHeader}>
            <View style={[styles.inline, styles.flex]}>
              {step && (
                <TouchableOpacity onPress={() => { setStep(null); setFilter(''); }} accessibilityLabel="Back to towns">
                  <ChevronLeft size={22} color={t.text} />
                </TouchableOpacity>
              )}
              <Typography variant="h3" weight="bold">{step ? `Where in ${step.name}?` : 'Where should we deliver?'}</Typography>
            </View>
            <TouchableOpacity onPress={close} accessibilityLabel="Close">
              <X size={22} color={t.text} />
            </TouchableOpacity>
          </View>
          <Typography variant="bodySm" color={t.textSecondary} style={styles.hint}>
            {step
              ? 'Pick your suburb for accurate delivery times and fees.'
              : 'We show the nearest open store with the best delivered price first.'}
          </Typography>

          {!step && (
            <TouchableOpacity
              onPress={useMyLocation}
              disabled={locating}
              style={[styles.gps, { borderColor: t.accent }]}
              accessibilityRole="button"
            >
              {locating ? <ActivityIndicator color={t.accent} size="small" /> : <LocateFixed size={18} color={t.accent} />}
              <Typography variant="body" weight="semibold" color={t.accent}>
                {locating ? 'Finding you…' : 'Use my current location'}
              </Typography>
            </TouchableOpacity>
          )}
          {gpsError && <Typography variant="caption" color={t.warning} style={styles.hint}>{gpsError}</Typography>}

          <TextInput
            value={filter}
            onChangeText={setFilter}
            placeholder={step ? 'Search suburbs' : 'Search towns'}
            placeholderTextColor={t.textSecondary}
            style={[styles.search, { backgroundColor: t.surfaceVariant, color: t.text }]}
          />
          <FlatList<{ id: string; name: string } | City>
            data={visible}
            keyExtractor={(c) => c.id}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              step ? (
                <TouchableOpacity style={[styles.row, { borderColor: t.border }]} onPress={() => { setSuburb(null); close(); }}>
                  <View style={styles.flex}>
                    <Typography variant="body" weight="semibold">Anywhere in {step.name}</Typography>
                    <Typography variant="caption" color={t.textSecondary}>Estimates from the town centre</Typography>
                  </View>
                  {city?.slug === step.slug && !suburb && !pin && <Check size={18} color={t.accent} />}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.row, { borderColor: t.border }]} onPress={() => chooseCity(null)}>
                  <View style={styles.flex}>
                    <Typography variant="body" weight="semibold">Anywhere in Zimbabwe</Typography>
                    <Typography variant="caption" color={t.textSecondary}>Browse everything; delivery shown at checkout</Typography>
                  </View>
                  {!city && <Check size={18} color={t.accent} />}
                </TouchableOpacity>
              )
            }
            ListEmptyComponent={
              <Typography variant="bodySm" color={t.textSecondary} style={styles.hint}>
                {isLoading ? 'Loading towns…' : step ? 'No suburbs match.' : 'No towns match.'}
              </Typography>
            }
            renderItem={({ item }) =>
              step ? (
                <TouchableOpacity style={[styles.row, { borderColor: t.border }]} onPress={() => { setSuburb({ id: item.id, name: item.name }); close(); }}>
                  <Typography variant="body" weight="semibold" style={styles.flex}>{item.name}</Typography>
                  {suburb?.id === item.id && <Check size={18} color={t.accent} />}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.row, { borderColor: t.border }]} onPress={() => chooseCity(item as City)}>
                  <View style={styles.flex}>
                    <Typography variant="body" weight="semibold">{item.name}</Typography>
                    <Typography variant="caption" color={t.textSecondary}>
                      {(item as City).province}{(item as City).suburbs.length ? ` · ${(item as City).suburbs.length} suburbs` : ''}
                    </Typography>
                  </View>
                  {city?.slug === (item as City).slug && <Check size={18} color={t.accent} />}
                </TouchableOpacity>
              )
            }
          />
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, maxWidth: '100%' },
  chipText: { flexShrink: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)' },
  sheet: { maxHeight: '85%', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hint: { marginTop: 4, marginBottom: spacing.md },
  gps: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  search: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.sm, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});

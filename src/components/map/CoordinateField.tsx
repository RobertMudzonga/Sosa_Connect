import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { MapPin, X, LocateFixed, Keyboard } from 'lucide-react-native';
import { Typography } from '../common/Typography';
import { Button } from '../common/Button';
import { useMarketTheme } from '../marketplace/useMarketTheme';
import { radius, spacing } from '../../theme/spacing';
import { PinMap, MapViewHandle } from './MapView';
import { MapPoint, ZIMBABWE_CENTRE } from './mapHtml';

interface Props {
  label: string;
  value: MapPoint | null;
  onChange: (p: MapPoint | null) => void;
  /** Where to open the map when there's no pin yet (e.g. the town centre) */
  centre?: MapPoint | null;
  hint?: string;
  /** Allow clearing the pin */
  optional?: boolean;
  /** 'link': a one-line caption that opens the map (for lists) */
  variant?: 'field' | 'link';
  /** Extra caption text after the coordinates (link variant) */
  suffix?: string;
}

const fmt = (p: MapPoint) => `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;

/** A map pin as a form field: shows the coordinates and opens a full-screen map to place the pin */
export function CoordinateField({ label, value, onChange, centre, hint, optional, variant = 'field', suffix = '' }: Props) {
  const t = useMarketTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MapPoint | null>(value);
  const [typing, setTyping] = useState(false);
  const [latText, setLatText] = useState('');
  const [lngText, setLngText] = useState('');
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const map = useRef<MapViewHandle>(null);

  const openMap = () => {
    setDraft(value);
    setTyping(false);
    setError(null);
    setOpen(true);
  };
  const onMove = useCallback((p: MapPoint) => { setDraft(p); setError(null); }, []);
  const jump = (p: MapPoint) => { setDraft(p); map.current?.setPin(p, 17); };

  const locate = async () => {
    setLocating(true);
    setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') throw new Error('Location permission was refused');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      jump({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not find your location');
    } finally {
      setLocating(false);
    }
  };

  const applyTyped = () => {
    const lat = Number(latText.trim());
    const lng = Number(lngText.trim());
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || !latText.trim() || !lngText.trim()) {
      setError('Enter a latitude (−90 to 90) and longitude (−180 to 180), e.g. -17.8292 and 31.0522');
      return;
    }
    jump({ lat, lng });
    setTyping(false);
  };

  const start = value ?? centre ?? ZIMBABWE_CENTRE;
  const zoom = value ? 16 : centre ? 13 : 6;

  const trigger = variant === 'link' ? (
    <TouchableOpacity onPress={openMap} accessibilityRole="button" accessibilityLabel={`${label}: ${value ? fmt(value) : 'not set'}. Pick on map`} style={styles.link}>
      <MapPin size={12} color={value ? t.accent : t.textSecondary} />
      <Typography variant="caption" color={t.textSecondary}>
        {value ? `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}` : 'No centre pin'}{suffix} · <Typography variant="caption" weight="semibold" color={t.accent}>{value ? 'move' : 'set pin'}</Typography>
      </Typography>
    </TouchableOpacity>
  ) : null;

  return (
    <View style={variant === 'link' ? undefined : styles.field}>
      {trigger}
      {variant === 'field' && <Typography variant="bodySm" weight="semibold">{label}</Typography>}
      {variant === 'field' && <TouchableOpacity onPress={openMap} style={[styles.box, { backgroundColor: t.surface, borderColor: t.border }]} accessibilityRole="button" accessibilityLabel={`${label}: ${value ? fmt(value) : 'not set'}. Pick on map`}>
        <View style={[styles.badge, { backgroundColor: t.surfaceVariant }]}>
          <MapPin size={16} color={value ? t.accent : t.textSecondary} />
        </View>
        <View style={styles.flex}>
          <Typography variant="bodySm" weight={value ? 'semibold' : 'regular'} color={value ? t.text : t.textSecondary}>
            {value ? fmt(value) : 'No pin yet'}
          </Typography>
          {!!hint && <Typography variant="caption" color={t.textSecondary}>{hint}</Typography>}
        </View>
        <Typography variant="bodySm" weight="semibold" color={t.accent}>{value ? 'Move pin' : 'Pick on map'}</Typography>
      </TouchableOpacity>}
      {variant === 'field' && optional && value && (
        <TouchableOpacity onPress={() => onChange(null)} style={styles.clear}>
          <Typography variant="caption" color={t.textSecondary}>Remove pin</Typography>
        </TouchableOpacity>
      )}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)} presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}>
        <SafeAreaView style={[styles.modal, { backgroundColor: t.background }]} edges={['top', 'bottom']}>
          <View style={[styles.top, { borderColor: t.border, backgroundColor: t.surface }]}>
            <TouchableOpacity onPress={() => setOpen(false)} accessibilityLabel="Close map" style={styles.iconBtn}>
              <X size={22} color={t.text} />
            </TouchableOpacity>
            <Typography variant="body" weight="bold" style={styles.flex} numberOfLines={1}>{label}</Typography>
          </View>

          <View style={styles.map}>
            <PinMap ref={map} pin={value} centre={start} zoom={zoom} accent={t.primary} onMove={onMove} />
          </View>

          <View style={[styles.bottom, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Typography variant="bodySm" weight="semibold">{draft ? fmt(draft) : 'Tap the map to drop the pin'}</Typography>
            {error && <Typography variant="caption" color={t.error}>{error}</Typography>}
            {typing && (
              <View style={styles.row}>
                <TextInput value={latText} onChangeText={setLatText} placeholder="Latitude" placeholderTextColor={t.textSecondary} keyboardType="numbers-and-punctuation"
                  style={[styles.input, { borderColor: t.border, color: t.text, backgroundColor: t.surfaceVariant }]} />
                <TextInput value={lngText} onChangeText={setLngText} placeholder="Longitude" placeholderTextColor={t.textSecondary} keyboardType="numbers-and-punctuation"
                  style={[styles.input, { borderColor: t.border, color: t.text, backgroundColor: t.surfaceVariant }]} />
                <Button label="Go" size="sm" variant="outline" onPress={applyTyped} />
              </View>
            )}
            <View style={styles.row}>
              <TouchableOpacity onPress={locate} disabled={locating} style={[styles.chip, { borderColor: t.border }]}>
                {locating ? <ActivityIndicator size="small" color={t.accent} /> : <LocateFixed size={15} color={t.accent} />}
                <Typography variant="caption" weight="semibold">{locating ? 'Finding you…' : 'Use my location'}</Typography>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setTyping((v) => !v); setLatText(draft ? draft.lat.toFixed(6) : ''); setLngText(draft ? draft.lng.toFixed(6) : ''); }} style={[styles.chip, { borderColor: t.border }]}>
                <Keyboard size={15} color={t.textSecondary} />
                <Typography variant="caption" weight="semibold">Type coordinates</Typography>
              </TouchableOpacity>
            </View>
            <Button label="Use this pin" disabled={!draft} onPress={() => { if (draft) onChange({ lat: Number(draft.lat.toFixed(6)), lng: Number(draft.lng.toFixed(6)) }); setOpen(false); }} />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  field: { gap: 6 },
  box: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, minHeight: 52 },
  badge: { width: 32, height: 32, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  clear: { alignSelf: 'flex-start' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modal: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  iconBtn: { padding: 4 },
  map: { flex: 1 },
  bottom: { padding: spacing.md, gap: spacing.sm, borderTopWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 7 },
  input: { flex: 1, minWidth: 110, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 8, fontSize: 14 },
});

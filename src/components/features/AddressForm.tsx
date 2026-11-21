import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { LocateFixed } from 'lucide-react-native';
import { Button } from '../common/Button';
import { TextField, Chip } from '../common/TextField';
import { theme } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCreateAddress, Address } from '../../hooks/useAddresses';
import { useCities } from '../../hooks/useCatalog';
import { OptionPicker } from '../common/OptionPicker';
import { CoordinateField } from '../map/CoordinateField';
import { notify } from '../../utils/notify';
import { getErrorMessage } from '../../utils/format';

const LABELS = ['Home', 'Work', 'Other'];

interface AddressFormProps {
  onSaved?: (address: Address) => void;
  onCancel?: () => void;
}

export const AddressForm: React.FC<AddressFormProps> = ({ onSaved, onCancel }) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const createAddress = useCreateAddress();

  const [label, setLabel] = useState('Home');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const { data: cities } = useCities();
  const [cityId, setCityId] = useState<string | null>(null);
  const [suburb, setSuburb] = useState<string | null>(null);
  const [landmark, setLandmark] = useState('');
  const [instructions, setInstructions] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        notify('Location permission needed', 'Allow location access to fill in your address automatically.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      setCoords({ lat: latitude, lng: longitude });
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude }).catch(() => []);
      if (place) {
        setLine1([place.streetNumber, place.street].filter(Boolean).join(' ') || place.name || '');
        const detected = (place.city || place.subregion || '').toLowerCase();
        const match = cities?.find((c) => c.name.toLowerCase() === detected);
        if (match) setCityId(match.id);
        if (place.district) setSuburb(place.district);
      }
    } catch (error) {
      notify('Could not get your location', getErrorMessage(error));
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    if (!line1.trim() || !cityId) {
      notify('Missing details', 'Please enter a street address and choose your town.');
      return;
    }
    try {
      const saved = await createAddress.mutateAsync({
        label,
        line1: line1.trim(),
        line2: line2.trim() || undefined,
        cityId,
        suburb: suburb || undefined,
        landmark: landmark.trim() || undefined,
        instructions: instructions.trim() || undefined,
        lat: coords?.lat,
        lng: coords?.lng,
      });
      onSaved?.(saved);
    } catch (error) {
      notify('Could not save address', getErrorMessage(error));
    }
  };

  return (
    <View>
      <Button
        label={locating ? 'Locating…' : 'Use my current location'}
        variant="outline"
        size="sm"
        loading={locating}
        icon={<LocateFixed size={16} color={activeTheme.primary} />}
        onPress={useCurrentLocation}
        style={styles.locateBtn}
      />
      <View style={styles.labels}>
        {LABELS.map((l) => <Chip key={l} label={l} selected={label === l} onPress={() => setLabel(l)} />)}
      </View>
      <TextField label="Street address" placeholder="e.g. 12 Samora Machel Ave" value={line1} onChangeText={setLine1} />
      <TextField label="Building / flat (optional)" placeholder="e.g. Flat 4, Kuwana House" value={line2} onChangeText={setLine2} />
      <OptionPicker
        label="Town or city"
        placeholder="Choose your town"
        value={cityId}
        options={(cities ?? []).map((c) => ({ value: c.id, label: c.name, hint: c.province }))}
        onChange={(id) => { setCityId(id); setSuburb(null); }}
      />
      {!!cityId && (
        <OptionPicker
          label="Suburb (optional)"
          placeholder="Choose or type your suburb"
          value={suburb}
          options={(cities?.find((c) => c.id === cityId)?.suburbs ?? []).map((sb) => ({ value: sb.name, label: sb.name }))}
          onChange={setSuburb}
          allowCustom
        />
      )}
      <View style={styles.pin}>
        <CoordinateField
          label="Pin on the map (recommended)"
          value={coords}
          onChange={setCoords}
          centre={(() => {
            const c = cities?.find((x) => x.id === cityId);
            return c?.lat != null && c.lng != null ? { lat: c.lat, lng: c.lng } : null;
          })()}
          hint="Exact delivery fees, and the driver finds your gate"
          optional
        />
      </View>
      <TextField
        label="Landmark (optional)"
        placeholder="e.g. Blue gate opposite the clinic"
        value={landmark}
        onChangeText={setLandmark}
      />
      <TextField
        label="Delivery instructions (optional)"
        placeholder="Gate code, landmarks…"
        value={instructions}
        onChangeText={setInstructions}
        multiline
      />
      <View style={styles.actions}>
        {onCancel && <Button label="Cancel" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />}
        <Button label="Save address" variant="primary" loading={createAddress.isPending} onPress={handleSave} style={{ flex: 1 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pin: { marginBottom: spacing.md },
  locateBtn: { marginBottom: spacing.md },
  labels: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md },
});

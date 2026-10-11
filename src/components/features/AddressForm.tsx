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
  const [city, setCity] = useState('');
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
        setLine2(place.district || place.subregion || '');
        setCity(place.city || place.region || '');
      }
    } catch (error) {
      notify('Could not get your location', getErrorMessage(error));
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    if (!line1.trim() || !city.trim()) {
      notify('Missing details', 'Please enter at least a street address and city.');
      return;
    }
    try {
      const saved = await createAddress.mutateAsync({
        label,
        line1: line1.trim(),
        line2: line2.trim() || undefined,
        city: city.trim(),
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
      <TextField label="Suburb / building (optional)" placeholder="e.g. Avondale, Flat 4" value={line2} onChangeText={setLine2} />
      <TextField label="City" placeholder="e.g. Harare" value={city} onChangeText={setCity} />
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
  locateBtn: { marginBottom: spacing.md },
  labels: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md },
});

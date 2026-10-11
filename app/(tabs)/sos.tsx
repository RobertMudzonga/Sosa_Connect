import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, ScrollView, Platform, ActivityIndicator } from 'react-native';
import * as SMS from 'expo-sms';
import { useRouter } from 'expo-router';
import AppMap from '@/components/Map';
import * as Location from 'expo-location';
import { Typography } from '@/src/components/common/Typography';
import { SOSButton } from '@/src/components/features/SOSButton';
import { Card } from '@/src/components/common/Card';
import { theme, palette } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Phone, MapPin, Shield, Ambulance, Flame, Globe, CheckCircle2, XCircle, MessageSquare, UserPlus } from 'lucide-react-native';
import { useEmergencyContacts, sendEmergencyAlert, FALLBACK_EMERGENCY_NUMBER, EmergencyContact } from '@/src/hooks/useEmergency';
import { Button } from '@/src/components/common/Button';
import { useEmergencyStore } from '@/src/store/emergency-store';
import { useAuthStore } from '@/src/store/auth-store';

// Zimbabwe public emergency numbers, shown when the server list can't load (e.g. weak signal)
const FALLBACK_CONTACTS: EmergencyContact[] = [
  { id: 'police', label: 'Police', phone: '995', category: 'security' },
  { id: 'ambulance', label: 'Ambulance', phone: '994', category: 'medical' },
  { id: 'fire', label: 'Fire', phone: '993', category: 'fire' },
  { id: 'emergency', label: 'Emergency', phone: FALLBACK_EMERGENCY_NUMBER, category: 'general' },
];

type AlertState = 'idle' | 'sending' | 'sent' | 'failed';
type SmsState = 'none' | 'opened' | 'unavailable' | 'no-contacts';

const getIcon = (category: string) => {
  switch (category) {
    case 'medical': return Ambulance;
    case 'fire': return Flame;
    case 'security': return Shield;
    default: return Globe;
  }
};

const getColor = (category: string) => {
  switch (category) {
    case 'medical': return palette.danger;
    case 'fire': return palette.warning;
    case 'security': return palette.primary[600];
    default: return palette.neutral[500];
  }
};

export default function SOSScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const router = useRouter();
  const { data: serverContacts } = useEmergencyContacts();
  const contacts = serverContacts?.length ? serverContacts : FALLBACK_CONTACTS;
  const primaryNumber = contacts.find((c) => c.category === 'general')?.phone ?? FALLBACK_EMERGENCY_NUMBER;
  const trustedContacts = useEmergencyStore((s) => s.contacts);
  const user = useAuthStore((s) => s.user);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [triggered, setTriggered] = useState(false);
  const [alertState, setAlertState] = useState<AlertState>('idle');
  const [smsState, setSmsState] = useState<SmsState>('none');

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    })();
  }, []);

  const getFreshLocation = async () => {
    try {
      const { granted } = await Location.getForegroundPermissionsAsync();
      if (!granted) return location;
      // Don't let a slow GPS fix hold up the alert
      const fresh = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ]);
      return fresh ?? location ?? (await Location.getLastKnownPositionAsync());
    } catch {
      return location;
    }
  };

  const textContacts = async (loc: Location.LocationObject | null) => {
    if (!trustedContacts.length) return setSmsState('no-contacts');
    if (Platform.OS === 'web' || !(await SMS.isAvailableAsync())) return setSmsState('unavailable');
    const where = loc
      ? `My location: https://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`
      : 'I could not get my location.';
    await SMS.sendSMSAsync(
      trustedContacts.map((c) => c.phone),
      `SOS from ${user?.fullName ?? 'a Kuwana user'}: I need help. ${where}`,
    );
    setSmsState('opened');
  };

  const handleSOS = async () => {
    setTriggered(true);
    setAlertState('sending');
    setSmsState('none');
    const loc = await getFreshLocation();
    if (loc) setLocation(loc);

    // Best effort: notify the Kuwana team. Shown honestly if it fails (offline, logged out).
    sendEmergencyAlert({ lat: loc?.coords.latitude, lng: loc?.coords.longitude, accuracy: loc?.coords.accuracy ?? undefined })
      .then(() => setAlertState('sent'))
      .catch(() => setAlertState('failed'));

    await textContacts(loc).catch(() => setSmsState('unavailable'));
  };

  const callService = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <View style={styles.mapContainer}>
        {location ? (
          <AppMap
            style={styles.map}
            colorScheme={colorScheme}
            markers={[{
              id: 'me',
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              color: palette.danger,
              title: 'You are here',
            }]}
          />
        ) : (
          <View style={[styles.mapPlaceholder, { backgroundColor: activeTheme.surfaceVariant }]}>
            <Typography color={activeTheme.textSecondary}>
              {errorMsg || 'Locating you...'}
            </Typography>
          </View>
        )}
        
        <View style={styles.locationBadge}>
          <MapPin size={14} color={activeTheme.primary} />
          <Typography variant="caption" weight="bold" style={{ marginLeft: 4 }}>
            {location ? 'YOUR LOCATION' : 'LOCATION OFF'}
          </Typography>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Typography variant="h2" weight="bold" align="center" style={styles.title}>
          Emergency Hub
        </Typography>
        
        <SOSButton onTrigger={handleSOS} />

        {triggered && (
          <Card variant="outlined" style={[styles.resultCard, { borderColor: palette.danger }]}>
            <Button
              label={`Call ${primaryNumber} now`}
              variant="danger"
              size="lg"
              icon={<Phone size={20} color="#fff" />}
              onPress={() => callService(primaryNumber)}
            />
            <View style={styles.resultRow}>
              {alertState === 'sending' ? <ActivityIndicator size="small" color={activeTheme.primary} />
                : alertState === 'sent' ? <CheckCircle2 size={18} color={palette.success} />
                : <XCircle size={18} color={palette.danger} />}
              <Typography variant="bodySm" style={{ flex: 1 }}>
                {alertState === 'sending' ? 'Alerting the Kuwana team…'
                  : alertState === 'sent' ? `Kuwana team alerted${location ? ' with your location' : ''}.`
                  : 'Could not reach the Kuwana team. Call the number above directly.'}
              </Typography>
            </View>
            <View style={styles.resultRow}>
              {smsState === 'opened' ? <CheckCircle2 size={18} color={palette.success} /> : <MessageSquare size={18} color={activeTheme.textSecondary} />}
              <Typography variant="bodySm" style={{ flex: 1 }}>
                {smsState === 'opened' ? `Text to ${trustedContacts.length} emergency contact${trustedContacts.length > 1 ? 's' : ''} opened. Make sure you pressed Send.`
                  : smsState === 'no-contacts' ? 'You have no emergency contacts saved.'
                  : smsState === 'unavailable' ? 'Texting is not available on this device.'
                  : 'Preparing a text to your emergency contacts…'}
              </Typography>
            </View>
            {smsState === 'opened' && (
              <Button label="Text contacts again" variant="ghost" size="sm" onPress={() => textContacts(location)} />
            )}
            <Typography variant="caption" color={activeTheme.textSecondary}>
              Police, ambulance and fire are not contacted automatically. Call them directly.
            </Typography>
          </Card>
        )}

        <View style={styles.servicesGrid}>
          {contacts?.map((service) => {
            const Icon = getIcon(service.category);
            return (
              <TouchableOpacity key={service.id} onPress={() => callService(service.phone)}>
                <Card variant="flat" style={styles.serviceCard}>
                  <View style={[styles.iconBox, { backgroundColor: getColor(service.category) }]}>
                    <Icon color="#fff" size={20} />
                  </View>
                  <Typography variant="bodySm" weight="bold">{service.label}</Typography>
                  <Typography variant="caption" color={activeTheme.textSecondary}>{service.phone}</Typography>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>

        <Card variant="outlined" style={styles.infoCard}>
          <Typography variant="bodySm" weight="semibold">What SOS does</Typography>
          <Typography variant="caption" color={activeTheme.textSecondary} style={{ marginTop: 4 }}>
            Holding SOS for 3 seconds alerts the Kuwana support team with your location, opens a text to your emergency
            contacts, and gives you one tap to call {primaryNumber}. Your location is only shared when you trigger SOS.
          </Typography>
          <Button
            label={trustedContacts.length ? `Emergency contacts (${trustedContacts.length})` : 'Add emergency contacts'}
            variant="ghost"
            size="sm"
            icon={<UserPlus size={16} color={activeTheme.primary} />}
            onPress={() => router.push('/emergency-contacts')}
            style={{ alignSelf: 'flex-start', marginTop: spacing.sm, paddingHorizontal: 0 }}
          />
        </Card>
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    height: '40%',
    width: '100%',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationBadge: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    marginBottom: spacing.md,
  },
  resultCard: {
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  serviceCard: {
    alignItems: 'center',
    width: 100,
    gap: 4,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoCard: {
    marginTop: spacing.md,
  }
});

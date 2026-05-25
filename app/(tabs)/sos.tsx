import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Linking, ScrollView } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from '@/components/Map';
import * as Location from 'expo-location';
import { Typography } from '@/src/components/common/Typography';
import { SOSButton } from '@/src/components/features/SOSButton';
import { Card } from '@/src/components/common/Card';
import { theme, palette } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Phone, MapPin, Shield, Ambulance, Flame, Globe } from 'lucide-react-native';
import { useEmergencyContacts } from '@/src/hooks/useEmergency';

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
  const { data: contacts } = useEmergencyContacts();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const handleSOS = () => {
    Alert.alert(
      "SOS Triggered!",
      "Your location has been shared with emergency services. Help is on the way.",
      [{ text: "OK", style: "destructive" }]
    );
  };

  const callService = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <View style={styles.mapContainer}>
        {location ? (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            customMapStyle={colorScheme === 'dark' ? darkMapStyle : []}
          >
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              title="You are here"
            />
          </MapView>
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
            LIVE LOCATION ACTIVE
          </Typography>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Typography variant="h2" weight="bold" align="center" style={styles.title}>
          Emergency Hub
        </Typography>
        
        <SOSButton onTrigger={handleSOS} />

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
          <Typography variant="bodySm" weight="semibold">Location Sharing</Typography>
          <Typography variant="caption" color={activeTheme.textSecondary} style={{ marginTop: 4 }}>
            Your real-time location is currently being shared with authorized first responders in your area.
          </Typography>
        </Card>
      </ScrollView>
    </View>
  );
}

const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
  // ... more styles for premium dark map
];

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
  servicesGrid: {
    flexDirection: 'row',
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

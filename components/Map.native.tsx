import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Map, Camera, Marker } from '@maplibre/maplibre-react-native';
import { AppMapProps, MAP_STYLES, boundsFor } from './map-config';

/** MapLibre native map (Android & iOS). Requires a development build, not Expo Go. */
export default function AppMap({ style, markers, zoom = 15, colorScheme = 'light', interactive = true }: AppMapProps) {
  const camera = markers.length > 1
    ? { bounds: boundsFor(markers), padding: { top: 40, right: 40, bottom: 70, left: 40 } }
    : markers.length === 1
      ? { center: [markers[0].longitude, markers[0].latitude] as [number, number], zoom }
      : { center: [31.0492, -17.8292] as [number, number], zoom: 11 }; // Harare

  return (
    <Map
      style={[styles.map, style]}
      mapStyle={MAP_STYLES[colorScheme]}
      dragPan={interactive}
      touchZoom={interactive}
      touchRotate={false}
      touchPitch={false}
      logo={false}
      attribution
      attributionPosition={{ bottom: 8, right: 8 }}
    >
      <Camera {...camera} duration={600} />
      {markers.map((m) => (
        <Marker key={m.id} id={m.id} lngLat={[m.longitude, m.latitude]} anchor="center">
          <View style={[styles.dot, { backgroundColor: m.color ?? '#0E3F7C' }]} accessibilityLabel={m.title} />
        </Marker>
      ))}
    </Map>
  );
}

const styles = StyleSheet.create({
  // No flex here: the caller sizes the map (a fixed height, or absoluteFill)
  map: { minHeight: 120 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});

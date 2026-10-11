import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AppMapProps, MAP_STYLES, boundsFor } from './map-config';

/** MapLibre GL JS map for the web build */
export default function AppMap({ style, markers, zoom = 15, colorScheme = 'light', interactive = true }: AppMapProps) {
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  const pins = useRef<MapLibreMarker[]>([]);

  // Create the map once (and again if the theme changes)
  useEffect(() => {
    if (!container.current) return;
    map.current = new MapLibreMap({
      container: container.current,
      style: MAP_STYLES[colorScheme],
      center: [31.0492, -17.8292], // Harare
      zoom: 11,
      interactive,
      attributionControl: { compact: true },
    });
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [colorScheme, interactive]);

  // Keep markers and camera in sync with props
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    pins.current.forEach((p) => p.remove());
    pins.current = markers.map((marker) => {
      const el = document.createElement('div');
      Object.assign(el.style, {
        width: '18px', height: '18px', borderRadius: '9px', border: '3px solid #fff',
        background: marker.color ?? '#0E3F7C', boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
      });
      if (marker.title) el.title = marker.title;
      return new MapLibreMarker({ element: el }).setLngLat([marker.longitude, marker.latitude]).addTo(m);
    });
    if (markers.length > 1) {
      const [w, s, e, n] = boundsFor(markers);
      m.fitBounds([[w, s], [e, n]], { padding: { top: 40, right: 40, bottom: 70, left: 40 }, duration: 600 });
    } else if (markers.length === 1) {
      m.easeTo({ center: [markers[0].longitude, markers[0].latitude], zoom, duration: 600 });
    }
  }, [markers, zoom, colorScheme]);

  return (
    <View style={[styles.wrapper, style]}>
      <div ref={container} style={{ position: 'absolute', inset: 0 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  // No flex here: the caller sizes the map (a fixed height, or absoluteFill)
  wrapper: { overflow: 'hidden', position: 'relative', minHeight: 120 },
});

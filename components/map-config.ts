/**
 * Free, keyless map styles from OpenFreeMap (https://openfreemap.org), rendered with MapLibre.
 * No API key, billing account or usage limit. Map data © OpenStreetMap contributors.
 */
export const MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  /** Dot colour; defaults to the brand colour */
  color?: string;
  title?: string;
}

export interface AppMapProps {
  /** Give the map a size: a fixed height, or StyleSheet.absoluteFillObject */
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
  /** Markers to show; the camera fits them all (or centres on the only one) */
  markers: MapMarker[];
  /** Zoom used when there's a single marker */
  zoom?: number;
  colorScheme?: 'light' | 'dark';
  /** Let the user pan/zoom (default true) */
  interactive?: boolean;
}

/** [west, south, east, north] around all markers, padded so pins aren't on the edge */
export function boundsFor(markers: MapMarker[]): [number, number, number, number] {
  const lngs = markers.map((m) => m.longitude);
  const lats = markers.map((m) => m.latitude);
  const pad = 0.005;
  return [Math.min(...lngs) - pad, Math.min(...lats) - pad, Math.max(...lngs) + pad, Math.max(...lats) + pad];
}

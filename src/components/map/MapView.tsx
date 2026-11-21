import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { WebView } from 'react-native-webview';
import { mapHtml, MapPoint } from './mapHtml';

export interface MapViewProps {
  pin: MapPoint | null;
  centre: MapPoint;
  zoom: number;
  accent: string;
  onMove: (p: MapPoint) => void;
}
export interface MapViewHandle {
  /** Move the pin (and the view) without reloading the map */
  setPin: (p: MapPoint, zoom?: number) => void;
}

/** Native: the MapLibre page in a WebView */
export const PinMap = forwardRef<MapViewHandle, MapViewProps>(function PinMap({ pin, centre, zoom, accent, onMove }, ref) {
  const view = useRef<WebView>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => mapHtml({ pin, centre, zoom, accent }), []);

  useImperativeHandle(ref, () => ({
    setPin: (p: MapPoint, z?: number) => {
      const msg = JSON.stringify(JSON.stringify({ type: 'set', ...p, zoom: z }));
      view.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message', { data: ${msg} })); true;`);
    },
  }));

  return (
    <WebView
      ref={view}
      originWhitelist={['*']}
      source={{ html }}
      javaScriptEnabled
      style={{ flex: 1 }}
      onMessage={(e) => {
        try {
          const m = JSON.parse(e.nativeEvent.data);
          if (m.type === 'move') onMove({ lat: m.lat, lng: m.lng });
        } catch { /* ignore */ }
      }}
    />
  );
});

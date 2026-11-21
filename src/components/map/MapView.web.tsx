import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import { MAPLIBRE_VERSION, MAP_STYLE_URL, OSM_RASTER_STYLE, MapPoint } from './mapHtml';
import type { MapViewHandle, MapViewProps } from './MapView';

/* eslint-disable @typescript-eslint/no-explicit-any */
type MapLibre = any;

let loading: Promise<MapLibre> | null = null;

/** Load MapLibre GL JS (script + stylesheet) from the CDN once per page */
function loadMapLibre(): Promise<MapLibre> {
  const w = window as any;
  if (w.maplibregl) return Promise.resolve(w.maplibregl);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
    document.head.appendChild(css);
    const script = document.createElement('script');
    script.src = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
    script.async = true;
    script.onload = () => resolve(w.maplibregl);
    script.onerror = () => { loading = null; reject(new Error('Map could not load')); };
    document.head.appendChild(script);
  });
  return loading;
}

function pinElement(accent: string) {
  const wrap = document.createElement('div');
  wrap.style.paddingBottom = '6px';
  wrap.style.cursor = 'grab';
  const pin = document.createElement('div');
  Object.assign(pin.style, {
    width: '26px', height: '26px', borderRadius: '50% 50% 50% 0', background: accent, transform: 'rotate(-45deg)',
    border: '3px solid #fff', boxShadow: '0 2px 6px rgba(15,23,42,.35)', position: 'relative', boxSizing: 'border-box',
  });
  const dot = document.createElement('div');
  Object.assign(dot.style, { position: 'absolute', width: '8px', height: '8px', background: '#fff', borderRadius: '50%', left: '6px', top: '6px' });
  pin.appendChild(dot);
  wrap.appendChild(pin);
  return wrap;
}

/** Web: MapLibre GL JS rendered straight into the page (OpenStreetMap data via OpenFreeMap) */
export const PinMap = forwardRef<MapViewHandle, MapViewProps>(function PinMap({ pin, centre, zoom, accent, onMove }, ref) {
  const host = useRef<View>(null);
  const map = useRef<MapLibre>(null);
  const marker = useRef<MapLibre>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const place = (lat: number, lng: number, notify: boolean) => {
    const gl = (window as any).maplibregl;
    if (!map.current || !gl) return;
    if (!marker.current) {
      marker.current = new gl.Marker({ element: pinElement(accent), draggable: true, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map.current);
      marker.current.on('dragend', () => {
        const p = marker.current.getLngLat();
        onMoveRef.current({ lat: p.lat, lng: p.lng });
      });
    } else marker.current.setLngLat([lng, lat]);
    if (notify) onMoveRef.current({ lat, lng });
  };

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    loadMapLibre().then((gl) => {
      const el = host.current as unknown as HTMLElement | null;
      if (cancelled || !el) return;
      let fellBack = false;
      const m = new gl.Map({
        container: el,
        style: MAP_STYLE_URL,
        center: [centre.lng, centre.lat],
        zoom,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
      map.current = m;
      m.touchZoomRotate.disableRotation();
      m.addControl(new gl.NavigationControl({ showCompass: false }), 'top-left');
      m.on('error', () => {
        if (!fellBack && !m.isStyleLoaded()) { fellBack = true; m.setStyle(OSM_RASTER_STYLE); }
      });
      m.on('click', (e: any) => place(e.lngLat.lat, e.lngLat.lng, true));
      if (pin) place(pin.lat, pin.lng, false);
      // The modal slides in, so the container's size settles after the map starts
      observer = new ResizeObserver(() => m.resize());
      observer.observe(el);
    }).catch(() => { /* the field still shows typed coordinates */ });
    return () => {
      cancelled = true;
      observer?.disconnect();
      marker.current = null;
      map.current?.remove();
      map.current = null;
    };
    // Built once per open; later moves go through setPin so the map keeps its zoom
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    setPin: (p: MapPoint, z?: number) => {
      place(p.lat, p.lng, false);
      map.current?.easeTo({ center: [p.lng, p.lat], zoom: z ?? Math.max(map.current.getZoom(), 16), duration: 600 });
    },
  }));

  return <View ref={host} style={{ flex: 1, width: '100%', height: '100%' }} />;
});

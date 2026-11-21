/**
 * A self-contained MapLibre GL JS page showing OpenStreetMap data with one draggable pin, loaded in a WebView
 * on phones (the web build renders MapLibre directly; see MapView.web.tsx). Messages, as JSON strings:
 *   page → host: { type: 'ready' } | { type: 'move', lat, lng } | { type: 'error', message }
 *   host → page: { type: 'set', lat, lng, zoom? }
 *
 * Map style: OpenFreeMap "liberty" by default (vector tiles built from OpenStreetMap; free, no API key).
 * Set EXPO_PUBLIC_MAP_STYLE_URL to use another MapLibre style (e.g. MapTiler or a self-hosted tile server).
 * If the style can't load, the page falls back to OpenStreetMap's raster tiles, which are fine for
 * development but not for production traffic.
 */

export const ZIMBABWE_CENTRE = { lat: -19.0154, lng: 29.1549 };

export interface MapPoint { lat: number; lng: number }

export const MAPLIBRE_VERSION = '4.7.1';
export const MAP_STYLE_URL = process.env.EXPO_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';

/** Raster OSM style used only if the vector style fails */
export const OSM_RASTER_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

export function mapHtml(opts: { pin: MapPoint | null; centre: MapPoint; zoom: number; accent: string }) {
  const start = JSON.stringify({ pin: opts.pin, centre: opts.centre, zoom: opts.zoom, style: MAP_STYLE_URL, fallback: OSM_RASTER_STYLE });
  return `<!doctype html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css" />
<script src="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js"></script>
<style>
  html, body, #map { margin: 0; height: 100%; width: 100%; background: #F1F5F9; font-family: -apple-system, system-ui, sans-serif; }
  .pin { width: 26px; height: 26px; border-radius: 50% 50% 50% 0; background: ${opts.accent}; transform: rotate(-45deg);
         border: 3px solid #fff; box-shadow: 0 2px 6px rgba(15,23,42,.35); position: relative; cursor: grab; }
  .pin::after { content: ''; position: absolute; width: 8px; height: 8px; background: #fff; border-radius: 50%; left: 9px; top: 9px; }
  .pin-wrap { padding-bottom: 6px; }
  .hint { position: absolute; z-index: 2; left: 50%; top: 10px; transform: translateX(-50%); background: rgba(255,255,255,.95);
          color: #0F172A; font-size: 13px; padding: 6px 12px; border-radius: 999px; border: 1px solid #E2E8F0; pointer-events: none; white-space: nowrap; }
</style>
</head><body>
<div id="map"></div>
<div class="hint">Tap the map or drag the pin</div>
<script>
  var start = ${start};
  function send(msg) {
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else if (window.parent !== window) window.parent.postMessage(s, '*');
  }
  if (!window.maplibregl) { send({ type: 'error', message: 'Map could not load' }); }
  var fellBack = false;
  var map = new maplibregl.Map({
    container: 'map',
    style: start.style,
    center: [start.centre.lng, start.centre.lat],
    zoom: start.zoom,
    attributionControl: { compact: true },
    dragRotate: false,
    pitchWithRotate: false,
  });
  map.touchZoomRotate.disableRotation();
  // The page may start inside a sliding modal at zero size: redraw whenever the container changes size
  if (window.ResizeObserver) new ResizeObserver(function () { map.resize(); }).observe(document.getElementById('map'));
  [100, 400, 1000].forEach(function (ms) { setTimeout(function () { map.resize(); }, ms); });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
  map.on('error', function (e) {
    // The vector style (or its tiles) failed: switch to plain OSM raster tiles once
    if (!fellBack && !map.isStyleLoaded()) { fellBack = true; map.setStyle(start.fallback); }
  });

  var el = document.createElement('div');
  el.className = 'pin-wrap';
  el.innerHTML = '<div class="pin"></div>';
  var marker = null;
  function place(lat, lng, notify) {
    if (!marker) {
      marker = new maplibregl.Marker({ element: el, draggable: true, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map);
      marker.on('dragend', function () { var p = marker.getLngLat(); send({ type: 'move', lat: p.lat, lng: p.lng }); });
    } else marker.setLngLat([lng, lat]);
    if (notify) send({ type: 'move', lat: lat, lng: lng });
  }
  if (start.pin) place(start.pin.lat, start.pin.lng, false);
  map.on('click', function (e) { place(e.lngLat.lat, e.lngLat.lng, true); });

  function onMessage(ev) {
    var m; try { m = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data; } catch (err) { return; }
    if (!m || m.type !== 'set') return;
    place(m.lat, m.lng, false);
    map.easeTo({ center: [m.lng, m.lat], zoom: m.zoom || Math.max(map.getZoom(), 16), duration: 600 });
  }
  window.addEventListener('message', onMessage);
  document.addEventListener('message', onMessage);
  map.on('load', function () { send({ type: 'ready' }); });
</script>
</body></html>`;
}

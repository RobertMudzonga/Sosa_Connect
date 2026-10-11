const dotenv = require('dotenv');

dotenv.config();

// `config` holds the values from app.json. Per-environment values come from .env locally
// and from the build profile's `env` in eas.json. Maps use MapLibre + OpenFreeMap (no API key).
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    // Test builds talk to a backend on the local network over plain http://, which
    // Android blocks in release builds by default. Never set ALLOW_HTTP for production.
    ...(process.env.ALLOW_HTTP === '1'
      ? [['expo-build-properties', { android: { usesCleartextTraffic: true } }]]
      : []),
  ],
  extra: {
    ...config.extra,
    apiUrl: process.env.API_URL || config.extra?.apiUrl,
    eas: {
      ...config.extra?.eas,
      projectId: process.env.EAS_PROJECT_ID || config.extra?.eas?.projectId,
    },
  },
});

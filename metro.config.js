// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure platform-specific extensions are resolved correctly
config.resolver.sourceExts = [...config.resolver.sourceExts, 'tsx', 'ts', 'jsx', 'js'];
config.resolver.platforms = ['ios', 'android', 'web'];

// zustand's ES-module build reads `import.meta.env`, which crashes the web bundle
// ("Cannot use 'import.meta' outside a module"). Use its CommonJS build on web instead.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && (moduleName === 'zustand' || moduleName.startsWith('zustand/'))) {
    // Node's resolver picks the "require"/"default" (CommonJS) entry
    return { type: 'sourceFile', filePath: require.resolve(moduleName) };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

const createExpoWebpackConfigAsync = require("@expo/webpack-config");

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ["@expo/vector-icons"],
      },
    },
    argv,
  );

  // Add alias to use web-specific file for emergency screen
  config.resolve.alias = {
    ...config.resolve.alias,
    "react-native-maps": "react-native-web/dist/exports/View",
  };

  return config;
};

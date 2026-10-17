module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Required at runtime by react-native-reanimated (used by the drawer
    // navigator). Must be listed last.
    plugins: ['react-native-reanimated/plugin'],
  };
};

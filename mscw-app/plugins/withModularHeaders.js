const { withPodfile } = require('@expo/config-plugins');

/**
 * Expo config plugin that adds `use_modular_headers!` to the Podfile.
 * This fixes Firebase Swift pod compilation without requiring
 * `useFrameworks: "static"`, which breaks expo-av and other Expo modules.
 */
module.exports = function withModularHeaders(config) {
  return withPodfile(config, (config) => {
    const podfile = config.modResults.contents;
    
    // Only add if not already present
    if (!podfile.includes('use_modular_headers!')) {
      // Insert `use_modular_headers!` right after the `platform` line
      config.modResults.contents = podfile.replace(
        /(platform :ios.*\n)/,
        `$1use_modular_headers!\n`
      );
    }
    
    return config;
  });
};

const { withPodfile } = require('@expo/config-plugins');

/**
 * Expo config plugin that adds specific pod declarations with `:modular_headers => true`
 * to the Podfile's target block.
 * This resolves the Swift static library interoperability issues for Firebase Swift pods
 * (like FirebaseAuth) without enabling global `use_modular_headers!` (which breaks C++ pods
 * like gRPC-Core) or global `useFrameworks: "static"` (which breaks expo-av).
 */
module.exports = function withModularHeaders(config) {
  return withPodfile(config, (config) => {
    let podfile = config.modResults.contents;
    
    const modularPods = [
      "pod 'GoogleUtilities', :modular_headers => true",
      "pod 'FirebaseAuthInterop', :modular_headers => true",
      "pod 'FirebaseAppCheckInterop', :modular_headers => true",
      "pod 'RecaptchaInterop', :modular_headers => true",
      "pod 'FirebaseCoreInternal', :modular_headers => true",
      "pod 'FirebaseCore', :modular_headers => true",
      "pod 'FirebaseAuth', :modular_headers => true",
      "pod 'FirebaseCoreExtension', :modular_headers => true"
    ];

    // Filter out pods that are already explicitly mentioned in the Podfile to avoid duplicates
    const podsToAdd = modularPods.filter(p => !podfile.includes(p));

    if (podsToAdd.length > 0) {
      const insertionText = '\n  # Added by withModularHeaders plugin\n  ' + podsToAdd.join('\n  ') + '\n';
      
      // Match the target block start, e.g., target 'MSCW' do
      const targetRegex = /(target\s+['"][^'"]+['"]\s+do\n)/;
      
      if (targetRegex.test(podfile)) {
        podfile = podfile.replace(targetRegex, `$1${insertionText}`);
      } else {
        console.warn('withModularHeaders: Could not find target block in Podfile, appending to end of file.');
        podfile += `\n${insertionText}`;
      }
    }

    // Also clean up global use_modular_headers! if it was previously added
    if (podfile.includes('use_modular_headers!')) {
      podfile = podfile.replace(/use_modular_headers!\n?/g, '');
    }

    config.modResults.contents = podfile;
    return config;
  });
};

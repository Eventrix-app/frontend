const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

/**
 * Resolves the Android manifest-merger conflict introduced by PayU's checkout UI.
 *
 * `in.payu:payu-checkout-pro-ui` declares `android:theme="@style/OnePayuTheme"` on its own
 * <application> element. Android's manifest merger treats two different values for the same
 * <application> attribute as an error rather than picking one, so the build fails at
 * :app:processDebugMainManifest with:
 *
 *   Attribute application@theme value=(@style/AppTheme) ... is also present at
 *   [in.payu:payu-checkout-pro-ui] value=(@style/OnePayuTheme)
 *
 * `tools:replace="android:theme"` tells the merger the app's own value wins. That is the
 * outcome we want: OnePayuTheme is PayU's styling for their hosted checkout activity, which
 * carries its own theme on its <activity> entry and is unaffected by this. Letting it win at
 * the application level would restyle every screen in Eventrix instead.
 *
 * Written as a config plugin because android/ is generated and gitignored (CNG workflow):
 * editing android/app/src/main/AndroidManifest.xml directly is undone by the next prebuild
 * and never reaches EAS Build, so the cloud AAB build would keep failing while the local
 * one looked fixed.
 */
module.exports = function withPayuManifestTheme(config) {
  return withAndroidManifest(config, (cfg) => {
    // The prebuild template already declares xmlns:tools, but this plugin must not depend on
    // that staying true — without the namespace, `tools:replace` is just an unknown attribute
    // and the merger conflict comes back with no obvious cause.
    AndroidConfig.Manifest.ensureToolsAvailable(cfg.modResults);

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);

    // tools:replace is a comma-separated list. Merge into whatever is already there rather
    // than assigning, so this composes with any other plugin that needs its own override.
    const current = application.$['tools:replace'];
    const attributes = current
      ? current
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : [];

    if (!attributes.includes('android:theme')) {
      attributes.push('android:theme');
    }

    application.$['tools:replace'] = attributes.join(',');
    return cfg;
  });
};

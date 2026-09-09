const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Makes installed UPI apps visible to PayU's checkout SDK.
 *
 * Android 11 (API 30) filters package visibility: an app sees only itself and whatever it
 * declares in <queries>. PayU resolves the UPI app list with an intent query for the `upi:`
 * scheme, so without this that query returns nothing — the SDK finds no activity to launch
 * and tapping a UPI app in the sheet silently does nothing at all. There is no error to go
 * on, because from the SDK's perspective no UPI app is installed.
 *
 * The intent query is what actually matters and covers every UPI-capable app on the device.
 * The explicit packages below are the handful PayU's own integration docs name: some of its
 * flows check for those directly by package rather than through the intent query.
 *
 * Written as a config plugin because android/ is generated and gitignored (CNG workflow):
 * editing android/app/src/main/AndroidManifest.xml directly is undone by the next prebuild
 * and never reaches EAS Build, so a cloud AAB would ship without it while the local build
 * looked fine.
 */
const UPI_PACKAGES = [
  'com.google.android.apps.nbu.paisa.user',
  'com.phonepe.app',
  'net.one97.paytm',
  'in.org.npci.upiapp',
  'in.amazon.mShop.android.shopping',
  'com.whatsapp',
];

module.exports = function withPayuUpiQueries(config) {
  return withAndroidManifest(config, (cfg) => {
    const { manifest } = cfg.modResults;

    // Expo's template already emits a <queries> block for https VIEW; append rather than
    // assign so this composes with it instead of dropping it.
    if (!Array.isArray(manifest.queries) || manifest.queries.length === 0) {
      manifest.queries = [{}];
    }
    const queries = manifest.queries[0];

    queries.intent = queries.intent ?? [];
    const hasUpiIntent = queries.intent.some((intent) =>
      (intent.data ?? []).some((data) => data.$?.['android:scheme'] === 'upi'),
    );
    if (!hasUpiIntent) {
      queries.intent.push({
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        data: [{ $: { 'android:scheme': 'upi' } }],
      });
    }

    queries.package = queries.package ?? [];
    for (const name of UPI_PACKAGES) {
      const alreadyDeclared = queries.package.some((pkg) => pkg.$?.['android:name'] === name);
      if (!alreadyDeclared) {
        queries.package.push({ $: { 'android:name': name } });
      }
    }

    return cfg;
  });
};

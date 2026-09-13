// payu-non-seam-less-react ships no type declarations (plain `index.js` re-exporting
// `NativeModules.PayUBizSdk`) — this ambient module keeps `strict` mode happy without
// pretending to know more about the native bridge's shape than we actually do. See
// Frontend/src/services/payuNativeService.ts for the real, source-verified method list.
declare module 'payu-non-seam-less-react' {
  const PayUBizSdk: {
    openCheckoutScreen: (params: Record<string, unknown>) => void;
    hashGenerated: (result: Record<string, string>) => void;
  };
  export default PayUBizSdk;
}

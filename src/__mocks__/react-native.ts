export const Platform = { OS: 'ios', select: (obj: any) => obj.ios ?? obj.default };
export const NativeModules = {};
export const StyleSheet = { create: (s: any) => s, flatten: (s: any) => s, absoluteFill: {} };
export const Dimensions = { get: () => ({ width: 375, height: 812 }) };

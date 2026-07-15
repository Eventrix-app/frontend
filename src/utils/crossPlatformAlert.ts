import { Alert, Platform } from 'react-native';

// react-native-web's Alert.alert() is a documented no-op (see
// node_modules/react-native-web/src/exports/Alert) — on web it silently does nothing,
// so any validation/error feedback shown only via Alert.alert never reaches the user.
export function showAlert(title: string, message?: string, onDismiss?: () => void) {
  if (Platform.OS === 'web') {
    // No DOM lib in this RN project's tsconfig — window is real at runtime under
    // react-native-web, just untyped here.
    (globalThis as any).alert(message ? `${title}\n\n${message}` : title);
    onDismiss?.();
    return;
  }
  Alert.alert(title, message, onDismiss ? [{ text: 'OK', onPress: onDismiss }] : undefined);
}

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

// Two-button confirm (Cancel/destructive action) — window.confirm() on web actually
// blocks and returns a boolean, unlike Alert.alert's no-op, so this one genuinely works
// cross-platform rather than needing the same workaround as showAlert.
export function showConfirm(title: string, message: string | undefined, onConfirm: () => void, confirmLabel = 'Delete') {
  if (Platform.OS === 'web') {
    if ((globalThis as any).confirm(message ? `${title}\n\n${message}` : title)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

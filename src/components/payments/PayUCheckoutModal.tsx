import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  Linking,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Text } from '../common/Text';
import { CloseIcon } from '../common/Icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { API_URL } from '../../store/services/baseQuery';
import { showAlert } from '../../utils/crossPlatformAlert';
import type { PayUOrderResult } from '../../store/services/paymentsApi';

interface Props {
  visible: boolean;
  order: PayUOrderResult | null;
  onSuccess: () => void;
  onDismiss: () => void;
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// PayU's classic checkout has no client SDK to open — the app POSTs a hidden form directly
// to PayU's hosted page (order.actionUrl), the user completes payment there, and PayU
// redirects that same WebView session to our backend's /payments/payu/return, which verifies
// everything server-side and renders a tiny page that postMessages the result back here.
const PayUCheckoutModal: React.FC<Props> = ({ visible, order, onSuccess, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Delay WebView mount until after the modal open animation completes.
  // On Android, initialising a WebView while the modal slide-in animation is running
  // blocks the JS/UI thread long enough to trigger an ANR ("App not responding").
  const [webViewReady, setWebViewReady] = useState(false);
  const interactionRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);

  useEffect(() => {
    if (visible) {
      interactionRef.current = InteractionManager.runAfterInteractions(() => {
        setWebViewReady(true);
      });
    } else {
      interactionRef.current?.cancel();
      setWebViewReady(false);
    }
    return () => {
      interactionRef.current?.cancel();
    };
  }, [visible]);

  if (!order) return null;

  const returnUrl = `${API_URL}/payments/payu/return`;
  const fields: Record<string, string> = {
    key: order.key,
    txnid: order.txnid,
    amount: order.amount.toFixed(2),
    productinfo: order.productinfo,
    firstname: order.firstname,
    email: order.email,
    phone: order.phone,
    surl: returnUrl,
    furl: returnUrl,
    hash: order.hash,
  };

  const inputsHtml = Object.entries(fields)
    .map(([name, value]) => `<input type="hidden" name="${name}" value="${escapeHtmlAttr(value)}" />`)
    .join('\n');

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>html,body{margin:0;padding:0;height:100%;background:#ffffff;}</style>
  </head>
  <body onload="document.getElementById('payuForm').submit()">
    <form id="payuForm" action="${order.actionUrl}" method="POST">
      ${inputsHtml}
    </form>
  </body>
</html>`;

  // Choosing a UPI app makes PayU navigate to `upi://pay?...`, a scheme no WebView can load —
  // it fails with ERR_UNKNOWN_URL_SCHEME and the page dead-ends. Handing the intent to Android
  // is what actually opens the UPI app; the WebView stays put and PayU polls for the result.
  const handleShouldStartLoad = (request: { url: string }): boolean => {
    if (/^https?:/i.test(request.url) || request.url === 'about:blank') return true;

    Linking.openURL(request.url).catch(() => {
      showAlert(
        'No app available',
        'Nothing on this device can open that payment app. Pick another method, or enter a UPI ID instead.',
      );
    });
    return false;
  };

  // Our own /payments/payu/return page always postMessages {type:'success'|'failure'} once
  // PayU redirects there — the backend has already verified the reverse hash by then.
  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'success') {
        onSuccess();
      } else {
        onDismiss();
      }
    } catch {
      onDismiss();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      // presentationStyle="fullScreen" is iOS-only — on Android it causes a blocking
      // full-screen transition that contributes to ANR. Omitting it is the correct default.
      onRequestClose={onDismiss}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.headerTitle}>Complete Payment</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onDismiss} accessibilityLabel="Close payment">
          <CloseIcon color={colors.text} size={20} />
        </TouchableOpacity>
      </View>

      {/* Show a spinner while the modal slide-in animation is running,
          then swap in the WebView once interactions settle to avoid ANR. */}
      {webViewReady ? (
        <WebView
          source={{ html }}
          onMessage={handleMessage}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          style={styles.webview}
          originWhitelist={['*']}
          javaScriptEnabled
          // Required on Android to allow localStorage/sessionStorage used by PayU's page.
          domStorageEnabled
          // Prevents PayU from opening a new browser window that would crash on Android.
          setSupportMultipleWindows={false}
          startInLoadingState
          renderLoading={() => (
            <View style={[styles.loadingOverlay, { backgroundColor: colors.neutralBg }]}>
              <ActivityIndicator color={colors.brandPink} size="large" />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading payment gateway{'\u2026'}
              </Text>
            </View>
          )}
          allowsInlineMediaPlayback
        />
      ) : (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.neutralBg }]}>
          <ActivityIndicator color={colors.brandPink} size="large" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Opening secure payment{'\u2026'}
          </Text>
        </View>
      )}
    </Modal>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      backgroundColor: colors.white,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.muted,
    },
    webview: { flex: 1, backgroundColor: colors.white },
    loadingOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: 14,
      marginTop: 12,
    },
  });

export default PayUCheckoutModal;

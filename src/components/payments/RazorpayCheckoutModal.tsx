import React, { useMemo } from 'react';
import { Linking, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Text } from '../common/Text';
import { CloseIcon } from '../common/Icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import type { CreateOrderResult } from '../../store/services/paymentsApi';

export interface RazorpaySuccessPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// Razorpay's UPI "intent" method hands off to a payment app through a non-http URL, which the
// WebView cannot load itself — without this the UPI apps simply do nothing when tapped. Only
// these schemes are passed to the OS: handing off anything a page inside the WebView asks for
// would let it launch arbitrary deep links.
const PAYMENT_APP_SCHEMES = ['upi:', 'tez:', 'phonepe:', 'paytmmp:', 'bhim:', 'credpay:', 'gpay:'];

interface Props {
  visible: boolean;
  order: CreateOrderResult | null;
  description: string;
  prefill?: { email?: string; contact?: string };
  onSuccess: (payload: RazorpaySuccessPayload) => void;
  onDismiss: () => void;
}

// Opens Razorpay's standard hosted checkout inside a WebView rather than the
// react-native-razorpay native SDK — that SDK is an older module with a real history of
// Fabric/TurboModule issues, and this app runs with the New Architecture enabled with no way
// to verify compatibility without a device build. A WebView needs no native checkout module
// and carries none of that risk; Razorpay's own checkout.js still renders its full native-feel
// payment-method picker (UPI/cards/wallets/netbanking) inside the page.
const RazorpayCheckoutModal: React.FC<Props> = ({ visible, order, description, prefill, onSuccess, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Memoised so an unrelated re-render of the checkout screen cannot hand the WebView a fresh
  // source and restart a payment the user is halfway through.
  const html = useMemo(() => {
    if (!order) return null;

    const options = {
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: 'Eventrix',
      description,
      prefill: { email: prefill?.email ?? '', contact: prefill?.contact ?? '' },
      theme: { color: colors.brandPink },
    };

    // handler/modal.ondismiss are Razorpay checkout.js callbacks, not React — they run inside
    // the WebView's own JS context, so the only way out is postMessage back to RN.
    return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>html,body{margin:0;padding:0;height:100%;background:#ffffff;}</style>
  </head>
  <body>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <script>
      var options = ${JSON.stringify(options)};
      options.handler = function (response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', ...response }));
      };
      options.modal = {
        ondismiss: function () {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dismiss' }));
        },
      };
      var rzp = new Razorpay(options);
      rzp.on('payment.failed', function () {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dismiss' }));
      });
      rzp.open();
    </script>
  </body>
</html>`;
  }, [order, description, prefill?.email, prefill?.contact, colors.brandPink]);

  if (!html) return null;

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      // Anything loaded in this WebView can postMessage, so an incomplete "success" is treated
      // as a dismissal rather than sent on to verifyPayment. The backend's signature check is
      // what actually decides whether a payment happened; this only keeps a malformed message
      // from being reported to the user as a payment in progress.
      const isSuccess =
        data?.type === 'success' &&
        typeof data.razorpay_order_id === 'string' &&
        typeof data.razorpay_payment_id === 'string' &&
        typeof data.razorpay_signature === 'string';
      if (isSuccess) {
        onSuccess({
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
        });
      } else {
        onDismiss();
      }
    } catch {
      onDismiss();
    }
  };

  // originWhitelist stays open on purpose: a narrower list makes iOS hand non-matching URLs
  // straight to the OS, which would bypass the allowlist below. This handler is the gate.
  const handleShouldStartLoad = (request: { url: string }): boolean => {
    const url = request.url;
    if (/^(https?|about|data|blob):/i.test(url)) return true;

    const scheme = url.slice(0, url.indexOf(':') + 1).toLowerCase();
    if (PAYMENT_APP_SCHEMES.includes(scheme)) {
      // A missing app rejects here; the user can just pick another method, so this is silent.
      Linking.openURL(url).catch(() => undefined);
    }
    return false;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDismiss} presentationStyle="pageSheet">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.headerTitle}>Complete Payment</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onDismiss} accessibilityLabel="Close payment">
          <CloseIcon color={colors.text} size={20} />
        </TouchableOpacity>
      </View>
      <WebView
        source={{ html }}
        onMessage={handleMessage}
        style={styles.webview}
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        javaScriptEnabled
        domStorageEnabled
      />
    </Modal>
  );
};

export default RazorpayCheckoutModal;

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
  });

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Text } from '../common/Text';
import { PayUInitiateResponse } from '../../store/services/paymentsApi';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';

interface Props {
  visible: boolean;
  params: PayUInitiateResponse;
  // The base URL of the deployed backend, e.g. https://backend-one-virid-16.vercel.app/api
  // Used to build surl/furl pointing at POST /payments/payu/return, which renders the
  // postMessage page the WebView catches to report the payment outcome back to the app.
  surlBase: string;
  onSuccess: () => void;
  onFailure: () => void;
  onDismiss: () => void;
}

// Builds the HTML page the WebView loads on mount. It contains a form that auto-submits
// to PayU's actionUrl immediately when the page loads — the user sees PayU's checkout
// UI right away without needing to tap anything inside the WebView.
//
// surl and furl both point to the same /payu/return backend route. The backend returns an
// HTML page that calls window.ReactNativeWebView.postMessage({type:'success'|'failure'}),
// which our onMessage handler below catches to close the modal and report the outcome.
function buildPayUHtml(params: PayUInitiateResponse, returnUrl: string): string {
  const amount = params.amount.toFixed(2);
  // Escape user-controlled strings inside HTML attribute values — prevents an event title or
  // user name containing quotes from breaking the form field value attributes.
  const esc = (s: string) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body { margin: 0; display: flex; align-items: center; justify-content: center;
             height: 100vh; background: #f5f5f5; font-family: sans-serif; }
      p { color: #555; font-size: 14px; }
    </style>
  </head>
  <body>
    <p>Opening payment gateway\u2026</p>
    <form id="payuForm" method="POST" action="${esc(params.actionUrl)}">
      <input type="hidden" name="key"         value="${esc(params.key)}" />
      <input type="hidden" name="txnid"       value="${esc(params.txnid)}" />
      <input type="hidden" name="amount"      value="${esc(amount)}" />
      <input type="hidden" name="productinfo" value="${esc(params.productinfo)}" />
      <input type="hidden" name="firstname"   value="${esc(params.firstname)}" />
      <input type="hidden" name="email"       value="${esc(params.email)}" />
      <input type="hidden" name="phone"       value="${esc(params.phone)}" />
      <input type="hidden" name="surl"        value="${esc(returnUrl)}" />
      <input type="hidden" name="furl"        value="${esc(returnUrl)}" />
      <input type="hidden" name="hash"        value="${esc(params.hash)}" />
    </form>
    <script>document.getElementById('payuForm').submit();</script>
  </body>
</html>`;
}

const PayUCheckoutModal: React.FC<Props> = ({
  visible,
  params,
  surlBase,
  onSuccess,
  onFailure,
  onDismiss,
}) => {
  const { colors } = useTheme();
  // Delay WebView mount until after the modal open animation completes.
  // On Android, initialising a WebView while the modal slide-in animation is running
  // blocks the JS/UI thread long enough to trigger an ANR ("App not responding").
  // We flip this to true only after all pending interactions (animations) settle.
  const [webViewReady, setWebViewReady] = useState(false);
  const interactionRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);

  useEffect(() => {
    if (visible) {
      // Wait for the slide animation to finish before mounting the WebView.
      interactionRef.current = InteractionManager.runAfterInteractions(() => {
        setWebViewReady(true);
      });
    } else {
      // Reset so the next open also defers correctly.
      interactionRef.current?.cancel();
      setWebViewReady(false);
    }
    return () => {
      interactionRef.current?.cancel();
    };
  }, [visible]);

  const returnUrl = `${surlBase.replace(/\/$/, '')}/payments/payu/return`;
  const html = buildPayUHtml(params, returnUrl);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type?: string };
      if (data.type === 'success') {
        onSuccess();
      } else {
        onFailure();
      }
    } catch {
      // Malformed postMessage — treat as failure so the user can retry
      onFailure();
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
      <SafeAreaView style={[styles.root, { backgroundColor: colors.neutralBg }]}>
        {/* Header with close button */}
        <View
          style={[
            styles.header,
            { backgroundColor: colors.white, borderBottomColor: colors.borderLight },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.text }]}>Secure Payment</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onDismiss}
            hitSlop={8}
            accessibilityLabel="Close payment screen"
            accessibilityRole="button"
          >
            <Text style={[styles.closeBtnText, { color: colors.brandPink }]}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>

        {/* Show a loading indicator while the modal animation is still running,
            then swap in the WebView once interactions have settled. This prevents
            the JS thread from being blocked by both the animation and WebView init
            at the same time — which was causing the Android ANR. */}
        {webViewReady ? (
          <WebView
            style={styles.webview}
            source={{ html }}
            originWhitelist={['*']}
            javaScriptEnabled
            // Required on Android to allow localStorage/sessionStorage used by PayU's page.
            domStorageEnabled
            // Prevents PayU from opening a new browser window inside the WebView,
            // which would cause a blank screen crash on Android.
            setSupportMultipleWindows={false}
            onMessage={handleMessage}
            startInLoadingState
            renderLoading={() => (
              <View style={[styles.loadingOverlay, { backgroundColor: colors.neutralBg }]}>
                <ActivityIndicator color={colors.brandPink} size="large" />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Loading PayU gateway{'\u2026'}
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
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: '700',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
});

export default PayUCheckoutModal;

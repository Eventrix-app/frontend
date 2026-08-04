import React, { useMemo } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Text } from '../common/Text';
import { CloseIcon } from '../common/Icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { API_URL } from '../../store/services/baseQuery';
import type { PayUOrderResult } from '../../store/services/paymentsApi';

interface Props {
  visible: boolean;
  order: PayUOrderResult | null;
  onSuccess: () => void;
  onDismiss: () => void;
}

// PayU's classic checkout has no client SDK to open — the app POSTs a hidden form directly
// to PayU's hosted page (order.actionUrl), the user completes payment there, and PayU
// redirects that same WebView session to our backend's /payments/payu/return, which verifies
// everything server-side and renders a tiny page that postMessages the result back here —
// same handoff pattern RazorpayCheckoutModal uses for checkout.js's callbacks, just fed by a
// page our own backend renders instead of PayU's SDK.
const PayUCheckoutModal: React.FC<Props> = ({ visible, order, onSuccess, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  // Our own /payments/payu/return page (see PaymentsController.handlePayUReturn /
  // payuReturnHtml) always postMessages {type:'success'|'failure'} once PayU redirects there
  // — by that point the backend has already verified the reverse hash and, on success,
  // confirmed the enrollment via the same handleWebhook() Razorpay's path uses.
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
        javaScriptEnabled
        domStorageEnabled
      />
    </Modal>
  );
};

export default PayUCheckoutModal;

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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

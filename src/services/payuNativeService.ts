import { DeviceEventEmitter } from 'react-native';
import PayUBizSdk from 'payu-non-seam-less-react';
import { AppDispatch } from '../store';
import { paymentsApi } from '../store/services/paymentsApi';
import { API_URL } from '../store/services/baseQuery';

export interface PayUNativeOrderParams {
  key?: string;
  transactionId: string;
  amount: number;
  productInfo: string;
  firstName: string;
  email: string;
  phone: string;
  environment: '0' | '1';
}

export type PayUNativeCheckoutResult =
  | { status: 'success'; merchantResponse?: string; payuResponse?: string }
  | { status: 'failure'; merchantResponse?: string; payuResponse?: string }
  | { status: 'cancelled' }
  | { status: 'error'; errorMsg?: string; errorCode?: string };

// One-time diagnostic logs — the exact extra fields alongside generateHash's
// hashName/hashString, and the exact parsed shape of onPaymentSuccess's payuResponse, could
// not be confirmed from the SDK's native source alone (they come from PayU's own compiled
// checkoutpro binary, not payu-non-seam-less-react's wrapper). These logs are how that gets
// confirmed on the very first real device run instead of staying an assumption.
let hasLoggedGenerateHash = false;
let hasLoggedTerminalEvent = false;

// Real backend URL, not a placeholder — if PayU's native SDK internally uses a redirect-based
// flow for any payment method (e.g. netbanking/3DS), this gives that redirect somewhere real
// to land, and PaymentsController.handlePayUReturn is idempotent (keyed on PayU's own
// mihpayid via handleWebhook), so it's a harmless bonus confirmation path if it ever fires —
// not a conflict with the primary onPaymentSuccess/onPaymentFailure callbacks below.
const NATIVE_RETURN_URL = `${API_URL}/payments/payu/return`;

// Opens PayU's native Checkout Pro bottom sheet (payu-non-seam-less-react — see that
// package's own native source for how these events/methods are actually implemented,
// since its README just links to often-incomplete external docs). Unlike the WebView flow,
// no hash is pre-computed: the SDK asks for one on demand via `generateHash`, requiring a
// server round-trip (the merchant salt must never reach the client) before it can proceed.
export function openPayUCheckout(dispatch: AppDispatch, params: PayUNativeOrderParams): Promise<PayUNativeCheckoutResult> {
  return new Promise((resolve) => {
    const subscriptions: { remove: () => void }[] = [];
    const cleanup = () => subscriptions.forEach((sub) => sub.remove());

    subscriptions.push(
      DeviceEventEmitter.addListener('generateHash', (data: { hashName: string; hashString: string }) => {
        if (!hasLoggedGenerateHash) {
          hasLoggedGenerateHash = true;
          if (__DEV__) console.log('[PayU generateHash]', JSON.stringify(data));
        }
        dispatch(paymentsApi.endpoints.signPayUHash.initiate({ hashString: data.hashString }))
          .unwrap()
          .then(({ hash }) => PayUBizSdk.hashGenerated({ [data.hashName]: hash }))
          .catch((err) => {
            // Nothing sensible to reply with — the SDK's own request just times out rather
            // than proceeding with a bogus hash that would fail on PayU's end anyway.
            if (__DEV__) console.warn('[PayU generateHash] Failed to sign hash', err);
          });
      }),
    );

    subscriptions.push(
      DeviceEventEmitter.addListener('onPaymentSuccess', (data: { merchantResponse?: string; payuResponse?: string }) => {
        if (!hasLoggedTerminalEvent) {
          hasLoggedTerminalEvent = true;
          if (__DEV__) console.log('[PayU onPaymentSuccess]', JSON.stringify(data));
        }
        cleanup();
        resolve({ status: 'success', merchantResponse: data.merchantResponse, payuResponse: data.payuResponse });
      }),
    );

    subscriptions.push(
      DeviceEventEmitter.addListener('onPaymentFailure', (data: { merchantResponse?: string; payuResponse?: string }) => {
        if (!hasLoggedTerminalEvent) {
          hasLoggedTerminalEvent = true;
          if (__DEV__) console.log('[PayU onPaymentFailure]', JSON.stringify(data));
        }
        cleanup();
        resolve({ status: 'failure', merchantResponse: data.merchantResponse, payuResponse: data.payuResponse });
      }),
    );

    // onPaymentCancel's payload key is spelled differently per platform in PayU's own SDK —
    // `ixTxnInitiated` on Android (a typo in their code), `isTxnInitiated` on iOS (confirmed
    // by reading both native source files directly). The event firing at all is the only
    // signal actually needed here, so neither spelling is read.
    subscriptions.push(
      DeviceEventEmitter.addListener('onPaymentCancel', () => {
        cleanup();
        resolve({ status: 'cancelled' });
      }),
    );

    subscriptions.push(
      DeviceEventEmitter.addListener('onError', (data: { errorMsg?: string; errorCode?: string }) => {
        cleanup();
        resolve({ status: 'error', errorMsg: data.errorMsg, errorCode: data.errorCode });
      }),
    );

    PayUBizSdk.openCheckoutScreen({
      payUPaymentParams: {
        key: params.key,
        transactionId: params.transactionId,
        amount: params.amount.toFixed(2),
        productInfo: params.productInfo,
        firstName: params.firstName,
        email: params.email,
        phone: params.phone,
        android_surl: NATIVE_RETURN_URL,
        android_furl: NATIVE_RETURN_URL,
        ios_surl: NATIVE_RETURN_URL,
        ios_furl: NATIVE_RETURN_URL,
        environment: params.environment,
      },
      payUCheckoutProConfig: {
        merchantName: 'Eventrix',
      },
    });
  });
}

import React, { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { SpringPressable } from '../common/SpringPressable';
import { Text } from '../common/Text';
import { useSocialLoginMutation } from '../../store/services/authApi';
import { useDispatch } from 'react-redux';
import { AppDispatch, store } from '../../store';
import { syncOnboardingDraft } from '../../utils/syncOnboardingDraft';
import { prefetchPostLoginData } from '../../utils/prefetchPostLoginData';
import { registerForPushNotifications } from '../../utils/registerForPushNotifications';
import { getDeviceLabel } from '../../utils/getDeviceLabel';
import { showAlert } from '../../utils/crossPlatformAlert';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '../../config/socialAuth';

const GOOGLE_SVG = `<svg width="256px" height="256px" viewBox="-0.5 0 48 48" version="1.1" xmlns="http://www.w3.org/2000/svg"><g transform="translate(-401.000000, -860.000000)"><g transform="translate(401.000000, 860.000000)"><path d="M9.82727273,24 C9.82727273,22.4757333 10.0804318,21.0144 10.5322727,19.6437333 L2.62345455,13.6042667 C1.08206818,16.7338667 0.213636364,20.2602667 0.213636364,24 C0.213636364,27.7365333 1.081,31.2608 2.62025,34.3882667 L10.5247955,28.3370667 C10.0772273,26.9728 9.82727273,25.5168 9.82727273,24" fill="#FBBC05"/><path d="M23.7136364,10.1333333 C27.025,10.1333333 30.0159091,11.3066667 32.3659091,13.2266667 L39.2022727,6.4 C35.0363636,2.77333333 29.6954545,0.533333333 23.7136364,0.533333333 C14.4268636,0.533333333 6.44540909,5.84426667 2.62345455,13.6042667 L10.5322727,19.6437333 C12.3545909,14.112 17.5491591,10.1333333 23.7136364,10.1333333" fill="#EB4335"/><path d="M23.7136364,37.8666667 C17.5491591,37.8666667 12.3545909,33.888 10.5322727,28.3562667 L2.62345455,34.3946667 C6.44540909,42.1557333 14.4268636,47.4666667 23.7136364,47.4666667 C29.4455,47.4666667 34.9177955,45.4314667 39.0249545,41.6181333 L31.5177727,35.8144 C29.3995682,37.1488 26.7323182,37.8666667 23.7136364,37.8666667" fill="#34A853"/><path d="M46.1454545,24 C46.1454545,22.6133333 45.9318182,21.12 45.6113636,19.7333333 L23.7136364,19.7333333 L23.7136364,28.8 L36.3181818,28.8 C35.6879545,31.8912 33.9724545,34.2677333 31.5177727,35.8144 L39.0249545,41.6181333 C43.3393409,37.6138667 46.1454545,31.6490667 46.1454545,24" fill="#4285F4"/></g></g></svg>`;

// Sized against the 52px button rather than the old free-standing icon tiles.
const GOOGLE_ICON_SIZE = 20;

type AuthNav = NativeStackNavigationProp<AuthStackParamList>;

type SocialLoginRowProps = {
  compact?: boolean;
};

export const SocialLoginRow: React.FC<SocialLoginRowProps> = ({ compact = false }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<AuthNav>();
  const [socialLogin] = useSocialLoginMutation();

  // Goes through the native SDK rather than expo-auth-session. That is what produces
  // Android's own "Choose an account" system sheet instead of bouncing out to a browser tab.
  useEffect(() => {
    // webClientId is the *web* client on purpose: that is the audience Google stamps into
    // the returned idToken, and it's the value the backend checks it against (see
    // verifyGoogleToken's audience list in auth.service.ts).
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
      offlineAccess: false,
    });
  }, []);

  const handlePostLogin = (result: { roles?: string[]; hasCompletedOnboarding: boolean }) => {
    syncOnboardingDraft(dispatch, store.getState);
    // Same warm-up the email/password paths do (LoginScreen/RegisterScreen). The token only
    // lands in the store once the socialLogin mutation settles, which is exactly here — so
    // this is the earliest point these authenticated prefetches can succeed. Without it a
    // Google sign-in landed on Home with a cold cache and rendered skeletons, while an
    // email/password login of the same account did not.
    prefetchPostLoginData(dispatch);
    if ((result?.roles ?? []).includes('admin')) {
      navigation.getParent()?.navigate('AdminRedirect' as never);
    } else if (!result.hasCompletedOnboarding) {
      // User hasn't completed onboarding — go to the carousel. Push notification
      // permission will be requested at the end of the onboarding chain
      // (NotificationPreferencesScreen.handleContinue), not here, so the OS dialog
      // doesn't pop up before the user even sees the first onboarding slide.
      navigation.navigate('Onboarding');
    } else {
      // Already onboarded — register for push now and land on Main.
      registerForPushNotifications(dispatch);
      navigation.getParent()?.navigate('Main' as never);
    }
  };

  const handleGoogle = async () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      showAlert('Not configured', 'Google sign-in is not set up yet.');
      return;
    }
    try {
      // Android only: surfaces a clear "install/update Play Services" prompt instead of the
      // opaque failure the sign-in call would otherwise throw on a device without them.
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (response.type === 'cancelled') return;
      const idToken = response.data?.idToken;
      if (!idToken) {
        showAlert('Sign in failed', 'Google did not return an ID token.');
        return;
      }
      const result = await socialLogin({ provider: 'google', token: idToken, deviceLabel: getDeviceLabel() }).unwrap();
      handlePostLogin(result);
    } catch (err: any) {
      // A cancel is a normal outcome, not an error worth interrupting the user over.
      if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (isErrorWithCode(err) && err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showAlert('Sign in failed', 'Google Play Services is required to sign in with Google.');
        return;
      }
      const serverMessage = err?.data?.message;
      showAlert('Sign in failed', typeof serverMessage === 'string' ? serverMessage : 'Could not sign in with this account. Please try again.');
    }
  };

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>Or</Text>
        <View style={styles.line} />
      </View>
      {/* Scale, not fade: googleBtn carries an Android elevation, and TouchableOpacity's
          alpha animation over an elevated view paints its shadow as an opaque rectangle
          across the button while it is held down. */}
      <SpringPressable
        style={styles.googleBtn}
        onPress={handleGoogle}
        scaleTo={0.97}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
      >
        <SvgXml xml={GOOGLE_SVG} width={GOOGLE_ICON_SIZE} height={GOOGLE_ICON_SIZE} />
        <Text style={styles.googleBtnLabel}>Continue with Google</Text>
      </SpringPressable>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  wrap: { marginTop: spacing.s, gap: spacing.md },
  wrapCompact: { marginTop: spacing.s, gap: spacing.sm, marginBottom: spacing.s },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  line: { flex: 1, height: 1, backgroundColor: colors.neutralLine },
  dividerText: { fontSize: 14, color: colors.textMuted },
  // Full-width pill rather than a row of icon tiles: with a single provider, a lone floating
  // tile reads as an afterthought, and Google's own guidance is for a labelled button
  // ("Continue with Google") instead of a bare mark.
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: 26,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutralLine,
    ...Platform.select({
      android: { elevation: 3 },
      default: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
    }),
  },
  googleBtnLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
});

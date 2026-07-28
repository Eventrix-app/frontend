import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthInput } from '../../components/auth/AuthInput';
import { LegalFooter } from '../../components/auth/LegalFooter';
import { SocialLoginRow } from '../../components/auth/SocialLoginRow';
import AnimatedLink from '../../components/common/AnimatedLink';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { useLoginMutation } from '../../store/services/authApi';
import { useDispatch } from 'react-redux';
import { AppDispatch, store } from '../../store';
import { syncOnboardingDraft } from '../../utils/syncOnboardingDraft';
import { registerForPushNotifications } from '../../utils/registerForPushNotifications';
import { getDeviceLabel } from '../../utils/getDeviceLabel';
import { prefetchPostLoginData } from '../../utils/prefetchPostLoginData';
import { showAlert } from '../../utils/crossPlatformAlert';
import { Text } from '../../components/common/Text';
import { WarningIcon } from '../../components/common/Icons';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const [contentHeight, setContentHeight] = useState(0);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [login, { isLoading }] = useLoginMutation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isFormValid = email.trim() !== '' && password.trim() !== '';
  
  const isCompact = screenHeight < 720 || screenWidth < 360;
  const loginBtnHeight = isCompact ? 48 : 52;
  const loginBtnRadius = isCompact ? 16 : 20;
  const loginBtnTextSize = isCompact ? 18 : 19;

  // Enable scrolling if content exceeds 70% of screen height (leaves room for header and padding)
  const shouldScroll = contentHeight > screenHeight * 0.7;

  const dispatch = useDispatch<AppDispatch>();

  const handleLogin = async () => {
    try {
      setErrorMessage(null);
      // isFormValid checks email.trim() below, but previously sent the raw value — a
      // pasted email with trailing/leading whitespace passed validation (button enabled)
      // but then failed an exact-match backend lookup with a confusing "invalid email or
      // password" error.
      const result = await login({ email: email.trim(), password, deviceLabel: getDeviceLabel() }).unwrap();
      // Fire-and-forget: sync onboarding draft in background, navigate immediately
      syncOnboardingDraft(dispatch, store.getState);
      // Warm the queries the landing screens subscribe to while the navigation transition
      // animates, so Home renders with data rather than skeletons. Must come after unwrap():
      // these endpoints need the Bearer token, which only reaches the store when the login
      // mutation settles.
      prefetchPostLoginData(dispatch);
      if ((result?.roles ?? []).includes('admin')) {
        navigation.getParent()?.navigate('AdminRedirect' as never);
      } else if (!result.hasCompletedOnboarding) {
        // Push notification permission is requested at the end of onboarding
        // (NotificationPreferencesScreen), not here, so the OS dialog doesn't
        // interrupt the user before the first onboarding slide.
        navigation.navigate('Onboarding');
      } else {
        registerForPushNotifications(dispatch);
        navigation.getParent()?.navigate('Main' as never);
      }
    } catch (err: any) {
      console.error('Login error details:', err);
      // Check if email or password are incorrect (401 Unauthorized)
      if (
        err.status === 401 ||
        err.data?.statusCode === 401 ||
        err.data?.message?.toLowerCase()?.includes('invalid email or password') ||
        err.message?.toLowerCase()?.includes('invalid email or password')
      ) {
        showAlert('Error', 'invalid email or password');
      } else {
        if (err.data && err.data.message) {
          if (Array.isArray(err.data.message)) {
            setErrorMessage(err.data.message.join(', '));
          } else {
            setErrorMessage(err.data.message);
          }
        } else if (err.error) {
          setErrorMessage(err.error);
        } else {
          setErrorMessage('Failed to connect to the backend server. Please verify the backend is running and correct IP is configured.');
        }
      }
    }
  };

  const handleContentLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setContentHeight(height);
  };

  return (
    <AuthLayout
      title="Log in"
      subtitle="Enter your credentials and log in to continue."
      centerTitle
      scrollable={true}
      brandCardHeight={150}
    >
      <View onLayout={handleContentLayout}>
        <AuthInput
          icon="@"
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <AuthInput
          icon={require('../../../assets/login screen/input-placeholders/lock.png')}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <View style={[styles.optionsRow, isCompact && { marginBottom: spacing.xs }]}>
          <TouchableOpacity
            style={styles.rememberRow}
            onPress={() => setRemember((v) => !v)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, remember && styles.checkboxOn]}>
              {remember ? <Text style={styles.check}>✓</Text> : null}
            </View>
            <Text style={styles.rememberText}>Remember Me</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgot}>
              <Text style={styles.forgotLink}>Forgot Password</Text> ?
            </Text>
          </TouchableOpacity>
        </View>

        {errorMessage ? (
          <View style={[styles.errorContainer, styles.errorRow]}>
            <WarningIcon color="#D32F2F" size={16} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.loginWrap,
            { marginTop: isCompact ? spacing.sm : spacing.md },
          ]}
          onPress={handleLogin}
          disabled={!isFormValid || isLoading}
          activeOpacity={0.9}
        >
          <View
            style={[
              styles.loginBtn,
              { height: loginBtnHeight, borderRadius: loginBtnRadius },
              (!isFormValid || isLoading) && styles.loginBtnDisabled,
            ]}
          >
            <View style={styles.loginContent}>
              <Text
                style={[
                  styles.loginBtnText,
                  { fontSize: loginBtnTextSize },
                  (!isFormValid || isLoading) && styles.loginBtnTextDisabled,
                ]}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Text>
              {!isLoading && (
                <Text
                  style={[
                    styles.loginBtnText,
                    { fontSize: loginBtnTextSize },
                    !isFormValid && styles.loginBtnTextDisabled,
                  ]}
                >
                  →
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.registerLinkWrap}>
          <Text style={styles.registerHint}>Don&apos;t have an account?</Text>
          <AnimatedLink label="Register New User" onPress={() => navigation.navigate('Register')} />
        </View>

        <SocialLoginRow compact />
        <LegalFooter compact />
      </View>
    </AuthLayout>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.neutralLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: colors.brandPink,
    borderColor: colors.brandPink,
  },
  check: { color: colors.white, fontSize: 12, fontWeight: '800' },
  rememberText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  forgot: { fontSize: 14, color: colors.textMuted },
  forgotLink: { textDecorationLine: 'underline', fontWeight: '600' },
  loginBtn: {
    // width: 'auto',
    backgroundColor: colors.primary,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm + 2,
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
      },
    }),
  },
  loginWrap: {
    borderRadius: 20,
    alignSelf: 'center',
    width: '70%',
  },
  loginContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loginBtnText: {
    color: colors.white,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loginBtnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.5,
  },
  loginBtnTextDisabled: { color: '#B5B5BD' },
  registerLinkWrap: {
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  registerHint: {
    fontSize: 14,
    color: colors.textMuted,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  errorContainer: {
    backgroundColor: '#FFEBEB',
    borderColor: '#FFD1D1',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default LoginScreen;
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthActions } from '../../components/auth/AuthActions';
import { LegalFooter } from '../../components/auth/LegalFooter';
import { SocialLoginRow } from '../../components/auth/SocialLoginRow';
import { AuthStackParamList, RootStackParamList } from '../../navigation/types';
import { spacing } from '../../theme/spacing';
import { useRegisterMutation } from '../../store/services/authApi';
import { useDispatch } from 'react-redux';
import { AppDispatch, store } from '../../store';
import { syncOnboardingDraft } from '../../utils/syncOnboardingDraft';
import { registerForPushNotifications } from '../../utils/registerForPushNotifications';
import { getDeviceLabel } from '../../utils/getDeviceLabel';
import { prefetchPostLoginData } from '../../utils/prefetchPostLoginData';
import { Text } from '../../components/common/Text';
import { WarningIcon } from '../../components/common/Icons';
import InlineDatePicker from '../../components/common/InlineDatePicker';
import { isAtLeastAge, latestDateOfBirthForMinAge } from '../../utils/dateFormat';
import { useTheme } from '../../theme/ThemeContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const MIN_AGE = 18;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  // Register lives inside the Auth child navigator — LegalDocument is a RootStack screen,
  // so opening it (from the checkbox's inline links below) goes through the parent, same
  // as LegalFooter's own links.
  const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [register, { isLoading }] = useRegisterMutation();

  const isOldEnough = !!dateOfBirth && isAtLeastAge(dateOfBirth, MIN_AGE);
  // Matches ForgotPasswordScreen's isEmailValid check — previously only checked
  // non-empty, so a syntactically invalid string (no "@") could pass client-side
  // validation and rely entirely on the backend to reject it.
  const isEmailValid = email.trim() !== '' && email.includes('@');
  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    isEmailValid &&
    password.length >= 8 &&
    password === confirm &&
    isOldEnough &&
    agreedToTerms &&
    !isLoading;

  const dispatch = useDispatch<AppDispatch>();

  const handleRegister = async () => {
    try {
      setErrorMessage(null);
      const result = await register({
        email: email.trim(),
        password,
        firstName,
        lastName,
        dateOfBirth,
        deviceLabel: getDeviceLabel(),
      }).unwrap();
      // Fire-and-forget: sync onboarding draft in background, navigate immediately
      syncOnboardingDraft(dispatch, store.getState);
      prefetchPostLoginData(dispatch);
      if (!result.hasCompletedOnboarding) {
        // Push notification permission is requested at the end of onboarding
        // (NotificationPreferencesScreen), not here.
        navigation.navigate('Onboarding');
      } else {
        registerForPushNotifications(dispatch);
        navigation.getParent()?.navigate('Main' as never);
      }
    } catch (err: any) {
      console.error('Registration error details:', err);
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
  };

  return (
    <AuthLayout
      title="Sign up"
      subtitle="Enter your credentials and register to continue."
      centerTitle
      scrollable={true}
      brandCardHeight={150}
    >
      <View style={styles.nameRow}>
        <View style={styles.nameField}>
          <AuthInput placeholder="First Name" value={firstName} onChangeText={setFirstName} />
        </View>
        <View style={styles.nameField}>
          <AuthInput placeholder="Last Name" value={lastName} onChangeText={setLastName} />
        </View>
      </View>
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
        placeholder="Create Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <AuthInput
        icon={require('../../../assets/login screen/input-placeholders/lock.png')}
        placeholder="Confirm Password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
      />
      <InlineDatePicker
        value={dateOfBirth}
        onChange={setDateOfBirth}
        placeholder="Date of Birth"
        maximumDate={latestDateOfBirthForMinAge(MIN_AGE)}
        variant="auth"
      />
      {dateOfBirth && !isOldEnough ? (
        <Text style={styles.ageHint}>You must be at least {MIN_AGE} to create an account.</Text>
      ) : null}

      <TouchableOpacity
        style={styles.agreeRow}
        onPress={() => setAgreedToTerms((prev) => !prev)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, agreedToTerms && { backgroundColor: colors.brandPink, borderColor: colors.brandPink }]}>
          {agreedToTerms ? <Text style={styles.checkboxMark}>✓</Text> : null}
        </View>
        {/* "Terms of Use"/"Privacy Policy" are separately tappable (nested Text onPress
            wins over the outer TouchableOpacity's, standard RN touch-responder behavior),
            so a user can actually open and read what they're agreeing to from here, not
            only from LegalFooter below. Tapping elsewhere in the row still toggles the
            checkbox as before. */}
        <Text style={styles.agreeText}>
          I agree to the{' '}
          <Text style={styles.agreeLink} onPress={() => rootNavigation?.navigate('LegalDocument', { doc: 'terms' })}>
            Terms of Use
          </Text>
          {' '}and{' '}
          <Text style={styles.agreeLink} onPress={() => rootNavigation?.navigate('LegalDocument', { doc: 'privacy' })}>
            Privacy Policy
          </Text>
        </Text>
      </TouchableOpacity>

      {errorMessage ? (
        <View style={[styles.errorContainer, styles.errorRow]}>
          <WarningIcon color="#D32F2F" size={16} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <AuthActions
        primaryLabel={isLoading ? 'Registering...' : 'Create Account'}
        onPrimary={handleRegister}
        onBack={() => navigation.goBack()}
        primaryDisabled={!canSubmit}
      />
      {/* <OutlineButtonRow
        leftLabel="Log In"
        rightLabel="Continue as Guest"
        onLeft={() => navigation.navigate('Login')}
        onRight={handleRegister}
      /> */}

      <SocialLoginRow compact appleIconVariant="inverted" />
      <LegalFooter />
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  nameRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  nameField: {
    flex: 1,
  },
  ageHint: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 4,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#C8C8D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 14,
  },
  agreeText: {
    flex: 1,
    fontSize: 13,
  },
  agreeLink: {
    color: '#FF3366', // colors.brandPink — matches LegalFooter's link color
    fontWeight: '600',
    textDecorationLine: 'underline',
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
    marginVertical: spacing.sm,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default RegisterScreen;

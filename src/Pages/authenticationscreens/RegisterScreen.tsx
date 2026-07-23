import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthActions, OutlineButtonRow } from '../../components/auth/AuthActions';
import { LegalFooter } from '../../components/auth/LegalFooter';
import { SocialLoginRow } from '../../components/auth/SocialLoginRow';
import { AuthStackParamList } from '../../navigation/types';
import { spacing } from '../../theme/spacing';
import { useRegisterMutation } from '../../store/services/authApi';
import { useDispatch } from 'react-redux';
import { AppDispatch, store } from '../../store';
import { syncOnboardingDraft } from '../../utils/syncOnboardingDraft';
import { registerForPushNotifications } from '../../utils/registerForPushNotifications';
import { Text } from '../../components/common/Text';
import { WarningIcon } from '../../components/common/Icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [register, { isLoading }] = useRegisterMutation();

  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    password.length >= 8 &&
    password === confirm &&
    !isLoading;

  const dispatch = useDispatch<AppDispatch>();

  const handleRegister = async () => {
    try {
      setErrorMessage(null);
      const result = await register({ email, password, firstName, lastName }).unwrap();
      // Fire-and-forget: sync onboarding draft + register for push in background, navigate immediately
      syncOnboardingDraft(dispatch, store.getState);
      registerForPushNotifications(dispatch);
      if (!result.hasCompletedOnboarding) {
        // A brand-new account always needs the onboarding chain now, since it runs after
        // registration instead of before it.
        navigation.navigate('Onboarding');
      } else {
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

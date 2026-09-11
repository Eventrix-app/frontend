import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthActions, OutlineButtonRow } from '../../components/auth/AuthActions';
import { LegalFooter } from '../../components/auth/LegalFooter';
import { AuthStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { useForgotPasswordMutation } from '../../store/services/authApi';
import { Text } from '../../components/common/Text';
import { WarningIcon } from '../../components/common/Icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleSendRequest = async () => {
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    try {
      setErrorMessage(null);
      await forgotPassword({ email: email.trim().toLowerCase() }).unwrap();
      // On success, navigate to Update Password screen with email
      navigation.navigate('UpdatePassword', { email: email.trim().toLowerCase() });
    } catch (err: any) {
      if (__DEV__) console.error('Forgot password error:', err);
      if (err.data && err.data.message) {
        if (Array.isArray(err.data.message)) {
          setErrorMessage(err.data.message.join(', '));
        } else {
          setErrorMessage(err.data.message);
        }
      } else if (err.error) {
        setErrorMessage(err.error);
      } else {
        setErrorMessage('Failed to send reset code. Please check your network connection.');
      }
    }
  };

  const isEmailValid = email.trim() !== '' && email.includes('@');

  return (
    <AuthLayout
      title="Forgot Password ?"
      subtitle="Enter your email and we'll send you a 6-digit reset code."
      centerTitle
    >
      <AuthInput
        icon="@"
        placeholder="Email Address"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (errorMessage) setErrorMessage(null);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {errorMessage ? (
        <View style={[styles.errorContainer, styles.errorRow]}>
          <WarningIcon color={colors.errorSoftText} size={16} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <AuthActions
        primaryLabel={isLoading ? 'Sending...' : 'Send Request'}
        onPrimary={handleSendRequest}
        onBack={() => navigation.goBack()}
        primaryDisabled={!isEmailValid || isLoading}
      />

      <View style={styles.spacer} />
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>Or continue with</Text>
        <View style={styles.line} />
      </View>
      <OutlineButtonRow
        leftLabel="Log In"
        rightLabel="Sign Up"
        onLeft={() => navigation.navigate('Login')}
        onRight={() => navigation.navigate('Register')}
      />
      <LegalFooter />
    </AuthLayout>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  spacer: {
    height: spacing.xxl * 2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.neutralLine,
  },
  dividerText: {
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
    backgroundColor: colors.errorSoft,
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.errorSoftText,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default ForgotPasswordScreen;

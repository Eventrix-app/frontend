import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch } from 'react-redux';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthActions } from '../../components/auth/AuthActions';
import { LegalFooter } from '../../components/auth/LegalFooter';
import { Text } from '../../components/common/Text';
import { WarningIcon } from '../../components/common/Icons';
import { AuthStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { useResendAdminOtpMutation, useVerifyAdminOtpMutation } from '../../store/services/authApi';
import { AppDispatch } from '../../store';
import { prefetchPostLoginData } from '../../utils/prefetchPostLoginData';

type Props = NativeStackScreenProps<AuthStackParamList, 'AdminOtp'>;

const RESEND_COOLDOWN_SECONDS = 60;

const errorText = (err: any, fallback: string): string => {
  const message = err?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return fallback;
};

const AdminOtpScreen: React.FC<Props> = ({ route, navigation }) => {
  const { challengeId, maskedEmail } = route.params;
  const [otp, setOtp] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const [verifyAdminOtp, { isLoading }] = useVerifyAdminOtpMutation();
  const [resendAdminOtp, { isLoading: isResending }] = useResendAdminOtpMutation();
  const dispatch = useDispatch<AppDispatch>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const isValid = /^\d{6}$/.test(otp);

  const handleVerify = async () => {
    if (!isValid || isLoading) return;
    try {
      setErrorMessage(null);
      setNotice(null);
      await verifyAdminOtp({ challengeId, otp }).unwrap();
      prefetchPostLoginData(dispatch);
      navigation.getParent()?.navigate('AdminRedirect' as never);
    } catch (err: any) {
      if (__DEV__) console.error('Admin OTP verify error:', err);
      setOtp('');
      setErrorMessage(errorText(err, 'Could not verify the code. Please try again.'));
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    try {
      setErrorMessage(null);
      await resendAdminOtp({ challengeId }).unwrap();
      setOtp('');
      setNotice('A new code is on its way.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      setErrorMessage(errorText(err, 'Could not resend the code.'));
    }
  };

  return (
    <AuthLayout
      title="Admin verification"
      subtitle={`Enter the 6-digit code we sent to ${maskedEmail}`}
      centerTitle
    >
      <AuthInput
        placeholder="6-digit code"
        value={otp}
        onChangeText={(text) => {
          setOtp(text.replace(/\D/g, '').slice(0, 6));
          if (errorMessage) setErrorMessage(null);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus
      />

      {errorMessage ? (
        <View style={[styles.errorContainer, styles.errorRow]}>
          <WarningIcon color={colors.errorSoftText} size={16} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}
      {notice && !errorMessage ? <Text style={styles.notice}>{notice}</Text> : null}

      <AuthActions
        primaryLabel={isLoading ? 'Verifying...' : 'Verify'}
        onPrimary={handleVerify}
        onBack={() => navigation.goBack()}
        primaryDisabled={!isValid || isLoading}
      />

      <TouchableOpacity
        style={styles.resendWrap}
        onPress={handleResend}
        disabled={cooldown > 0 || isResending}
        accessibilityRole="button"
      >
        <Text style={[styles.resend, (cooldown > 0 || isResending) && styles.resendDisabled]}>
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </Text>
      </TouchableOpacity>

      <LegalFooter />
    </AuthLayout>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
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
  notice: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  resendWrap: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  resend: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textDecorationLine: 'underline',
  },
  resendDisabled: {
    color: colors.textMuted,
    textDecorationLine: 'none',
  },
});

export default AdminOtpScreen;

import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { AuthInput } from '../../components/auth/AuthInput';
import { Text } from '../../components/common/Text';
import { WarningIcon } from '../../components/common/Icons';
import { RootStackParamList } from '../../navigation/types';
import { ColorPalette } from '../../theme/colors.light';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { useGetMeQuery } from '../../store/services/userApi';
import SimpleListSkeleton from '../../components/common/SimpleListSkeleton';
import {
  useSendEmailVerificationOtpMutation,
  useConfirmEmailVerificationMutation,
} from '../../store/services/authApi';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyEmail'>;

function errorMessageFrom(err: any, fallback: string): string {
  if (err?.data?.message) {
    return Array.isArray(err.data.message) ? err.data.message.join(', ') : err.data.message;
  }
  if (err?.error) return err.error;
  return fallback;
}

const VerifyEmailScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: me, refetch: refetchMe, isLoading: isLoadingMe } = useGetMeQuery();
  const [sendOtp, { isLoading: isSending }] = useSendEmailVerificationOtpMutation();
  const [confirmOtp, { isLoading: isConfirming }] = useConfirmEmailVerificationMutation();

  const [codeSent, setCodeSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSendCode = async () => {
    try {
      setErrorMessage(null);
      await sendOtp().unwrap();
      setCodeSent(true);
    } catch (err) {
      setErrorMessage(errorMessageFrom(err, 'Failed to send verification code. Please try again.'));
    }
  };

  const handleVerify = async () => {
    if (!otp.trim()) {
      setErrorMessage('Please enter the verification code.');
      return;
    }
    try {
      setErrorMessage(null);
      await confirmOtp({ otp: otp.trim() }).unwrap();
      await refetchMe();
      setIsSuccess(true);
    } catch (err) {
      setErrorMessage(errorMessageFrom(err, 'Invalid or expired code. Please try again.'));
    }
  };

  // Rendered before either branch below, because both of them are claims about the user's
  // verification state and `me` is what decides which is true. Without this, an
  // already-verified user briefly sees "enter the code we sent you" — an instruction for
  // something they do not need to do — before it flips to the verified panel.
  if (isLoadingMe && !isSuccess) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader title="Verify Email" onBack={() => navigation.goBack()} />
        <SimpleListSkeleton count={2} />
      </View>
    );
  }

  if (me?.isEmailVerified || isSuccess) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader title="Verify Email" onBack={() => navigation.goBack()} />
        <View style={styles.successContainer}>
          <View style={styles.successIconGlass}>
            <View style={styles.successIconContent}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
          </View>
          <Text style={styles.successTitle}>Email Verified!</Text>
          <Text style={styles.successText}>Your email address has been successfully verified.</Text>
          <TouchableOpacity style={styles.doneBtnWrap} onPress={() => navigation.goBack()} activeOpacity={0.9}>
            <View style={styles.doneBtn}>
              <View style={styles.doneBtnContent}>
                <Text style={styles.doneBtnText}>Done</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Verify Email" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.groupGlass}>
          <View style={styles.group}>
            <Text style={styles.label}>Email address</Text>
            <Text style={styles.email}>{me?.email ?? '—'}</Text>
          </View>
        </View>

        {!codeSent ? (
          <>
            <Text style={styles.helperText}>
              We'll send a 6-digit verification code to this email address.
            </Text>
            <TouchableOpacity style={styles.primaryBtnWrap} onPress={handleSendCode} disabled={isSending} activeOpacity={0.9}>
              <View style={[styles.primaryBtn, isSending && styles.primaryBtnDisabled]}>
                <View style={styles.primaryBtnContent}>
                  <Text style={styles.primaryBtnText}>{isSending ? 'Sending...' : 'Send Verification Code'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.helperText}>
              Enter the 6-digit code we sent to {me?.email}.
            </Text>
            <AuthInput
              placeholder="Verification Code (OTP)"
              value={otp}
              onChangeText={(text) => {
                setOtp(text);
                if (errorMessage) setErrorMessage(null);
              }}
              keyboardType="number-pad"
              autoCapitalize="none"
            />

            {errorMessage ? (
              <View style={[styles.errorContainer, styles.errorRow]}>
                <WarningIcon color="#D32F2F" size={16} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.primaryBtnWrap} onPress={handleVerify} disabled={isConfirming} activeOpacity={0.9}>
              <View style={[styles.primaryBtn, isConfirming && styles.primaryBtnDisabled]}>
                <View style={styles.primaryBtnContent}>
                  <Text style={styles.primaryBtnText}>{isConfirming ? 'Verifying...' : 'Verify Email'}</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSendCode} disabled={isSending} style={styles.resendWrap}>
              <Text style={styles.resendText}>{isSending ? 'Resending...' : "Didn't get a code? Resend"}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: ColorPalette) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.neutralBg,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  groupGlass: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.white,
    marginBottom: spacing.lg,
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
  group: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  label: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  helperText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  primaryBtnWrap: {
    borderRadius: 20,
    marginTop: spacing.xs,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.primary,
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
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnContent: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  resendWrap: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  resendText: {
    fontSize: 14,
    color: colors.brandPink,
    fontWeight: '600',
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
    marginBottom: spacing.md,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  successIconGlass: {
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    marginBottom: spacing.md,
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
  successIconContent: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    color: colors.success,
    fontSize: 40,
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
    fontFamily: 'ZalandoSansExpanded_700Bold',
  },
  successText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  doneBtnWrap: {
    width: '100%',
    borderRadius: 16,
  },
  doneBtn: {
    backgroundColor: colors.brandPink,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
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
  doneBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  doneBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VerifyEmailScreen;

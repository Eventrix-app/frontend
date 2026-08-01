import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthActions, OutlineButtonRow } from '../../components/auth/AuthActions';
import { LegalFooter } from '../../components/auth/LegalFooter';
import { AuthStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { useResetPasswordMutation } from '../../store/services/authApi';
import { Text } from '../../components/common/Text';
import { WarningIcon } from '../../components/common/Icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'UpdatePassword'>;

const UpdatePasswordScreen: React.FC<Props> = ({ route, navigation }) => {
  const email = route.params?.email ?? '';

  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Requirements check matching mockup
  const hasMinLength = password.length >= 8;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_#\-+=]/.test(password);

  const handleUpdatePassword = async () => {
    if (!otp.trim()) {
      setErrorMessage('Please enter the verification code.');
      return;
    }
    if (!hasMinLength || !hasLowercase || !hasUppercase || !hasNumber || !hasSpecialChar) {
      setErrorMessage('Password does not meet all requirements.');
      return;
    }
    if (password !== confirm) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setErrorMessage(null);
      await resetPassword({ token: otp.trim(), password }).unwrap();
      setIsSuccess(true);
    } catch (err: any) {
      if (__DEV__) console.error('Reset password error:', err);
      if (err.data && err.data.message) {
        if (Array.isArray(err.data.message)) {
          setErrorMessage(err.data.message.join(', '));
        } else {
          setErrorMessage(err.data.message);
        }
      } else if (err.error) {
        setErrorMessage(err.error);
      } else {
        setErrorMessage('Failed to update password. Please check your verification code and try again.');
      }
    }
  };

  const isFormValid = otp.trim().length > 0 &&
    hasMinLength &&
    hasLowercase &&
    hasUppercase &&
    hasNumber &&
    hasSpecialChar &&
    password === confirm;

  if (isSuccess) {
    return (
      <AuthLayout
        title="Success!"
        subtitle="Your password has been successfully updated."
        centerTitle
      >
        <View style={styles.successContainer}>
          <View style={styles.successIconGlass}>
            <View style={styles.successIconContent}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
          </View>

          <Text style={styles.successTitle}>All Set!</Text>
          <Text style={styles.successText}>
            You can now log in to your account with your new password.
          </Text>

          <TouchableOpacity
            style={styles.loginBtnWrap}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.9}
          >
            <View style={styles.loginBtn}>
              <View style={styles.loginBtnContent}>
                <Text style={styles.loginBtnText}>Back to Log In</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
        <LegalFooter />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Change Password"
      subtitle="New password must be different from the previous."
      centerTitle
    >
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

      <AuthInput
        icon={require('../../../assets/auth/lock.png')}
        placeholder="Create Password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (errorMessage) setErrorMessage(null);
        }}
        secureTextEntry
      />

      <AuthInput
        icon={require('../../../assets/auth/lock.png')}
        placeholder="Confirm Password"
        value={confirm}
        onChangeText={(text) => {
          setConfirm(text);
          if (errorMessage) setErrorMessage(null);
        }}
        secureTextEntry
      />

      {/* Password Requirements Checklist */}
      {password.length > 0 && (
        <View style={styles.reqContainer}>
          <View style={styles.reqHeaderRow}>
            <Text style={styles.reqHeaderTitle}>Password must contain:</Text>
            <View style={styles.reqHeaderLine} />
          </View>

          <View style={styles.reqRow}>
            <View style={[styles.reqCheck, hasMinLength && styles.reqCheckMet]}>
              {hasMinLength ? <Text style={styles.reqCheckText}>✓</Text> : null}
            </View>
            <Text style={[styles.reqLabel, hasMinLength && styles.reqLabelMet]}>8 or more characters</Text>
          </View>

          <View style={styles.reqRow}>
            <View style={[styles.reqCheck, hasLowercase && styles.reqCheckMet]}>
              {hasLowercase ? <Text style={styles.reqCheckText}>✓</Text> : null}
            </View>
            <Text style={[styles.reqLabel, hasLowercase && styles.reqLabelMet]}>Atleast 1 lowercase letter</Text>
          </View>

          <View style={styles.reqRow}>
            <View style={[styles.reqCheck, hasUppercase && styles.reqCheckMet]}>
              {hasUppercase ? <Text style={styles.reqCheckText}>✓</Text> : null}
            </View>
            <Text style={[styles.reqLabel, hasUppercase && styles.reqLabelMet]}>Atleast 1 uppercase letter</Text>
          </View>

          <View style={styles.reqRow}>
            <View style={[styles.reqCheck, hasNumber && styles.reqCheckMet]}>
              {hasNumber ? <Text style={styles.reqCheckText}>✓</Text> : null}
            </View>
            <Text style={[styles.reqLabel, hasNumber && styles.reqLabelMet]}>Atleast 1 number</Text>
          </View>

          <View style={styles.reqRow}>
            <View style={[styles.reqCheck, hasSpecialChar && styles.reqCheckMet]}>
              {hasSpecialChar ? <Text style={styles.reqCheckText}>✓</Text> : null}
            </View>
            <Text style={[styles.reqLabel, hasSpecialChar && styles.reqLabelMet]}>Atleast 1 special character</Text>
          </View>
        </View>
      )}

      {errorMessage ? (
        <View style={[styles.errorContainer, styles.errorRow]}>
          <WarningIcon color="#D32F2F" size={16} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <AuthActions
        primaryLabel={isLoading ? 'Updating...' : 'Change Password'}
        onPrimary={handleUpdatePassword}
        onBack={() => navigation.goBack()}
        primaryDisabled={!isFormValid || isLoading}
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
    height: spacing.md,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.md,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
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
      fontFamily: 'ZalandoSansExpanded_700Bold'
},
  successText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  loginBtnWrap: {
    width: '100%',
    borderRadius: 16,
  },
  loginBtn: {
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
  loginBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  loginBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  reqContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  reqHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  reqHeaderTitle: {
    fontSize: 14,
    color: colors.textMuted,
      fontFamily: 'ZalandoSansExpanded_500Medium'
},
  reqHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reqCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqCheckMet: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  reqCheckText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  reqLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  reqLabelMet: {
    color: colors.text,
    fontWeight: '500',
  },
});

export default UpdatePasswordScreen;

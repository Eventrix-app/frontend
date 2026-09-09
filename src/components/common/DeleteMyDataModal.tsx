import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GoogleSignin, statusCodes, isErrorWithCode } from '@react-native-google-signin/google-signin';
import HalfScreenModal from './halfscreenmodal';
import Input from './Input';
import Button from './Button';
import { Text } from './Text';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { useEraseMyDataMutation } from '../../store/services/userApi';
import { showAlert } from '../../utils/crossPlatformAlert';

type Provider = 'google';

const PROVIDER_LABEL: Record<Provider, string> = {
  google: 'Google',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onErased: () => void;
  hasPassword: boolean;
  // Linked social sign-in providers for this account (CurrentUser.authProviders) — only
  // relevant when hasPassword is false, to know which provider to re-authenticate with.
  authProviders: string[];
}

// DPDP-Act "delete my data" confirmation — collects the identity proof
// UsersService.eraseMyData requires (current password, or a fresh provider re-auth for a
// social-only account) before calling the mutation, then hands control back via onErased.
export const DeleteMyDataModal: React.FC<Props> = ({ visible, onClose, onErased, hasPassword, authProviders }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [password, setPassword] = useState('');
  const [eraseMyData, { isLoading }] = useEraseMyDataMutation();
  const [reauthing, setReauthing] = useState(false);

  const linkedProvider = (authProviders.find((p) => p === 'google') as Provider | undefined);

  const submitReauth = async (provider: Provider, token: string) => {
    try {
      await eraseMyData({ reauth: { provider, token } }).unwrap();
      onErased();
    } catch (err: any) {
      showAlert('Could not delete your data', err?.data?.message ?? 'Re-authentication failed. Please try again.');
    } finally {
      setReauthing(false);
    }
  };

  const reauthWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      const idToken = response.type === 'cancelled' ? undefined : response.data?.idToken;
      if (!idToken) {
        setReauthing(false);
        return;
      }
      await submitReauth('google', idToken);
    } catch (err) {
      setReauthing(false);
      if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) return;
      showAlert('Could not delete your data', 'Re-authentication with Google failed. Please try again.');
    }
  };

  const handleReauthPress = () => {
    setReauthing(true);
    if (linkedProvider === 'google') void reauthWithGoogle();
    else setReauthing(false);
  };

  const handlePasswordSubmit = async () => {
    if (!password) return;
    try {
      await eraseMyData({ currentPassword: password }).unwrap();
      setPassword('');
      onErased();
    } catch (err: any) {
      showAlert('Could not delete your data', err?.data?.message ?? 'Please check your password and try again.');
    }
  };

  return (
    <HalfScreenModal visible={visible} onClose={onClose} heightPercent={0.62}>
      <View style={styles.content}>
        <Text style={styles.title}>Delete My Data</Text>
        <Text style={styles.body}>
          This permanently erases your profile, interests, saved events, follows, waitlist
          entries, and linked sign-in methods. Records we're legally required to keep —
          bookings, payments, refunds, payouts — are kept, but with your personal details
          removed from them. This cannot be undone.
        </Text>

        {hasPassword ? (
          <>
            <Input
              label="Current password"
              placeholder="Enter your password to confirm"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoFocus
            />
            <Button
              title={isLoading ? 'Deleting…' : 'Permanently delete my data'}
              onPress={handlePasswordSubmit}
              disabled={!password || isLoading}
              loading={isLoading}
              style={styles.confirmBtn}
            />
          </>
        ) : linkedProvider ? (
          <>
            <Text style={styles.body}>
              Confirm it's you by signing in again with {PROVIDER_LABEL[linkedProvider]}.
            </Text>
            <Button
              title={reauthing || isLoading ? 'Confirming…' : `Continue with ${PROVIDER_LABEL[linkedProvider]}`}
              onPress={handleReauthPress}
              disabled={reauthing || isLoading}
              loading={reauthing || isLoading}
              style={styles.confirmBtn}
            />
          </>
        ) : (
          <View style={styles.confirmBtn}>
            <Text style={styles.body}>
              We couldn't determine how to verify your identity. Please contact support to
              erase your data.
            </Text>
          </View>
        )}

        <Button title="Cancel" variant="ghost" onPress={onClose} disabled={isLoading || reauthing} />
        {(isLoading || reauthing) && <ActivityIndicator style={styles.spinner} color={colors.primary} />}
      </View>
    </HalfScreenModal>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  body: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 18 },
  confirmBtn: { marginBottom: spacing.sm },
  spinner: { marginTop: spacing.sm },
});

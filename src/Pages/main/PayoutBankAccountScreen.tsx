import React, { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { AuthInput } from '../../components/auth/AuthInput';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import {
  useGetMyBankAccountQuery,
  useSubmitBankAccountMutation,
  type BankAccountSummary,
} from '../../store/services/organizerApi';
import { showAlert } from '../../utils/crossPlatformAlert';
import { extractErrorMessage } from '../../utils/apiError';
import { Text } from '../../components/common/Text';
import { HourglassIcon, CheckCircleIcon, WarningIcon } from '../../components/common/Icons';

type Props = NativeStackScreenProps<RootStackParamList, 'PayoutBankAccount'>;

// RBI format: 4 letters (bank), '0' (reserved), 6 alphanumerics (branch). Mirrors the
// server-side rule in SubmitBankAccountDto — checked here only to give immediate feedback,
// never as the authority. The server revalidates everything.
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PAN_PATTERN = /^[A-Z]{5}\d{4}[A-Z]$/;
const ACCOUNT_PATTERN = /^\d{9,18}$/;

// The two statuses that are NOT terminal-good. Kept explicit rather than derived so the
// copy below can say something true about each one.
const STATUS_COPY: Record<BankAccountSummary['status'], { title: string; body: string }> = {
  pending: {
    title: 'Awaiting review',
    body: "We've received your bank details. An admin will check them against your KYC documents, usually within 1-2 business days.",
  },
  verified: {
    title: 'Verified — one step left',
    body: "Your details match your documents. Before we can send a real payout we'll transfer ₹1 to confirm the account is live. You'll see it within 2 business days.",
  },
  penny_drop_verified: {
    title: "You're all set",
    body: 'Your account is confirmed. Payouts for your events will be sent here 3 days after each event ends.',
  },
  rejected: {
    title: 'Details rejected',
    body: 'We could not verify this account. Correct the details below and submit again.',
  },
};

const PayoutBankAccountScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: account, isLoading } = useGetMyBankAccountQuery();
  const [submitBankAccount, { isLoading: isSubmitting }] = useSubmitBankAccountMutation();

  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Normalised the same way the server normalises them, so what the user sees validated is
  // what actually gets checked. Spaces and dashes are stripped from account numbers because
  // people copy them off passbooks and cheques formatted in groups.
  const cleanAccount = accountNumber.replace(/[\s-]/g, '');
  const cleanConfirm = confirmAccountNumber.replace(/[\s-]/g, '');
  const cleanIfsc = ifscCode.trim().toUpperCase();
  const cleanPan = panNumber.trim().toUpperCase();

  // Shown under the field only once the user has typed enough for the message to be useful —
  // flagging "too short" against a half-typed account number is just noise.
  const accountError =
    cleanAccount.length >= 9 && !ACCOUNT_PATTERN.test(cleanAccount) ? 'Account number must be 9-18 digits' : null;
  const confirmError =
    cleanConfirm.length >= cleanAccount.length && cleanAccount !== cleanConfirm ? "Account numbers don't match" : null;
  const ifscError = cleanIfsc.length >= 11 && !IFSC_PATTERN.test(cleanIfsc) ? 'Enter a valid 11-character IFSC' : null;
  const panError = cleanPan.length >= 10 && !PAN_PATTERN.test(cleanPan) ? 'Enter a valid 10-character PAN' : null;

  const isFormValid =
    ACCOUNT_PATTERN.test(cleanAccount) &&
    cleanAccount === cleanConfirm &&
    accountHolderName.trim().length >= 2 &&
    IFSC_PATTERN.test(cleanIfsc) &&
    bankName.trim().length >= 2 &&
    (cleanPan === '' || PAN_PATTERN.test(cleanPan));

  const handleSubmit = async () => {
    try {
      await submitBankAccount({
        accountNumber: cleanAccount,
        confirmAccountNumber: cleanConfirm,
        accountHolderName: accountHolderName.trim(),
        ifscCode: cleanIfsc,
        bankName: bankName.trim(),
        branchName: branchName.trim() || undefined,
        panNumber: cleanPan || undefined,
      }).unwrap();
      // Cleared rather than left in state: these are the most sensitive values the app ever
      // holds, and there is no reason to keep them in memory after a successful submit.
      setAccountNumber('');
      setConfirmAccountNumber('');
      setPanNumber('');
      setIsEditing(false);
      showAlert('Submitted', 'Your bank details are now with our team for review.');
    } catch (e: any) {
      showAlert('Submission failed', extractErrorMessage(e, 'Something went wrong. Please try again.'));
    }
  };

  const showStatusOnly = !isLoading && account && !isEditing;
  const statusCopy = account ? STATUS_COPY[account.status] : null;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title="Payout Account" onBack={() => navigation.goBack()} />

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.brandPink} />
        </View>
      ) : showStatusOnly ? (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}>
          <View style={styles.statusWrap}>
            <View style={styles.statusIcon}>
              {account!.isPayoutReady ? (
                <CheckCircleIcon color="#10B981" size={56} />
              ) : account!.status === 'rejected' ? (
                <WarningIcon color={colors.error ?? '#DC2626'} size={56} />
              ) : (
                <HourglassIcon color={colors.textSecondary} size={56} />
              )}
            </View>
            <Text style={styles.statusTitle}>{statusCopy!.title}</Text>
            <Text style={styles.statusSubtitle}>{statusCopy!.body}</Text>
            {account!.status === 'rejected' && account!.rejectionReason ? (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonText}>{account!.rejectionReason}</Text>
              </View>
            ) : null}
          </View>

          {/* Only ever the last four digits — the full number never leaves the server. */}
          <View style={styles.card}>
            <Row label="Account" value={`•••• ${account!.accountNumberLast4}`} colors={colors} />
            <Row label="IFSC" value={account!.ifscCode} colors={colors} />
            <Row label="Bank" value={account!.bankName} colors={colors} />
            {account!.branchName ? <Row label="Branch" value={account!.branchName} colors={colors} /> : null}
            <Row
              label="Type"
              value={account!.accountType === 'current' ? 'Current' : 'Savings'}
              colors={colors}
            />
          </View>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setIsEditing(true)}>
            <Text style={styles.secondaryBtnText}>
              {account!.status === 'rejected' ? 'Correct & Resubmit' : 'Change Account'}
            </Text>
          </TouchableOpacity>
          {/* Said plainly, because it surprises people: changing a verified account resets it
              to pending and pauses payouts until the new one clears both checks again. */}
          {account!.isPayoutReady ? (
            <Text style={styles.warnNote}>
              Changing your account restarts verification. Payouts pause until the new account is confirmed.
            </Text>
          ) : null}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>
            This is where we'll send your event earnings. Double-check every digit — bank transfers can't be
            reversed once sent.
          </Text>

          <Text style={styles.label}>Account Holder Name</Text>
          <AuthInput
            value={accountHolderName}
            onChangeText={setAccountHolderName}
            placeholder="Exactly as it appears on your bank records"
          />

          <Text style={styles.label}>Account Number</Text>
          <AuthInput
            value={accountNumber}
            onChangeText={setAccountNumber}
            placeholder="9-18 digits"
            keyboardType="number-pad"
          />
          {accountError ? <Text style={styles.fieldError}>{accountError}</Text> : null}

          <Text style={styles.label}>Confirm Account Number</Text>
          <AuthInput
            value={confirmAccountNumber}
            onChangeText={setConfirmAccountNumber}
            placeholder="Re-enter the account number"
            keyboardType="number-pad"
            // Pasting defeats the point of a confirmation field — it copies the typo too.
            contextMenuHidden
          />
          {confirmError ? <Text style={styles.fieldError}>{confirmError}</Text> : null}

          <Text style={styles.label}>IFSC Code</Text>
          <AuthInput
            value={ifscCode}
            onChangeText={setIfscCode}
            placeholder="e.g. HDFC0000123"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {ifscError ? <Text style={styles.fieldError}>{ifscError}</Text> : null}

          <Text style={styles.label}>Bank Name</Text>
          <AuthInput value={bankName} onChangeText={setBankName} placeholder="e.g. HDFC Bank" />

          <Text style={styles.label}>Branch (optional)</Text>
          <AuthInput value={branchName} onChangeText={setBranchName} placeholder="e.g. Koramangala" />

          <Text style={styles.label}>PAN (optional)</Text>
          <AuthInput
            value={panNumber}
            onChangeText={setPanNumber}
            placeholder="e.g. ABCPD1234E"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {panError ? <Text style={styles.fieldError}>{panError}</Text> : null}
          <Text style={styles.hint}>
            Needed for tax withholding on your payouts. You can add it later, but we'll ask before your first payout.
          </Text>

          <TouchableOpacity
            style={[styles.submitBtn, (!isFormValid || isSubmitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitBtnText}>Submit for Review</Text>
            )}
          </TouchableOpacity>

          {account ? (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const Row: React.FC<{ label: string; value: string; colors: ReturnType<typeof useTheme>['colors'] }> = ({
  label,
  value,
  colors,
}) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs }}>
    <Text style={{ fontSize: 13, color: colors.textSecondary }}>{label}</Text>
    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{value}</Text>
  </View>
);

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.neutralBg },
    scroll: { padding: spacing.md },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    intro: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.lg },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: spacing.xs,
      marginTop: spacing.sm,
    },
    hint: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 17 },
    fieldError: { fontSize: 12, color: colors.error ?? '#DC2626', marginTop: spacing.xs },
    statusWrap: { alignItems: 'center', paddingVertical: spacing.lg },
    statusIcon: { marginBottom: spacing.md },
    statusTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
    statusSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
    reasonBox: {
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      backgroundColor: (colors.error ?? '#DC2626') + '14',
      alignSelf: 'stretch',
    },
    reasonText: { fontSize: 13, color: colors.error ?? '#DC2626', lineHeight: 19 },
    card: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    warnNote: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.sm,
      lineHeight: 17,
    },
    submitBtn: {
      backgroundColor: colors.brandPink,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
    secondaryBtn: {
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.md,
      backgroundColor: colors.white,
    },
    secondaryBtnText: { color: colors.text, fontSize: 15, fontWeight: '600' },
    cancelBtn: { paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xs },
    cancelBtnText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  });

export default PayoutBankAccountScreen;

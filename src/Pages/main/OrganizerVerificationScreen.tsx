import React, { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { AuthInput } from '../../components/auth/AuthInput';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { useGetUploadUrlMutation, ALLOWED_UPLOAD_CONTENT_TYPES, UploadContentType, UploadPurpose } from '../../store/services/eventsApi';
import {
  useGetMyVerificationStatusQuery,
  useSubmitBankAccountMutation,
  useSubmitVerificationMutation,
} from '../../store/services/organizerApi';
import { showAlert } from '../../utils/crossPlatformAlert';
import { extractErrorMessage } from '../../utils/apiError';
import { Text } from '../../components/common/Text';
import OrganizerVerificationSkeleton from '../../components/common/OrganizerVerificationSkeleton';
import { HourglassIcon, CheckCircleIcon, WarningIcon } from '../../components/common/Icons';

type Props = NativeStackScreenProps<RootStackParamList, 'OrganizerVerification'>;

type DocField = 'identityProofUrl' | 'addressProofUrl' | 'panOrAadhaarUrl';

// Mirrors SubmitBankAccountDto's server-side rules, and deliberately the same constants
// PayoutBankAccountScreen uses — the two screens write to the same account, so a rule that
// disagreed between them would let a value through one and be rejected by the other.
// Checked here only for immediate feedback; the server revalidates everything.
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_PATTERN = /^\d{9,18}$/;

const DOC_FIELDS: { key: DocField; purpose: UploadPurpose; label: string; hint: string }[] = [
  { key: 'identityProofUrl', purpose: 'identity-proof', label: 'Identity Proof', hint: 'Passport, driving license, or voter ID' },
  { key: 'addressProofUrl', purpose: 'address-proof', label: 'Address Proof', hint: 'Utility bill or bank statement' },
  { key: 'panOrAadhaarUrl', purpose: 'pan-or-aadhaar', label: 'PAN or Aadhaar Card', hint: 'Required for payout compliance' },
];

const OrganizerVerificationScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: status, isLoading: isLoadingStatus } = useGetMyVerificationStatusQuery();
  const [getUploadUrl] = useGetUploadUrlMutation();
  const [submitVerification, { isLoading: isSubmitting }] = useSubmitVerificationMutation();
  const [submitBankAccount, { isLoading: isSubmittingBank }] = useSubmitBankAccountMutation();

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [docs, setDocs] = useState<Record<DocField, string>>({
    identityProofUrl: '',
    addressProofUrl: '',
    panOrAadhaarUrl: '',
  });
  const [uploadingField, setUploadingField] = useState<DocField | null>(null);

  const handlePickDocument = async (field: DocField, purpose: UploadPurpose) => {
    if (uploadingField) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('Permission needed', 'Allow photo library access to upload this document.');
      return;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (pickerResult.canceled || !pickerResult.assets.length) return;
    const asset = pickerResult.assets[0];
    if (!asset.uri) {
      showAlert('Selection failed', 'Could not read the selected image.');
      return;
    }
    const contentType = (ALLOWED_UPLOAD_CONTENT_TYPES.includes(asset.mimeType as UploadContentType)
      ? asset.mimeType
      : 'image/jpeg') as UploadContentType;

    setUploadingField(field);
    try {
      // Signed-URL round trip and the local file read are independent; only the PUT needs
      // both, so they overlap instead of queueing.
      const [{ uploadUrl, publicUrl }, fileBlob] = await Promise.all([
        getUploadUrl({ purpose, contentType }).unwrap(),
        fetch(asset.uri).then((r) => r.blob()),
      ]);
      const putResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: fileBlob,
        headers: { 'Content-Type': contentType },
      });
      if (!putResponse.ok) throw new Error('Document upload to storage failed.');
      setDocs((prev) => ({ ...prev, [field]: publicUrl }));
    } catch (e: any) {
      showAlert("Couldn't upload document", extractErrorMessage(e, 'Something went wrong. Please try again.'));
    } finally {
      setUploadingField(null);
    }
  };

  // Normalised exactly as the server normalises them, so what the user sees validated is
  // what actually gets checked. Spaces and dashes come off account numbers because people
  // copy them from a passbook or cheque printed in groups.
  const cleanAccount = accountNumber.replace(/[\s-]/g, '');
  const cleanConfirm = confirmAccountNumber.replace(/[\s-]/g, '');
  const cleanIfsc = ifscCode.trim().toUpperCase();

  // Only shown once enough has been typed for the message to be useful — flagging "too
  // short" against a half-entered account number is noise, not help.
  const accountError =
    cleanAccount.length >= 9 && !ACCOUNT_PATTERN.test(cleanAccount) ? 'Account number must be 9-18 digits' : null;
  const confirmError =
    cleanConfirm.length >= cleanAccount.length && cleanAccount !== cleanConfirm ? "Account numbers don't match" : null;
  const ifscError = cleanIfsc.length >= 11 && !IFSC_PATTERN.test(cleanIfsc) ? 'Enter a valid 11-character IFSC' : null;

  const isFormValid =
    // 2 characters, not merely non-empty: this value is now also sent as the bank account's
    // holder name, where the server enforces a 2-character minimum. Letting a 1-character
    // name through here would submit the KYC fine and then fail the payout leg every time.
    fullName.trim().length >= 2 &&
    companyName.trim() !== '' &&
    upiId.trim() !== '' &&
    ACCOUNT_PATTERN.test(cleanAccount) &&
    cleanAccount === cleanConfirm &&
    IFSC_PATTERN.test(cleanIfsc) &&
    bankName.trim().length >= 2 &&
    docs.identityProofUrl !== '' &&
    docs.addressProofUrl !== '' &&
    docs.panOrAadhaarUrl !== '';

  const handleSubmit = async () => {
    // Strictly ordered, and this is not incidental: BankAccountService.submit() resolves the
    // caller's organizer row and 404s without one, and that row is created by
    // submitVerification on a first-time application. The payout account can only be written
    // after the KYC submission has landed.
    try {
      await submitVerification({
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        upiId: upiId.trim(),
        identityProofUrl: docs.identityProofUrl,
        addressProofUrl: docs.addressProofUrl,
        panOrAadhaarUrl: docs.panOrAadhaarUrl,
      }).unwrap();
    } catch (e: any) {
      showAlert('Submission failed', extractErrorMessage(e, 'Something went wrong. Please try again.'));
      return;
    }

    // KYC is already accepted at this point, so a payout-side failure must not present as a
    // failed application or send the user back to a form whose submission has succeeded.
    // The server can legitimately refuse this leg on its own terms — a 503 when
    // BANK_ENCRYPTION_KEY is unset, or a 409 when the account is already active under
    // another organizer — and neither is a reason to hold up document review.
    try {
      await submitBankAccount({
        accountNumber: cleanAccount,
        confirmAccountNumber: cleanConfirm,
        // The name on the KYC document is the name the account has to be in; admin review
        // checks exactly that, so it is taken from the field above rather than asked twice.
        accountHolderName: fullName.trim(),
        ifscCode: cleanIfsc,
        bankName: bankName.trim(),
      }).unwrap();
    } catch (e: any) {
      showAlert(
        'Verification submitted',
        `${extractErrorMessage(e, "We couldn't save your payout details.")} Your documents are with our team — add your bank details from Profile › Payout Account.`,
      );
      navigation.replace('VerificationSubmitted');
      return;
    }

    // Cleared before navigating: these are the most sensitive values this screen holds and
    // there is no reason to leave them in memory once the server has them.
    setAccountNumber('');
    setConfirmAccountNumber('');
    navigation.replace('VerificationSubmitted');
  };

  // Submitting is now two sequential requests, and the button has to stay disabled across
  // both — not just the first — or a second tap could fire while the bank leg is in flight.
  const isBusy = isSubmitting || isSubmittingBank;

  // Already approved, pending, or rejected — show status instead of the form. A rejected
  // applicant can still see their reason here, then use "Update & Resubmit" to fall through
  // to the same form below.
  const [isResubmitting, setIsResubmitting] = useState(false);
  const showStatusOnly = !isLoadingStatus && status && status.status !== 'not_submitted' && !isResubmitting;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title="Organizer Verification" onBack={() => navigation.goBack()} />

      {isLoadingStatus ? (
        <OrganizerVerificationSkeleton />
      ) : showStatusOnly ? (
        <View style={styles.statusWrap}>
          {status!.status === 'pending' ? (
            <>
              <View style={styles.statusIcon}>
                <HourglassIcon color={colors.textSecondary} size={56} />
              </View>
              <Text style={styles.statusTitle}>Verification pending</Text>
              <Text style={styles.statusSubtitle}>
                We've received your details and they're awaiting admin review. This usually takes 1-2 business days.
              </Text>
            </>
          ) : status!.status === 'approved' ? (
            <>
              <View style={styles.statusIcon}>
                <CheckCircleIcon color={colors.success} size={56} />
              </View>
              <Text style={styles.statusTitle}>You're verified!</Text>
              <Text style={styles.statusSubtitle}>You can now create and publish events.</Text>
            </>
          ) : (
            <>
              <View style={styles.statusIcon}>
                <WarningIcon color={colors.error ?? '#DC2626'} size={56} />
              </View>
              <Text style={styles.statusTitle}>Verification rejected</Text>
              {status!.rejectionReason ? (
                <Text style={styles.statusSubtitle}>{status!.rejectionReason}</Text>
              ) : null}
              <TouchableOpacity style={styles.resubmitBtn} onPress={() => setIsResubmitting(true)}>
                <Text style={styles.resubmitBtnText}>Update & Resubmit</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>
            To organize events on Eventrix, we need to verify your identity. Upload the documents below — an admin
            will review them before you can create your first event.
          </Text>

          <Text style={styles.label}>Full Name</Text>
          <AuthInput value={fullName} onChangeText={setFullName} placeholder="As shown on your ID" />

          <Text style={styles.label}>Company / Organizer Name</Text>
          <AuthInput value={companyName} onChangeText={setCompanyName} placeholder="e.g. Acme Events Co." />

          <Text style={styles.label}>UPI ID</Text>
          <AuthInput value={upiId} onChangeText={setUpiId} placeholder="yourname@upi" autoCapitalize="none" />

          <Text style={styles.sectionHeading}>Payout Bank Account</Text>
          <Text style={styles.sectionHint}>
            Where your event earnings are settled. The account must be in the same name as your ID — an admin checks
            it against the documents below, then we send ₹1 to confirm it is live before the first real payout.
          </Text>

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

          <Text style={styles.sectionHeading}>Documents</Text>

          {DOC_FIELDS.map((field) => (
            <View key={field.key} style={styles.docRow}>
              <View style={styles.docText}>
                <Text style={styles.docLabel}>{field.label}</Text>
                <Text style={styles.docHint}>{field.hint}</Text>
              </View>
              <TouchableOpacity
                style={[styles.docBtn, docs[field.key] && styles.docBtnDone]}
                onPress={() => handlePickDocument(field.key, field.purpose)}
                disabled={uploadingField !== null}
              >
                {uploadingField === field.key ? (
                  <ActivityIndicator color={colors.brandPink} size="small" />
                ) : (
                  <Text style={[styles.docBtnText, docs[field.key] && styles.docBtnTextDone]}>
                    {docs[field.key] ? '✓ Uploaded' : 'Upload'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.submitBtn, (!isFormValid || isBusy) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!isFormValid || isBusy}
          >
            {isBusy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitBtnText}>Submit for Review</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutralBg },
  scroll: { padding: spacing.md },
  intro: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.sm },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  sectionHint: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginTop: spacing.xs },
  fieldError: { fontSize: 12, color: colors.error ?? '#DC2626', marginTop: spacing.xs },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  docText: { flex: 1 },
  docLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  docHint: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  docBtn: {
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    borderColor: colors.brandPink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 90,
    alignItems: 'center',
  },
  docBtnDone: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: colors.success },
  docBtnText: { fontSize: 13, fontWeight: '600', color: colors.brandPink },
  docBtnTextDone: { color: colors.successSoftText },
  submitBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  statusWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  statusIcon: { fontSize: 56, marginBottom: spacing.sm },
  statusTitle: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  statusSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  resubmitBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  resubmitBtnText: { color: colors.white, fontWeight: '600' },
});

export default OrganizerVerificationScreen;

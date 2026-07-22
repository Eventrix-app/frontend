import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
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
import { useGetMyVerificationStatusQuery, useSubmitVerificationMutation } from '../../store/services/organizerApi';
import { showAlert } from '../../utils/crossPlatformAlert';
import { extractErrorMessage } from '../../utils/apiError';
import { Text } from '../../components/common/Text';
import OrganizerVerificationSkeleton from '../../components/common/OrganizerVerificationSkeleton';
import { HourglassIcon, CheckCircleIcon, WarningIcon } from '../../components/common/Icons';

type Props = NativeStackScreenProps<RootStackParamList, 'OrganizerVerification'>;

type DocField = 'identityProofUrl' | 'addressProofUrl' | 'panOrAadhaarUrl';

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

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [upiId, setUpiId] = useState('');
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
      const { uploadUrl, publicUrl } = await getUploadUrl({ purpose, contentType }).unwrap();
      const fileBlob = await (await fetch(asset.uri)).blob();
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

  const isFormValid =
    fullName.trim() !== '' &&
    companyName.trim() !== '' &&
    upiId.trim() !== '' &&
    docs.identityProofUrl !== '' &&
    docs.addressProofUrl !== '' &&
    docs.panOrAadhaarUrl !== '';

  const handleSubmit = async () => {
    try {
      await submitVerification({
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        upiId: upiId.trim(),
        identityProofUrl: docs.identityProofUrl,
        addressProofUrl: docs.addressProofUrl,
        panOrAadhaarUrl: docs.panOrAadhaarUrl,
      }).unwrap();
      showAlert('Submitted for review', "We'll notify you once an admin has reviewed your details.");
      navigation.goBack();
    } catch (e: any) {
      showAlert('Submission failed', extractErrorMessage(e, 'Something went wrong. Please try again.'));
    }
  };

  // Already approved, pending, or rejected — show status instead of the form. A rejected
  // applicant can still see their reason here, then use "Update & Resubmit" to fall through
  // to the same form below.
  const [isResubmitting, setIsResubmitting] = useState(false);
  const showStatusOnly = !isLoadingStatus && status && status.status !== 'not_submitted' && !isResubmitting;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
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
                <CheckCircleIcon color="#10B981" size={56} />
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
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}>
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
        </ScrollView>
      )}
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutralBg },
  scroll: { padding: spacing.md },
  intro: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.sm },
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
  docBtnDone: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: '#10B981' },
  docBtnText: { fontSize: 13, fontWeight: '600', color: colors.brandPink },
  docBtnTextDone: { color: '#059669' },
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

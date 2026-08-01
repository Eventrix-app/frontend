import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthInput } from '../../components/auth/AuthInput';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from '../../components/common/Text';
import { RootState } from '../../store';
import { useGetMeQuery, useUpdateParticipantMutation } from '../../store/services/userApi';
import EditProfileSkeleton from '../../components/common/EditProfileSkeleton';
import { useProfilePictureUpload } from '../../hooks/useProfilePictureUpload';
import { showAlert } from '../../utils/crossPlatformAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const { data: me, isLoading: isLoadingMe } = useGetMeQuery();
  const [updateParticipant, { isLoading: isSaving }] = useUpdateParticipantMutation();
  const { isUploading: isUploadingPhoto, pickAndUploadPhoto } = useProfilePictureUpload(userId);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // A fast double-tap can fire before isSaving's re-render lands (same reasoning as
  // CreateEventScreen's isSubmittingRef) — this closes that gap synchronously.
  const isSubmittingRef = useRef(false);

  // Prefill once the real profile loads — a plain effect (not defaultValue) since the
  // query resolves after this component has already mounted with empty fields.
  //
  // Guarded to run exactly once. The dependency is `me`, and getMe refetches on its own
  // (focus, reconnect, any invalidation), so without this guard a background refetch while
  // someone was mid-edit would silently overwrite everything they had typed with the
  // server's copy. Re-running is never desirable here: after the first prefill the form is
  // the user's working draft, not a view of the server state.
  const hasPrefilledRef = useRef(false);
  useEffect(() => {
    if (!me || hasPrefilledRef.current) return;
    hasPrefilledRef.current = true;
    setFirstName(me.firstName ?? '');
    setLastName(me.lastName ?? '');
    setPhone(me.phoneNumber ?? '');
    setCity(me.city ?? '');
  }, [me]);

  const handleSave = async () => {
    // `me` guards against the real bug: firstName/lastName/phone/city all start as '' and
    // only get their real values once getMe() resolves (see the prefill effect above). The
    // backend treats an explicitly-sent '' as "clear this field" (not "leave unchanged"),
    // so saving before `me` loads would silently wipe the user's actual name/phone/city.
    if (!userId || !me || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      await updateParticipant({
        id: userId,
        body: { firstName, lastName, phone, city },
      }).unwrap();
      navigation.goBack();
    } catch (e: any) {
      showAlert('Error', e?.data?.message ?? 'Failed to save changes');
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const initial = (firstName || me?.email || '?').charAt(0).toUpperCase();

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title="Edit Profile" onBack={() => navigation.goBack()} />

      {/* The form is only rendered once it can be prefilled. Showing it while getMe is in
          flight would present empty, fully interactive inputs — and anything typed into
          them would be replaced the moment the profile arrived. */}
      {isLoadingMe ? (
        <EditProfileSkeleton />
      ) : (
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.avatarSection} onPress={pickAndUploadPhoto} disabled={isUploadingPhoto}>
          <View style={styles.avatar}>
            {isUploadingPhoto ? (
              <ActivityIndicator color={colors.brandPink} />
            ) : me?.profilePictureUrl ? (
              <Image source={{ uri: me.profilePictureUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarEmoji}>{initial}</Text>
            )}
          </View>
          <Text style={styles.changePhoto}>Change photo</Text>
        </TouchableOpacity>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>First Name</Text>
            <AuthInput value={firstName} onChangeText={setFirstName} placeholder="First name" />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Last Name</Text>
            <AuthInput value={lastName} onChangeText={setLastName} placeholder="Last name" />
          </View>
        </View>

        {me?.email ? (
          <>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.readOnlyValue}>{me.email}</Text>
          </>
        ) : null}

        <Text style={styles.label}>Phone</Text>
        <AuthInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>City</Text>
        <AuthInput value={city} onChangeText={setCity} placeholder="City" />
      </ScrollView>
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving || !me}>
          {isSaving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scroll: {
    padding: spacing.md,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brandPink,
  },
  avatarEmoji: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.brandPink,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
  },
  readOnlyValue: {
    fontSize: 15,
    color: colors.textSecondary,
    paddingVertical: 10,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  changePhoto: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontWeight: '600',
    color: colors.brandPink,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  saveBtn: {
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditProfileScreen;

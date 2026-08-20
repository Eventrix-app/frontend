import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthInput } from '../../components/auth/AuthInput';
import InlineDatePicker from '../../components/common/InlineDatePicker';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { isAtLeastAge, latestDateOfBirthForMinAge } from '../../utils/dateFormat';
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

// Mirrors the backend's @IsAdult(18) on UpdateParticipantDto.dateOfBirth, and RegisterScreen.
const MIN_AGE = 18;

const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const { data: me, isLoading: isLoadingMe } = useGetMeQuery();
  const [updateParticipant, { isLoading: isSaving }] = useUpdateParticipantMutation();
  const { isUploading: isUploadingPhoto, pickAndUploadPhoto, sourcePicker } = useProfilePictureUpload(userId);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [pincode, setPincode] = useState('');
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
    setGender(me.gender ?? '');
    setDateOfBirth(me.dateOfBirth ?? '');
    setAddressLine(me.addressLine ?? '');
    setCity(me.city ?? '');
    setState(me.state ?? '');
    setCountry(me.country ?? '');
    setPincode(me.pincode ?? '');
  }, [me]);

  // The backend enforces @IsAdult(18) on dateOfBirth and rejects the whole PATCH if it
  // fails, so the same rule is mirrored here to fail on the field rather than losing every
  // other edit to a 400. An untouched empty DOB is left alone — see handleSave.
  const isOldEnough = !dateOfBirth || isAtLeastAge(dateOfBirth, MIN_AGE);

  const handleSave = async () => {
    // `me` guards against the real bug: firstName/lastName/phone/city all start as '' and
    // only get their real values once getMe() resolves (see the prefill effect above). The
    // backend treats an explicitly-sent '' as "clear this field" (not "leave unchanged"),
    // so saving before `me` loads would silently wipe the user's actual name/phone/city.
    if (!userId || !me || isSubmittingRef.current) return;
    if (!isOldEnough) {
      showAlert('Check your date of birth', `You must be at least ${MIN_AGE} years old.`);
      return;
    }
    isSubmittingRef.current = true;
    try {
      await updateParticipant({
        id: userId,
        body: {
          firstName,
          lastName,
          phone,
          gender,
          addressLine,
          city,
          state,
          country,
          pincode,
          // Omitted rather than sent as '' when unset: the DTO skips an absent optional
          // field, but an empty string still reaches @IsAdult(18) and fails validation,
          // which would reject the entire PATCH over a field the user never touched.
          ...(dateOfBirth ? { dateOfBirth } : {}),
        },
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
    // 'padding' on Android too, not just iOS. Leaving Android to `undefined` relies on the
    // window being resized by adjustResize, which no longer happens under the edge-to-edge
    // display this app enables (app.config.js: edgeToEdgeEnabled) — the keyboard just draws
    // over the form, hiding every field below the one being typed into.
    //
    // Safe on both platforms because KeyboardAvoidingView derives its padding by measuring
    // its own frame against the keyboard's screenY: if the window ever does resize, the
    // frame already sits above the keyboard and the computed padding is 0, so this cannot
    // double-count.
    <KeyboardAvoidingView style={[styles.root, { paddingTop: insets.top }]} behavior="padding">
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

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Phone</Text>
            <AuthInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone"
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Gender</Text>
            <AuthInput value={gender} onChangeText={setGender} placeholder="Gender" />
          </View>
        </View>

        {/* Full-width rather than paired: variant="auth" matches AuthInput's chrome (56pt
            tall, 16 radius, same shadow and wrapper margin), but on iOS the picker expands
            an inline calendar directly beneath the field, which a half-width column would
            squeeze. */}
        <Text style={styles.label}>Date of Birth</Text>
        <InlineDatePicker
          value={dateOfBirth}
          onChange={setDateOfBirth}
          placeholder="Date of birth"
          maximumDate={latestDateOfBirthForMinAge(MIN_AGE)}
          variant="auth"
        />
        {!isOldEnough ? (
          <Text style={styles.ageHint}>You must be at least {MIN_AGE} years old.</Text>
        ) : null}

        <Text style={styles.label}>Address</Text>
        <AuthInput value={addressLine} onChangeText={setAddressLine} placeholder="Address" />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>City</Text>
            <AuthInput value={city} onChangeText={setCity} placeholder="City" />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>State</Text>
            <AuthInput value={state} onChangeText={setState} placeholder="State" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Country</Text>
            <AuthInput value={country} onChangeText={setCountry} placeholder="Country" />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Pincode</Text>
            <AuthInput
              value={pincode}
              onChangeText={setPincode}
              placeholder="Pincode"
              keyboardType="number-pad"
            />
          </View>
        </View>
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

      {sourcePicker}
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
  ageHint: {
    color: colors.error,
    fontSize: 12,
    marginTop: spacing.xs,
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

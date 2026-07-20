import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { AuthInput } from '../../components/auth/AuthInput';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from '../../components/common/Text';
import { RootState } from '../../store';
import { useGetMeQuery, useUpdateParticipantMutation } from '../../store/services/userApi';
import { useGetUploadUrlMutation, ALLOWED_UPLOAD_CONTENT_TYPES, UploadContentType } from '../../store/services/eventsApi';
import { showAlert } from '../../utils/crossPlatformAlert';
import { extractErrorMessage } from '../../utils/apiError';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const { data: me } = useGetMeQuery();
  const [updateParticipant, { isLoading: isSaving }] = useUpdateParticipantMutation();
  const [getUploadUrl] = useGetUploadUrlMutation();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Prefill once the real profile loads — a plain effect (not defaultValue) since the
  // query resolves after this component has already mounted with empty fields.
  useEffect(() => {
    if (!me) return;
    setFirstName(me.firstName ?? '');
    setLastName(me.lastName ?? '');
    setPhone(me.phoneNumber ?? '');
    setCity(me.city ?? '');
  }, [me]);

  const handleSave = async () => {
    if (!userId) return;
    try {
      await updateParticipant({
        id: userId,
        body: { firstName, lastName, phone, city },
      }).unwrap();
      navigation.goBack();
    } catch (e: any) {
      showAlert('Error', e?.data?.message ?? 'Failed to save changes');
    }
  };

  const initial = (firstName || me?.email || '?').charAt(0).toUpperCase();

  const handlePickPhoto = async () => {
    if (!userId || isUploadingPhoto) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('Permission needed', 'Allow photo library access to change your profile photo.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
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

    setIsUploadingPhoto(true);
    try {
      const { uploadUrl, publicUrl } = await getUploadUrl({ purpose: 'profile-picture', contentType }).unwrap();
      const fileBlob = await (await fetch(asset.uri)).blob();
      const putResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: fileBlob,
        headers: { 'Content-Type': contentType },
      });
      if (!putResponse.ok) throw new Error('Image upload to storage failed.');

      await updateParticipant({ id: userId, body: { profileImageUrl: publicUrl } }).unwrap();
    } catch (e: any) {
      showAlert("Couldn't update photo", extractErrorMessage(e, 'Something went wrong. Please try again.'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Edit Profile" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}>
        <TouchableOpacity style={styles.avatarSection} onPress={handlePickPhoto} disabled={isUploadingPhoto}>
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

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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

import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useUpdateParticipantMutation } from '../store/services/userApi';
import { useGetUploadUrlMutation, ALLOWED_UPLOAD_CONTENT_TYPES, UploadContentType } from '../store/services/eventsApi';
import { showAlert } from '../utils/crossPlatformAlert';
import { extractErrorMessage } from '../utils/apiError';

// Shared by EditProfileScreen (Settings) and CompleteProfileScreen (first-time setup) —
// picks a photo, uploads it via the signed-URL flow, and saves it to the participant
// record. Callers just read `me.profilePictureUrl` afterward (updateParticipant
// invalidates the 'Me' cache tag, so it refetches on its own).
export function useProfilePictureUpload(userId: string | undefined) {
  const [updateParticipant] = useUpdateParticipantMutation();
  const [getUploadUrl] = useGetUploadUrlMutation();
  const [isUploading, setIsUploading] = useState(false);

  const pickAndUploadPhoto = async () => {
    if (!userId || isUploading) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('Permission needed', 'Allow photo library access to set your profile photo.');
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

    setIsUploading(true);
    try {
      // Signed-URL round trip and the local file read are independent; only the PUT needs
      // both, so they overlap instead of queueing.
      const [{ uploadUrl, publicUrl }, fileBlob] = await Promise.all([
        getUploadUrl({ purpose: 'profile-picture', contentType }).unwrap(),
        fetch(asset.uri).then((r) => r.blob()),
      ]);
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
      setIsUploading(false);
    }
  };

  return { isUploading, pickAndUploadPhoto };
}

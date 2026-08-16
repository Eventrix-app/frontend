import React, { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useUpdateParticipantMutation, useGetMeQuery } from '../store/services/userApi';
import { useGetUploadUrlMutation, ALLOWED_UPLOAD_CONTENT_TYPES, UploadContentType } from '../store/services/eventsApi';
import { showAlert } from '../utils/crossPlatformAlert';
import { extractErrorMessage } from '../utils/apiError';
import PhotoSourceSheet, { type PhotoSource } from '../components/common/PhotoSourceSheet';
import GoogleDrivePickerModal from '../components/common/GoogleDrivePickerModal';
import { fetchDriveImageBlob, type DriveImage } from '../services/googleDriveService';

const PICKER_OPTIONS = {
  allowsEditing: true,
  aspect: [1, 1] as [number, number],
  quality: 0.85,
};

function resolveContentType(mimeType: string | null | undefined): UploadContentType {
  return (ALLOWED_UPLOAD_CONTENT_TYPES.includes(mimeType as UploadContentType)
    ? mimeType
    : 'image/jpeg') as UploadContentType;
}

// Shared by EditProfileScreen (Settings) and CompleteProfileScreen (first-time setup) —
// picks a photo, uploads it via the signed-URL flow, and saves it to the participant
// record. Callers just read `me.profilePictureUrl` afterward (updateParticipant
// invalidates the 'Me' cache tag, so it refetches on its own).
//
// `pickAndUploadPhoto` no longer opens the photo library directly: it opens a source
// chooser, and the caller renders the returned `sourcePicker` element for it to appear in.
export function useProfilePictureUpload(userId: string | undefined) {
  const [updateParticipant] = useUpdateParticipantMutation();
  const [getUploadUrl] = useGetUploadUrlMutation();
  const { data: me } = useGetMeQuery();
  const [isUploading, setIsUploading] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDriveOpen, setIsDriveOpen] = useState(false);

  // Drive is only worth offering to an account that actually signed in with Google — the
  // scope prompt has nowhere to go otherwise.
  const canUseDrive = !!me?.authProviders?.includes('google');

  // Everything converges here regardless of where the bytes came from, so camera, library
  // and Drive share one upload path and one failure message.
  const uploadBlob = useCallback(
    async (blob: Blob, contentType: UploadContentType) => {
      if (!userId) return;
      setIsUploading(true);
      try {
        const { uploadUrl, publicUrl } = await getUploadUrl({ purpose: 'profile-picture', contentType }).unwrap();
        const putResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': contentType },
        });
        if (!putResponse.ok) throw new Error('Image upload to storage failed.');

        await updateParticipant({ id: userId, body: { profileImageUrl: publicUrl } }).unwrap();
      } catch (e: any) {
        showAlert("Couldn't update photo", extractErrorMessage(e, 'Something went wrong. Please try again.'));
      } finally {
        setIsUploading(false);
      }
    },
    [getUploadUrl, updateParticipant, userId],
  );

  const uploadPickerResult = useCallback(
    async (result: ImagePicker.ImagePickerResult) => {
      if (result.canceled || !result.assets.length) return;
      const asset = result.assets[0];
      if (!asset.uri) {
        showAlert('Selection failed', 'Could not read the selected image.');
        return;
      }
      const contentType = resolveContentType(asset.mimeType);
      setIsUploading(true);
      try {
        // Read the local file first so a failure here is reported as a read failure rather
        // than surfacing later as a confusing upload error.
        const blob = await fetch(asset.uri).then((r) => r.blob());
        setIsUploading(false);
        await uploadBlob(blob, contentType);
      } catch (e: any) {
        setIsUploading(false);
        showAlert('Selection failed', extractErrorMessage(e, 'Could not read the selected image.'));
      }
    },
    [uploadBlob],
  );

  const pickFromLibrary = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('Permission needed', 'Allow photo library access to set your profile photo.');
      return;
    }
    await uploadPickerResult(
      await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, ...PICKER_OPTIONS }),
    );
  }, [uploadPickerResult]);

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showAlert('Permission needed', 'Allow camera access to take a profile photo.');
      return;
    }
    await uploadPickerResult(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
  }, [uploadPickerResult]);

  const handleSelectDriveFile = useCallback(
    async (file: DriveImage) => {
      setIsDriveOpen(false);
      setIsUploading(true);
      try {
        const blob = await fetchDriveImageBlob(file.id);
        setIsUploading(false);
        await uploadBlob(blob, resolveContentType(file.mimeType));
      } catch (e: any) {
        setIsUploading(false);
        showAlert("Couldn't use that file", extractErrorMessage(e, 'Could not download the image from Google Drive.'));
      }
    },
    [uploadBlob],
  );

  const handleSelectSource = useCallback(
    (source: PhotoSource) => {
      // Closed before anything else opens: on both platforms a native picker presented while
      // a modal is still dismissing can be swallowed entirely.
      setIsSheetOpen(false);
      if (source === 'drive') {
        setIsDriveOpen(true);
        return;
      }
      // Deferred a tick for the same reason — the sheet's close animation owns the screen
      // until it finishes.
      setTimeout(() => {
        if (source === 'camera') void takePhoto();
        else void pickFromLibrary();
      }, 250);
    },
    [pickFromLibrary, takePhoto],
  );

  const pickAndUploadPhoto = useCallback(() => {
    if (!userId || isUploading) return;
    setIsSheetOpen(true);
  }, [isUploading, userId]);

  // Returned as an element rather than expecting every caller to wire three pieces of state
  // and two modals: the call sites are avatar buttons, and they should stay that simple.
  const sourcePicker = React.createElement(
    React.Fragment,
    null,
    React.createElement(PhotoSourceSheet, {
      key: 'source',
      visible: isSheetOpen,
      onClose: () => setIsSheetOpen(false),
      onSelect: handleSelectSource,
      showDrive: canUseDrive,
    }),
    React.createElement(GoogleDrivePickerModal, {
      key: 'drive',
      visible: isDriveOpen,
      onClose: () => setIsDriveOpen(false),
      onSelect: handleSelectDriveFile,
    }),
  );

  return { isUploading, pickAndUploadPhoto, sourcePicker };
}

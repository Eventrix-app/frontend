import { AppDispatch } from '../store';
import { userApi } from '../store/services/userApi';
import { markSynced, resetDraft, OnboardingDraftState } from '../store/slices/onboardingDraftSlice';

/**
 * Syncs the locally-cached onboarding draft (interests/location/notification prefs) to
 * the backend after auth. The backend routes (PUT /users/me/interests, PATCH
 * /users/me/location, PATCH /users/me/notification-preferences) exist and are covered in
 * testing.md Phase 3 — this was previously left disabled behind a stale "not implemented
 * yet" TODO, so onboarding data was captured in the UI but never actually reached the
 * server.
 */
export async function syncOnboardingDraft(
  dispatch: AppDispatch,
  getState: () => { onboardingDraft: OnboardingDraftState },
): Promise<void> {
  const draft = getState().onboardingDraft;

  if (draft.isSynced) return;

  const promises: Promise<unknown>[] = [];

  if (draft.categoryIds.length > 0) {
    promises.push(
      dispatch(
        userApi.endpoints.updateInterests.initiate({ categoryIds: draft.categoryIds }),
      ).unwrap(),
    );
  }

  if (draft.latitude !== null && draft.longitude !== null) {
    promises.push(
      dispatch(
        userApi.endpoints.updateLocation.initiate({
          latitude: draft.latitude,
          longitude: draft.longitude,
        }),
      ).unwrap(),
    );
  }

  if (draft.notificationPrefs !== null) {
    promises.push(
      dispatch(
        userApi.endpoints.updateNotificationPreferences.initiate(draft.notificationPrefs),
      ).unwrap(),
    );
  }

  if (promises.length === 0) {
    dispatch(markSynced());
    dispatch(resetDraft());
    return;
  }

  const results = await Promise.allSettled(promises);
  const allOk = results.every((r) => r.status === 'fulfilled');

  if (allOk) {
    dispatch(markSynced());
    dispatch(resetDraft());
  } else {
    console.warn(
      '[syncOnboardingDraft] Partial failure — will retry on next foreground',
      results.filter((r) => r.status === 'rejected'),
    );
  }
}
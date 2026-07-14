import { AppDispatch, RootState } from '../store';
import { userApi } from '../store/services/userApi';
import { markSynced, resetDraft } from '../store/slices/onboardingDraftSlice';

/**
 * Syncs the locally-cached onboarding draft to the backend after auth.
 *
 * TODO: backend /api/users/me/* routes not implemented yet.
 * Temporarily disabled to stop console spam / retry loop.
 * Re-enable by uncommenting the block below once the backend routes exist.
 */
export async function syncOnboardingDraft(
  dispatch: AppDispatch,
  getState: () => RootState,
): Promise<void> {
  return;

  /*
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
  */
}
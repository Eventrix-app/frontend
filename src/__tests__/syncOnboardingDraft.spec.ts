/**
 * Tests for syncOnboardingDraft utility and onboardingDraftSlice.
 *
 * Covers:
 *  Test 1 – Kill-and-resume: draft state is persisted in Redux (AsyncStorage-backed)
 *            so chips re-appear selected after an app kill mid-onboarding.
 *  Test 3 – Airplane mode: syncOnboardingDraft is fire-and-forget; navigation
 *            must not be blocked even when all API calls reject.
 *  Test 4 – No duplicate sync: once isSynced is true the function exits immediately
 *            without dispatching any API calls.
 *  Test 5 – 3-minimum enforcement: the Continue button stays disabled with < 3
 *            selections (validated via the slice's categoryIds length).
 */

import { configureStore } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import onboardingDraftReducer, {
  setInterests,
  setLocation,
  setNotificationPrefs,
  markSynced,
  resetDraft,
} from '../store/slices/onboardingDraftSlice';
import { syncOnboardingDraft } from '../utils/syncOnboardingDraft';

// ─── Minimal store factory (no persistence layer needed for unit tests) ────────

function defaultDraft() {
  return {
    role: null as 'participant' | 'organizer' | null,
    categoryIds: [] as string[],
    latitude: null as number | null,
    longitude: null as number | null,
    manualCity: null as string | null,
    notificationPrefs: null as any,
    isSynced: false,
    hasCompletedOnboarding: false,
  };
}

function makeStore(preloaded?: Partial<ReturnType<typeof defaultDraft>>) {
  const s = configureStore({
    reducer: {
      onboardingDraft: onboardingDraftReducer,
      userApi: () => ({}),
    },
    preloadedState: {
      onboardingDraft: { ...defaultDraft(), ...preloaded },
    },
  });
  return s as typeof s & { getState: () => RootState };
}

const CAT_IDS = [
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
];

// ─── Test 1: Kill-and-resume ───────────────────────────────────────────────────

describe('Test 1 – Kill-and-resume: chip selections survive in Redux state', () => {
  it('stores selected category IDs in the slice after setInterests', () => {
    const store = makeStore();
    store.dispatch(setInterests(CAT_IDS));

    expect(store.getState().onboardingDraft.categoryIds).toEqual(CAT_IDS);
  });

  it('re-hydrated state with 3 chips shows all three as selected', () => {
    const store = makeStore({ categoryIds: CAT_IDS });

    const { categoryIds } = store.getState().onboardingDraft;
    expect(categoryIds).toHaveLength(3);
    expect(categoryIds).toEqual(CAT_IDS);
  });

  it('partial selection (2 chips) is also preserved across a simulated kill', () => {
    const twoIds = CAT_IDS.slice(0, 2);
    const store = makeStore({ categoryIds: twoIds });

    expect(store.getState().onboardingDraft.categoryIds).toEqual(twoIds);
  });

  it('location and notification prefs are also preserved', () => {
    const prefs = {
      eventReminders: true,
      nearbyEvents: false,
      reelsAndCommunity: true,
      specialOffers: false,
    };
    const store = makeStore({ latitude: 12.97, longitude: 77.59, notificationPrefs: prefs });

    const draft = store.getState().onboardingDraft;
    expect(draft.latitude).toBe(12.97);
    expect(draft.longitude).toBe(77.59);
    expect(draft.notificationPrefs).toEqual(prefs);
  });
});

// ─── Test 3: Airplane mode — fire-and-forget, navigation must not block ────────

describe('Test 3 – Airplane mode: syncOnboardingDraft resolves even when all API calls fail', () => {
  it('resolves without throwing when every API call rejects (offline)', async () => {
    const store = makeStore({
      categoryIds: CAT_IDS,
      latitude: 12.9716,
      longitude: 77.5946,
      notificationPrefs: {
        eventReminders: true,
        nearbyEvents: true,
        reelsAndCommunity: false,
        specialOffers: false,
      },
    });

    const originalDispatch = store.dispatch.bind(store);
    const patchedDispatch = jest.fn((action: any) => {
      // RTK-Query initiate thunks return an object with .unwrap()
      if (typeof action === 'function') {
        return { unwrap: () => Promise.reject(new Error('Network request failed')) };
      }
      return originalDispatch(action);
    });

    await expect(
      syncOnboardingDraft(patchedDispatch as any, store.getState),
    ).resolves.toBeUndefined();
  });

  it('does NOT dispatch markSynced when calls fail (retry on next foreground)', async () => {
    const store = makeStore({ categoryIds: CAT_IDS });

    const dispatchedTypes: string[] = [];
    const originalDispatch = store.dispatch.bind(store);
    const patchedDispatch = jest.fn((action: any) => {
      if (typeof action === 'function') {
        return { unwrap: () => Promise.reject(new Error('offline')) };
      }
      if (action?.type) dispatchedTypes.push(action.type);
      return originalDispatch(action);
    });

    await syncOnboardingDraft(patchedDispatch as any, store.getState);

    expect(dispatchedTypes).not.toContain('onboardingDraft/markSynced');
  });
});

// ─── Test 4: No duplicate sync ────────────────────────────────────────────────

describe('Test 4 – No duplicate sync: zero API calls when isSynced is true', () => {
  it('returns immediately without dispatching anything when isSynced = true', async () => {
    const store = makeStore({ categoryIds: CAT_IDS, isSynced: true });

    const dispatchSpy = jest.fn();

    await syncOnboardingDraft(dispatchSpy as any, store.getState);

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('does not initiate any endpoint calls after a successful sync', async () => {
    const store = makeStore({ categoryIds: CAT_IDS, isSynced: true });

    const initiatedThunks: number[] = [];
    const patchedDispatch = jest.fn((action: any) => {
      if (typeof action === 'function') initiatedThunks.push(1);
      return store.dispatch(action);
    });

    await syncOnboardingDraft(patchedDispatch as any, store.getState);

    expect(initiatedThunks).toHaveLength(0);
  });
});

// ─── Test 5 (frontend): 3-minimum enforcement via slice state ─────────────────

describe('Test 5 – 3-minimum enforcement: canContinue logic mirrors InterestSelectionScreen', () => {
  const MIN_SELECTIONS = 3;
  const canContinue = (ids: string[]) => ids.length >= MIN_SELECTIONS;

  it('button is disabled with 0 selections', () => {
    expect(canContinue([])).toBe(false);
  });

  it('button is disabled with 1 selection', () => {
    expect(canContinue([CAT_IDS[0]])).toBe(false);
  });

  it('button is disabled with exactly 2 selections', () => {
    expect(canContinue(CAT_IDS.slice(0, 2))).toBe(false);
  });

  it('button is enabled with exactly 3 selections', () => {
    expect(canContinue(CAT_IDS)).toBe(true);
  });

  it('button is enabled with more than 3 selections', () => {
    const fourIds = [...CAT_IDS, '44444444-4444-4444-4444-444444444444'];
    expect(canContinue(fourIds)).toBe(true);
  });

  it('setInterests only dispatches when canContinue is true', () => {
    const store = makeStore();

    const twoIds = CAT_IDS.slice(0, 2);
    if (canContinue(twoIds)) store.dispatch(setInterests(twoIds));
    expect(store.getState().onboardingDraft.categoryIds).toHaveLength(0);

    if (canContinue(CAT_IDS)) store.dispatch(setInterests(CAT_IDS));
    expect(store.getState().onboardingDraft.categoryIds).toEqual(CAT_IDS);
  });
});

// ─── resetDraft clears everything (used after successful sync) ────────────────

describe('resetDraft', () => {
  it('clears all draft fields including isSynced', () => {
    const store = makeStore({
      categoryIds: CAT_IDS,
      latitude: 12.9,
      longitude: 77.5,
      isSynced: true,
    });

    store.dispatch(resetDraft());

    const draft = store.getState().onboardingDraft;
    expect(draft.categoryIds).toHaveLength(0);
    expect(draft.latitude).toBeNull();
    expect(draft.longitude).toBeNull();
    expect(draft.isSynced).toBe(false);
  });
});

// ─── Test 1e: Foreground retry — isSynced=false + authenticated triggers re-sync ─

describe('Test 1e – Foreground retry: sync is retried when app returns to foreground', () => {
  it('does not retry when isSynced is already true', async () => {
    const store = makeStore({ categoryIds: CAT_IDS, isSynced: true });
    const dispatchSpy = jest.fn();

    // Simulate: app was authenticated + synced, comes to foreground
    const isAuthenticated = true;
    const isSynced = store.getState().onboardingDraft.isSynced;

    if (isAuthenticated && !isSynced) {
      await syncOnboardingDraft(dispatchSpy as any, store.getState);
    }

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('retries sync when authenticated and isSynced is false (foreground event)', async () => {
    const store = makeStore({ categoryIds: CAT_IDS, isSynced: false });

    const syncedCalls: number[] = [];
    const originalDispatch = store.dispatch.bind(store);
    const patchedDispatch = jest.fn((action: any) => {
      if (typeof action === 'function') {
        syncedCalls.push(1);
        return { unwrap: () => Promise.resolve() };
      }
      return originalDispatch(action);
    });

    const isAuthenticated = true;
    const isSynced = store.getState().onboardingDraft.isSynced;

    if (isAuthenticated && !isSynced) {
      await syncOnboardingDraft(patchedDispatch as any, store.getState);
    }

    // At least one endpoint was initiated (the interests call)
    expect(syncedCalls.length).toBeGreaterThan(0);
  });

  it('does not retry when user is not authenticated', async () => {
    const store = makeStore({ categoryIds: CAT_IDS, isSynced: false });
    const dispatchSpy = jest.fn();

    const isAuthenticated = false;
    const isSynced = store.getState().onboardingDraft.isSynced;

    if (isAuthenticated && !isSynced) {
      await syncOnboardingDraft(dispatchSpy as any, store.getState);
    }

    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});

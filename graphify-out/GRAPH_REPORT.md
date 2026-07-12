# Graph Report - .  (2026-07-09)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 533 nodes · 1064 edges · 33 communities (29 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c3d72748`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GlassSurface.tsx
- spacing
- colors
- RootNavigator.tsx
- mockEvents.ts
- dependencies
- expo
- devDependencies
- index.ts
- CreateEventScreen.tsx
- NotificationPreferencesScreen.tsx
- compilerOptions
- OnboardingScreen.tsx
- package.json
- package.json
- package.json
- authApi.ts
- supabase.ts
- LocationAccessScreen.tsx
- HomeScreen.tsx
- userApi.ts
- MainNavigator.tsx
- InterestSelectionScreen.tsx
- eventsSlice.ts
- uiSlice.ts
- async-storage.ts
- {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGetCurrentUserQuery,
}
- {
  useGetEventsQuery,
  useGetEventByIdQuery,
  useGetMyEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useEnrollEventMutation,
  useGetUploadUrlMutation,
  useGetEventEnrollmentsQuery,
  useCheckInMutation,
  useGetEnrollmentByIdQuery,
}
- {
  useGetCategoriesQuery,
  useUpdateInterestsMutation,
  useUpdateLocationMutation,
  useUpdateNotificationPreferencesMutation,
}

## God Nodes (most connected - your core abstractions)
1. `colors` - 48 edges
2. `spacing` - 45 edges
3. `borderRadius` - 24 edges
4. `GlassSurface()` - 23 edges
5. `RootStackParamList` - 21 edges
6. `expo` - 15 edges
7. `compilerOptions` - 14 edges
8. `RootState` - 13 edges
9. `syncOnboardingDraft()` - 12 edges
10. `AppDispatch` - 11 edges

## Surprising Connections (you probably didn't know these)
- `AppStateSync()` --calls--> `syncOnboardingDraft()`  [EXTRACTED]
  App.tsx → src/utils/syncOnboardingDraft.ts
- `LoginScreen()` --calls--> `syncOnboardingDraft()`  [EXTRACTED]
  src/Pages/authenticationscreens/LoginScreen.tsx → src/utils/syncOnboardingDraft.ts
- `RegisterScreen()` --calls--> `syncOnboardingDraft()`  [EXTRACTED]
  src/Pages/authenticationscreens/RegisterScreen.tsx → src/utils/syncOnboardingDraft.ts
- `HomeScreen()` --calls--> `syncOnboardingDraft()`  [EXTRACTED]
  src/Pages/homescreen/HomeScreen.tsx → src/utils/syncOnboardingDraft.ts
- `CheckoutScreen()` --references--> `MOCK_EVENTS`  [EXTRACTED]
  src/Pages/main/CheckoutScreen.tsx → src/data/mockEvents.ts

## Import Cycles
- 3-file cycle: `src/store/index.ts -> src/store/services/authApi.ts -> src/store/services/baseQuery.ts -> src/store/index.ts`
- 3-file cycle: `src/store/index.ts -> src/store/services/eventsApi.ts -> src/store/services/baseQuery.ts -> src/store/index.ts`
- 3-file cycle: `src/store/index.ts -> src/store/services/userApi.ts -> src/store/services/baseQuery.ts -> src/store/index.ts`
- 4-file cycle: `src/store/index.ts -> src/store/slices/authSlice.ts -> src/store/services/authApi.ts -> src/store/services/baseQuery.ts -> src/store/index.ts`

## Communities (33 total, 4 thin omitted)

### Community 0 - "GlassSurface.tsx"
Cohesion: 0.06
Nodes (32): SocialLoginRowProps, styles, CardProps, styles, styles, GlassSurface(), GlassSurfaceProps, InputProps (+24 more)

### Community 1 - "spacing"
Cohesion: 0.08
Nodes (33): AuthActions(), AuthActionsProps, OutlineButtonRow(), OutlineButtonRowProps, styles, AuthInput(), AuthInputProps, styles (+25 more)

### Community 2 - "colors"
Cohesion: 0.06
Nodes (30): ButtonProps, styles, IconProps, LeftArrow(), RightArrow(), Text(), TextProps, Category (+22 more)

### Community 3 - "RootNavigator.tsx"
Cohesion: 0.06
Nodes (31): ScreenHeader(), ScreenHeaderProps, styles, MOCK_NOTIFICATIONS, MOCK_USER, useForegroundSyncRetry(), RootNavigator(), Stack (+23 more)

### Community 4 - "mockEvents.ts"
Cohesion: 0.07
Nodes (31): MainEventCard(), MainEventCardProps, styles, BookingStatus, MOCK_BOOKINGS, MOCK_EVENTS, MOCK_RECENT_SEARCHES, MOCK_SAVED_EVENT_IDS (+23 more)

### Community 5 - "dependencies"
Cohesion: 0.06
Nodes (31): dependencies, expo, expo-blur, expo-dev-client, expo-image, expo-linear-gradient, expo-location, expo-status-bar (+23 more)

### Community 6 - "expo"
Cohesion: 0.07
Nodes (28): backgroundColor, foregroundImage, adaptiveIcon, edgeToEdgeEnabled, package, predictiveBackGestureEnabled, projectId, expo (+20 more)

### Community 7 - "devDependencies"
Cohesion: 0.09
Nodes (21): devDependencies, eslint, eslint-config-prettier, eslint-plugin-prettier, jest, prettier, ts-jest, @types/jest (+13 more)

### Community 8 - "index.ts"
Cohesion: 0.21
Nodes (9): App(), AppStateSync(), AppDispatch, onboardingDraftPersistConfig, persistor, rootReducer, RootState, store (+1 more)

### Community 9 - "CreateEventScreen.tsx"
Cohesion: 0.12
Nodes (12): supabase, Mode, Props, styles, Props, REFUND_OPTIONS, styles, BackendEvent (+4 more)

### Community 10 - "NotificationPreferencesScreen.tsx"
Cohesion: 0.13
Nodes (13): AnimatedToggle(), Props, styles, CheckBadge(), Props, styles, { height }, ITEMS (+5 more)

### Community 11 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module (+8 more)

### Community 12 - "OnboardingScreen.tsx"
Cohesion: 0.14
Nodes (9): Dots(), styles, easeOut, GRADIENT_HEIGHT, OnboardingScreenProps, Slide, slides, styles (+1 more)

### Community 13 - "package.json"
Cohesion: 0.14
Nodes (13): author, description, devDependencies, parcel, postcss, tailwindcss, @tailwindcss/postcss, license (+5 more)

### Community 14 - "package.json"
Cohesion: 0.14
Nodes (13): author, description, devDependencies, parcel, postcss, tailwindcss, @tailwindcss/postcss, license (+5 more)

### Community 15 - "package.json"
Cohesion: 0.14
Nodes (13): author, description, devDependencies, parcel, postcss, tailwindcss, @tailwindcss/postcss, license (+5 more)

### Community 16 - "authApi.ts"
Cohesion: 0.20
Nodes (9): authApi, AuthResponse, LoginCredentials, RegisterCredentials, User, authSlice, AuthState, initialState (+1 more)

### Community 17 - "supabase.ts"
Cohesion: 0.18
Nodes (10): CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, Json, Tables (+2 more)

### Community 18 - "LocationAccessScreen.tsx"
Cohesion: 0.20
Nodes (7): PrimaryButton(), { height }, styles, initialState, NotificationPrefs, onboardingDraftSlice, OnboardingDraftState

### Community 19 - "HomeScreen.tsx"
Cohesion: 0.24
Nodes (8): RegisterScreen(), HomeScreen(), TODO: replace with real unread count from notification context/API, styles, CAT_IDS, defaultDraft(), makeStore(), syncOnboardingDraft()

### Community 20 - "userApi.ts"
Cohesion: 0.28
Nodes (7): createFallbackBaseQuery(), makeQuery(), URLS, Category, UpdateInterestsBody, UpdateLocationBody, UpdateNotificationPrefsBody

### Community 21 - "MainNavigator.tsx"
Cohesion: 0.29
Nodes (5): EventrixTabBar(), styles, TABS, Tab, MainTabParamList

### Community 22 - "InterestSelectionScreen.tsx"
Cohesion: 0.50
Nodes (4): buildSkeletonIds(), InterestSelectionScreen(), styles, { width: screenWidth }

### Community 23 - "eventsSlice.ts"
Cohesion: 0.40
Nodes (4): Event, eventsSlice, EventsState, initialState

### Community 24 - "uiSlice.ts"
Cohesion: 0.50
Nodes (3): initialState, uiSlice, UIState

## Knowledge Gaps
- **303 isolated node(s):** `name`, `slug`, `version`, `orientation`, `sdkVersion` (+298 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `colors` connect `colors` to `GlassSurface.tsx`, `spacing`, `RootNavigator.tsx`, `mockEvents.ts`, `CreateEventScreen.tsx`, `NotificationPreferencesScreen.tsx`, `OnboardingScreen.tsx`, `LocationAccessScreen.tsx`, `HomeScreen.tsx`, `MainNavigator.tsx`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `spacing` connect `spacing` to `GlassSurface.tsx`, `colors`, `RootNavigator.tsx`, `mockEvents.ts`, `CreateEventScreen.tsx`, `NotificationPreferencesScreen.tsx`, `OnboardingScreen.tsx`, `LocationAccessScreen.tsx`, `HomeScreen.tsx`, `MainNavigator.tsx`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `GlassSurface()` connect `GlassSurface.tsx` to `spacing`, `colors`, `RootNavigator.tsx`, `mockEvents.ts`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _304 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GlassSurface.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05656565656565657 - nodes in this community are weakly interconnected._
- **Should `spacing` be split into smaller, more focused modules?**
  _Cohesion score 0.083710407239819 - nodes in this community are weakly interconnected._
- **Should `colors` be split into smaller, more focused modules?**
  _Cohesion score 0.061170212765957445 - nodes in this community are weakly interconnected._
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions, BarcodeType } from 'expo-camera';
import NetInfo from '@react-native-community/netinfo';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { useGetEventEnrollmentsQuery, useCheckInMutation, EnrollmentRecord } from '../../store/services/eventsApi';
import { cacheEnrollments, markCheckedInLocally } from '../../store/slices/checkInCacheSlice';
import { AppDispatch, RootState } from '../../store';
import { Text } from '../../components/common/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'CheckIn'>;

type Mode = 'scanner' | 'search';

// Hoisted to a stable module-level constant — a fresh object literal passed to
// CameraView's barcodeScannerSettings on every render (e.g. from unrelated state changes
// like typing in the manual-code field) can make the native scanner reconfigure mid-session.
const BARCODE_SCANNER_SETTINGS: { barcodeTypes: BarcodeType[] } = { barcodeTypes: ['qr'] };

const CheckInScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { eventId } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const [mode, setMode] = useState<Mode>('scanner');
  const [manualCode, setManualCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [isOffline, setIsOffline] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);

  const { data: liveEnrollments = [], isLoading: loadingEnrollments } = useGetEventEnrollmentsQuery(eventId);
  const [checkIn, { isLoading: isCheckingIn }] = useCheckInMutation();
  const cached = useSelector((state: RootState) => state.checkInCache[eventId]);
  const pendingSync = cached?.pendingSync ?? [];

  // Cache every successful online fetch so the attendee list survives offline/killed-app
  // sessions, and overlay any not-yet-synced local check-ins on top of whichever list (live
  // or cached) is currently in play.
  useEffect(() => {
    if (liveEnrollments.length > 0) {
      dispatch(cacheEnrollments({ eventId, enrollments: liveEnrollments }));
    }
  }, [liveEnrollments, eventId, dispatch]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false || state.isInternetReachable === false);
    });
    return () => unsubscribe();
  }, []);

  // Ask immediately on first open rather than waiting for a tap — this is a scan-first
  // screen, so surfacing the OS permission prompt right away matches what an organizer
  // expects when they land here. `permission === null` means the status hasn't loaded yet;
  // undetermined (never granted or denied) is the only case worth auto-prompting for —
  // a previous explicit denial should keep showing the "Grant Camera Access" button
  // instead of nagging on every visit.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.status]);

  const baseEnrollments: EnrollmentRecord[] = liveEnrollments.length > 0 ? liveEnrollments : (cached?.enrollments ?? []);
  const enrollments: EnrollmentRecord[] = baseEnrollments.map((e) => {
    const pending = pendingSync.find((p) => p.enrollmentId === e.id);
    return pending ? { ...e, checkedInAt: pending.checkedInAt } : e;
  });

  const handleOfflineCheckIn = (ticketCode: string, enrollmentId?: string) => {
    const target = enrollments.find(
      (e) => e.ticketCode === ticketCode || (!!enrollmentId && e.id === enrollmentId),
    );
    if (!target) {
      Alert.alert(
        'Invalid Ticket',
        "This ticket isn't in the cached attendee list for this event. Reconnect once to refresh it.",
      );
      return;
    }
    if (target.checkedInAt) {
      Alert.alert('Already Checked In', 'This ticket was already used.');
      return;
    }
    dispatch(
      markCheckedInLocally({
        eventId,
        enrollmentId: target.id,
        ticketCode: target.ticketCode ?? ticketCode,
        checkedInAt: new Date().toISOString(),
      }),
    );
    Alert.alert('✓ Checked In (Offline)', "Saved locally — it'll sync once you're back online.");
    setManualCode('');
  };

  const handleCheckIn = async (ticketCode: string, enrollmentId?: string) => {
    const code = ticketCode.trim();
    if (!code) {
      Alert.alert('Error', 'Ticket code is required');
      return;
    }

    const netState = await NetInfo.fetch();
    const online = netState.isConnected !== false && netState.isInternetReachable !== false;
    if (!online) {
      handleOfflineCheckIn(code, enrollmentId);
      return;
    }

    try {
      await checkIn({ ticketCode: code }).unwrap();
      if (enrollmentId) {
        setCheckedInIds((prev) => new Set(prev).add(enrollmentId));
      }
      Alert.alert('✅ Checked In', 'Ticket successfully checked in.');
      setManualCode('');
    } catch (e: any) {
      // The device can drop signal between the NetInfo check above and this request
      // actually reaching the backend — fall back to the offline path instead of
      // surfacing a raw network error for what is still a connectivity problem.
      if (e?.status === 'FETCH_ERROR' || e?.status === 'TIMEOUT_ERROR') {
        handleOfflineCheckIn(code, enrollmentId);
        return;
      }
      const msg: string = e?.data?.message ?? 'Check-in failed';
      if (msg.toLowerCase().includes('already')) {
        Alert.alert('Already Checked In', 'This ticket was already used.');
      } else if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('expired')) {
        Alert.alert('Invalid Ticket', 'This ticket code is invalid or has been tampered with.');
      } else {
        Alert.alert('Error', msg);
      }
    }
  };

  const handleBarcodeScanned = (result: { data: string }) => {
    const code = result.data;
    const now = Date.now();
    if (lastScanRef.current && lastScanRef.current.code === code && now - lastScanRef.current.at < 2500) {
      return; // debounce repeat frames while the same code is still in view
    }
    lastScanRef.current = { code, at: now };
    handleCheckIn(code);
  };

  const confirmedEnrollments = enrollments.filter((e) => e.status === 'confirmed');
  const filtered = searchQuery.trim()
    ? confirmedEnrollments.filter((e) =>
        (e.user?.fullName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.user?.email ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : confirmedEnrollments;

  const renderEnrollmentRow = ({ item }: { item: EnrollmentRecord }) => {
    const alreadyIn = !!item.checkedInAt || checkedInIds.has(item.id);
    return (
      <View style={styles.row}>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName}>{item.user?.fullName ?? item.user?.email ?? item.userId}</Text>
          <Text style={styles.rowSub}>{item.bookingReference}</Text>
        </View>
        {alreadyIn ? (
          <View style={styles.checkedBadge}>
            <Text style={styles.checkedBadgeText}>✓ In</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.checkBtn}
            onPress={() => item.ticketCode && handleCheckIn(item.ticketCode, item.id)}
            disabled={isCheckingIn || !item.ticketCode}
          >
            <Text style={styles.checkBtnText}>Check In</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Check In</Text>
      </View>

      {(isOffline || pendingSync.length > 0) && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            {isOffline ? '📴 Offline — check-ins are being saved locally' : '🔄 Syncing queued check-ins…'}
            {pendingSync.length > 0 ? ` · ${pendingSync.length} pending` : ''}
          </Text>
        </View>
      )}

      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'scanner' && styles.modeTabActive]}
          onPress={() => setMode('scanner')}
        >
          <Text style={[styles.modeTabText, mode === 'scanner' && styles.modeTabTextActive]}>
            📷 QR / Code
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'search' && styles.modeTabActive]}
          onPress={() => setMode('search')}
        >
          <Text style={[styles.modeTabText, mode === 'search' && styles.modeTabTextActive]}>
            🔍 Search by Name
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'scanner' ? (
        <View style={styles.scannerSection}>
          {permission?.granted ? (
            <View style={styles.cameraWrap}>
              <CameraView
                style={styles.camera}
                barcodeScannerSettings={BARCODE_SCANNER_SETTINGS}
                onBarcodeScanned={isCheckingIn ? undefined : handleBarcodeScanned}
              />
            </View>
          ) : (
            <View style={styles.scannerPlaceholder}>
              <Text style={styles.scannerPlaceholderText}>📷</Text>
              <Text style={styles.scannerPlaceholderSub}>
                {permission === null
                  ? 'Checking camera permission…'
                  : 'Camera access is needed to scan QR codes.\nEnter ticket code manually below.'}
              </Text>
              {permission && !permission.granted && (
                <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                  <Text style={styles.permissionBtnText}>Grant Camera Access</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <Text style={styles.label}>Ticket Code</Text>
          <TextInput
            style={styles.input}
            value={manualCode}
            onChangeText={setManualCode}
            placeholder="Paste or type ticket code"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.submitBtn, (!manualCode.trim() || isCheckingIn) && styles.submitBtnDisabled]}
            onPress={() => handleCheckIn(manualCode)}
            disabled={!manualCode.trim() || isCheckingIn}
          >
            {isCheckingIn ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitBtnText}>Check In</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.searchSection}>
          <TextInput
            style={styles.input}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name or email"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
          />
          {loadingEnrollments && enrollments.length === 0 ? (
            <ActivityIndicator style={styles.loader} color={colors.brandPink} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              renderItem={renderEnrollmentRow}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No matching attendees.' : 'No confirmed enrollments.'}
                </Text>
              }
              contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutralBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 22, color: colors.text },
  title: { fontSize: 20, color: colors.text,
      fontFamily: 'ZalandoSansExpanded_700Bold'
},
  offlineBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: '#FEF3C7',
  },
  offlineBannerText: { fontSize: 12, fontWeight: '600', color: '#92400E', textAlign: 'center' },
  modeTabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(0,0,0,0.06)',
    padding: 4,
  },
  modeTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: borderRadius.sm },
  modeTabActive: { backgroundColor: colors.white },
  modeTabText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  modeTabTextActive: { color: colors.brandPink, fontWeight: '700' },
  scannerSection: { flex: 1, paddingHorizontal: spacing.md },
  cameraWrap: {
    height: 260,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  camera: { flex: 1 },
  scannerPlaceholder: {
    height: 200,
    backgroundColor: '#1a1a2e',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  scannerPlaceholderText: { fontSize: 48 },
  scannerPlaceholderSub: { color: '#aaa', fontSize: 13, textAlign: 'center', paddingHorizontal: spacing.lg },
  permissionBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  permissionBtnText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.md,
  },
  submitBtn: {
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#9CA3AF' },
  submitBtnText: { color: colors.white, fontWeight: '600', fontSize: 15 },
  searchSection: { flex: 1, paddingHorizontal: spacing.md },
  loader: { marginTop: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  checkBtn: {
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  checkBtnText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  checkedBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  checkedBadgeText: { color: '#065F46', fontWeight: '700', fontSize: 13 },
  emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl },
});

export default CheckInScreen;

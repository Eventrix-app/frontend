import React, { useState } from 'react';
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
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { useGetEventEnrollmentsQuery, useCheckInMutation, EnrollmentRecord } from '../../store/services/eventsApi';
import { Text } from '../../components/common/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'CheckIn'>;

type Mode = 'scanner' | 'search';

const CheckInScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { eventId } = route.params;
  const [mode, setMode] = useState<Mode>('scanner');
  const [manualCode, setManualCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());

  const { data: enrollments = [], isLoading: loadingEnrollments } = useGetEventEnrollmentsQuery(eventId);
  const [checkIn, { isLoading: isCheckingIn }] = useCheckInMutation();

  const handleCheckIn = async (ticketCode: string, enrollmentId?: string) => {
    if (!ticketCode.trim()) {
      Alert.alert('Error', 'Ticket code is required');
      return;
    }
    try {
      await checkIn({ ticketCode: ticketCode.trim() }).unwrap();
      if (enrollmentId) {
        setCheckedInIds((prev) => new Set(prev).add(enrollmentId));
      }
      Alert.alert('✅ Checked In', 'Ticket successfully checked in.');
      setManualCode('');
    } catch (e: any) {
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
          {/* expo-camera / expo-barcode-scanner not yet installed; manual code entry as fallback */}
          {/* TODO: replace TextInput with CameraView barcode scanner once expo-camera is added */}
          <View style={styles.scannerPlaceholder}>
            <Text style={styles.scannerPlaceholderText}>📷</Text>
            <Text style={styles.scannerPlaceholderSub}>
              Camera scanner requires expo-camera.{'\n'}Enter ticket code manually below.
            </Text>
          </View>
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
          {loadingEnrollments ? (
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
  scannerPlaceholder: {
    height: 200,
    backgroundColor: '#1a1a2e',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  scannerPlaceholderText: { fontSize: 48 },
  scannerPlaceholderSub: { color: '#aaa', fontSize: 13, textAlign: 'center', paddingHorizontal: spacing.lg },
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

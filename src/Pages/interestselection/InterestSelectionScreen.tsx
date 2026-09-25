import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useGetCategoriesQuery } from '../../store/services/userApi';
import { setInterests } from '../../store/slices/onboardingDraftSlice';
import { AppDispatch, RootState } from '../../store';
import { useSelector } from 'react-redux';
import { Text } from '../../components/common/Text';
import { LeftArrow } from '../../components/common/Icons';
// This screen is intentionally light-only (like the rest of the onboarding flow), so it
// reads the light palette directly rather than useTheme() — but reads it through the token
// object instead of repeating raw hex, so a future palette change doesn't require re-editing
// every literal here again.
import { colorsLight } from '../../theme/colors.light';

const { width: screenWidth } = Dimensions.get('window');
const MIN_SELECTIONS = 3;

const buildSkeletonIds = () => ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

type InterestSelectionScreenProps = {
  mode?: 'onboarding' | 'sheet';
  onComplete?: () => void;
  onDismiss?: () => void;
};

const InterestSelectionScreen: React.FC<InterestSelectionScreenProps> = ({
  mode = 'onboarding',
  onComplete,
  onDismiss,
}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const persistedSelections = useSelector((state: RootState) => state.onboardingDraft.categoryIds);
  const [selectedIds, setSelectedIds] = useState<string[]>(persistedSelections);

  const { data: categories, isLoading, isError, refetch } = useGetCategoriesQuery();

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleContinue = () => {
    if (selectedIds.length < MIN_SELECTIONS) return;
    dispatch(setInterests(selectedIds));
    if (mode === 'sheet') {
      onComplete?.();
      return;
    }
    navigation.navigate('LocationAccess' as never);
  };

  const canContinue = selectedIds.length >= MIN_SELECTIONS;
  const skeletonIds = useMemo(() => buildSkeletonIds(), []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>Choose your interests</Text>
        <Text style={styles.subtitle}>
          Select at least {MIN_SELECTIONS} to get better event recommendations.
        </Text>

        {isLoading && (
          <View style={styles.skeletonGrid}>
            {skeletonIds.map((id) => (
              <View key={id} style={styles.skeletonChip} />
            ))}
          </View>
        )}

        {isError && (
          <View style={styles.center}>
            <Text style={styles.errorText}>Failed to load categories.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && !isError && categories && categories.length > 0 && (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          >
            {categories.map((cat) => {
              const selected = selectedIds.includes(cat.id);
              return (
                <Pressable
                  key={cat.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => toggle(cat.id)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {!isLoading && !isError && categories && categories.length === 0 && (
          <View style={styles.center}>
            <Text style={styles.errorText}>No categories are available right now.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!canContinue && (
          <Text style={styles.hintText}>
            Pick at least {MIN_SELECTIONS} to continue
          </Text>
        )}

        <View style={styles.bottomActions}>
          <TouchableOpacity
            onPress={() => {
              if (mode === 'sheet') {
                onDismiss?.();
                return;
              }
              navigation.goBack();
            }}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <LeftArrow color={colorsLight.primary} size={18} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleContinue}
            style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
            disabled={!canContinue}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.continueButtonText,
                !canContinue && styles.continueButtonTextDisabled,
              ]}
            >
              Save and Continue
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.taglineText}>
          You can change this anytime from your profile
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colorsLight.background },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 60 },
  heading: {
    fontSize: 28,
    color: colorsLight.text,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
      fontFamily: 'ZalandoSansExpanded_700Bold'
},
  subtitle: {
    fontSize: 16,
    color: colorsLight.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
      fontFamily: 'ZalandoSansExpanded_700Bold'
},
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
    flex: 1,
    alignContent: 'center',
  },
  skeletonChip: {
    height: 40,
    minWidth: 86,
    borderRadius: 24,
    backgroundColor: colorsLight.muted,
  },
  errorText: { fontSize: 15, color: colorsLight.errorSoftText, textAlign: 'center' },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: colorsLight.primary,
  },
  retryBtnText: { color: colorsLight.white, fontWeight: '700', fontSize: 15 },
  scrollArea: { flex: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFC0CB',
    backgroundColor: colorsLight.background,
  },
  chipSelected: {
    borderColor: colorsLight.primary,
    backgroundColor: 'rgba(255,51,102,0.07)',
  },
  chipText: { fontSize: 14, fontWeight: '500', color: colorsLight.text },
  chipTextSelected: { color: colorsLight.primary, fontWeight: '600' },
  hintText: {
    fontSize: 13,
    color: colorsLight.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 20,
    paddingTop: 12,
  },
  backButton: {
    borderRadius: 12,
    backgroundColor: colorsLight.background,
    borderWidth: 2,
    borderColor: colorsLight.primary,
    width: 60,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButton: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: colorsLight.primary,
    width: screenWidth * 0.62,
    alignItems: 'center',
  },
  continueButtonDisabled: { backgroundColor: colorsLight.muted, borderColor: colorsLight.border },
  continueButtonText: { fontSize: 16, fontWeight: '600', color: colorsLight.white },
  continueButtonTextDisabled: { color: colorsLight.placeholder },
  taglineText: {
    fontSize: 13,
    color: colorsLight.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default InterestSelectionScreen;

import React, { useMemo } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { Text } from '../../components/common/Text';
import { HourglassIcon } from '../../components/common/Icons';

type Props = NativeStackScreenProps<RootStackParamList, 'VerificationSubmitted'>;

const VerificationSubmittedScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Verification Submitted" onBack={() => navigation.navigate('Main', { screen: 'Home' })} />
      <View style={styles.content}>
        <View style={styles.iconGlass}>
          <HourglassIcon color={colors.textSecondary} size={56} />
        </View>
        <Text style={styles.title}>Thanks for submitting!</Text>
        <Text style={styles.subtitle}>
          We've received your documents and an admin will review them soon. You'll be notified as soon as a
          decision is made — you can also check your verification status anytime from your profile.
        </Text>

        {/* Offered now rather than after approval: review and payout setup run independently,
            and an organizer approved without an account cannot be paid until they come back. */}
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.replace('PayoutBankAccount')}
          activeOpacity={0.9}
        >
          <Text style={styles.doneBtnText}>Add payout account</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.laterBtn}
          onPress={() => navigation.navigate('Main', { screen: 'Home' })}
          activeOpacity={0.7}
        >
          <Text style={styles.laterBtnText}>I'll do this later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutralBg },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  iconGlass: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
      },
    }),
  },
  title: {
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
    fontFamily: 'ZalandoSansExpanded_700Bold',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  doneBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.brandPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  laterBtn: {
    width: '100%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  laterBtnText: { color: colors.textSecondary, fontSize: 15, fontWeight: '500' },
});

export default VerificationSubmittedScreen;

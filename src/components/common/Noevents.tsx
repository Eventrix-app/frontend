import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface Props {
  onBack: () => void;
  onGoHome: () => void;
  title?: string;
  subtitle?: string;
}

const NoEvents: React.FC<Props> = ({
  onBack,
  onGoHome,
  title = 'No events found',
  subtitle = 'Try adjusting your filters or interests.',
}) => {
  return (
    <View style={styles.root}>
      <Image

        source={require('../../../assets/NoEvents.png')}
        style={styles.illustration}
        resizeMode="contain"
      />

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.85}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.homeBtn} onPress={onGoHome} activeOpacity={0.85}>
          <Text style={styles.homeText}>Go to Home</Text>
          <Text style={styles.homeIcon}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F3EF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  illustration: {
    width: 260,
    height: 260,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs ?? 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.brandPink,
    borderRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backIcon: {
    color: colors.brandPink,
    fontSize: 15,
    fontWeight: '700',
  },
  backText: {
    color: colors.brandPink,
    fontSize: 15,
    fontWeight: '700',
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brandPink,
    borderRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  homeText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  homeIcon: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default NoEvents;
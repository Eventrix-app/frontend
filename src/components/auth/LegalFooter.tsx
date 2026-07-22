import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { Text } from '../common/Text';

type LegalFooterProps = {
  compact?: boolean;
};

export const LegalFooter: React.FC<LegalFooterProps> = ({ compact = false }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Text style={styles.note}>By continuing, you agree to our</Text>
      <View style={styles.links}>
        {['Terms of use', 'Privacy Policy', 'Contact Us'].map((label, i) => (
          <React.Fragment key={label}>
            {i > 0 ? <Text style={styles.dot}>•</Text> : null}
            <Text style={styles.link}>{label}</Text>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginTop: 0,
    gap: spacing.s,
  },
  wrapCompact: {
    marginTop: spacing.xl,
    marginBottom: 0,
  },
  note: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.s,
  },
  link: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.brandPink,
    textDecorationLine: 'underline',
  },
  dot: {
    fontSize: 14,
    color: colors.textMuted,
  },
});

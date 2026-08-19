import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { Text } from '../common/Text';
import { RootStackParamList } from '../../navigation/types';
import { openLegalDocument } from '../../config/legalLinks';

type LegalFooterProps = {
  compact?: boolean;
};

// The legal documents open on the website instead of in-app, so only Contact Us still
// needs the navigator. Auth-stack screens (Register/Login/ForgotPassword/UpdatePassword)
// sit inside the "Auth" child navigator and HelpCenter is a RootStack screen, so that one
// goes through the parent — same pattern RegisterScreen uses for its post-register redirect.
const LINKS: { label: string; onPress: (root: NativeStackNavigationProp<RootStackParamList> | undefined) => void }[] = [
  { label: 'Terms of use', onPress: () => void openLegalDocument('terms') },
  { label: 'Privacy Policy', onPress: () => void openLegalDocument('privacy') },
  { label: 'Contact Us', onPress: (root) => root?.navigate('HelpCenter') },
];

export const LegalFooter: React.FC<LegalFooterProps> = ({ compact = false }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation();
  const root = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Text style={styles.note}>By continuing, you agree to our</Text>
      <View style={styles.links}>
        {LINKS.map(({ label, onPress }, i) => (
          <React.Fragment key={label}>
            {i > 0 ? <Text style={styles.dot}>•</Text> : null}
            <TouchableOpacity onPress={() => onPress(root)} hitSlop={6}>
              <Text style={styles.link}>{label}</Text>
            </TouchableOpacity>
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

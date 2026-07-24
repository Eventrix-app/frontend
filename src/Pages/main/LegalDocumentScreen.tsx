import React, { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { Text } from '../../components/common/Text';
import { RootStackParamList } from '../../navigation/types';
import { ColorPalette } from '../../theme/colors.light';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import {
  privacyPolicyDocument,
  termsAndConditionsDocument,
  refundCancellationDocument,
  cookiePolicyDocument,
  communityGuidelinesDocument,
  dataRetentionDocument,
  securityPolicyDocument,
  paymentPolicyDocument,
  accountDeletionDocument,
  contactGrievanceDocument,
  LegalDocument,
} from '../../content/legalDocuments';
import { LegalDocumentKey } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LegalDocument'>;

const DOCUMENTS: Record<LegalDocumentKey, LegalDocument> = {
  privacy: privacyPolicyDocument,
  terms: termsAndConditionsDocument,
  refund: refundCancellationDocument,
  cookies: cookiePolicyDocument,
  community: communityGuidelinesDocument,
  dataRetention: dataRetentionDocument,
  security: securityPolicyDocument,
  payment: paymentPolicyDocument,
  accountDeletion: accountDeletionDocument,
  grievance: contactGrievanceDocument,
};

const LegalDocumentScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const document = DOCUMENTS[route.params.doc];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title={document.title} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.dateLine}>Effective Date: {document.effectiveDate}</Text>
        <Text style={styles.dateLine}>Last Updated: {document.lastUpdated}</Text>

        <View style={styles.groupGlass}>
          <View style={styles.group}>
            {document.sections.map((section, index) => (
              <View key={section.heading} style={[styles.section, index === 0 && styles.sectionFirst]}>
                <Text style={styles.heading}>{section.heading}</Text>
                {section.blocks.map((block, blockIndex) =>
                  block.type === 'p' ? (
                    <Text key={blockIndex} style={styles.paragraph}>
                      {block.text}
                    </Text>
                  ) : (
                    <View key={blockIndex} style={styles.bulletList}>
                      {block.items.map((item, itemIndex) => (
                        <View key={itemIndex} style={styles.bulletRow}>
                          <Text style={styles.bulletDot}>•</Text>
                          <Text style={styles.bulletText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  ),
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: ColorPalette) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.neutralBg,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  dateLine: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  groupGlass: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.white,
    marginTop: spacing.md,
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
  group: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  section: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  sectionFirst: {
    borderTopWidth: 0,
  },
  heading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    fontFamily: 'ZalandoSansExpanded_600SemiBold',
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  bulletList: {
    marginBottom: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  bulletDot: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.brandPink,
    marginRight: spacing.xs,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});

export default LegalDocumentScreen;

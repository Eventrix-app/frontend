import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type SectionHeaderProps = {
  title: string;
};

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => (
  <View style={styles.row}>
    <Text style={styles.title}>{title}</Text>
    <View style={styles.line} />
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
});

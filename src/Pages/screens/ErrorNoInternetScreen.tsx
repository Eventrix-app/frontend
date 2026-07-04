import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';

type Props = NativeStackScreenProps<RootStackParamList, 'ErrorNoInternet'>;

const ErrorNoInternetScreen: React.FC<Props> = ({ navigation }) => (
  <View style={styles.root}>
    <Text style={styles.icon}>📡</Text>
    <Text style={styles.title}>No Internet Connection</Text>
    <Text style={styles.subtitle}>
      Please check your connection and try again. We'll reload your events when you're back online.
    </Text>
    <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
      <Text style={styles.btnText}>Try Again</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  icon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  btn: {
    backgroundColor: colors.brandPink,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  btnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorNoInternetScreen;

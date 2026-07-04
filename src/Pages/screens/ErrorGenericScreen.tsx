import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';

type Props = NativeStackScreenProps<RootStackParamList, 'ErrorGeneric'>;

const ErrorGenericScreen: React.FC<Props> = ({ navigation }) => (
  <View style={styles.root}>
    <Text style={styles.icon}>⚠️</Text>
    <Text style={styles.title}>Something Went Wrong</Text>
    <Text style={styles.subtitle}>
      We couldn't complete your request. Please try again in a moment.
    </Text>
    <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
      <Text style={styles.btnText}>Go Back</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Main')}>
      <Text style={styles.linkText}>Return to Home</Text>
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
    marginBottom: spacing.md,
  },
  btnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    padding: spacing.sm,
  },
  linkText: {
    color: colors.brandPink,
    fontSize: 15,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default ErrorGenericScreen;

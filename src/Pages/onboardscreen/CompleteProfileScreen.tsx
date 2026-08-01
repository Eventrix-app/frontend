import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from '../../components/common/Text';
import { RootState } from '../../store';
import { useGetMeQuery, useUpdateParticipantMutation } from '../../store/services/userApi';
import { useProfilePictureUpload } from '../../hooks/useProfilePictureUpload';

type Props = NativeStackScreenProps<AuthStackParamList, 'CompleteProfile'>;

const CompleteProfileScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const { data: me } = useGetMeQuery();
  const [updateParticipant, { isLoading: isSaving }] = useUpdateParticipantMutation();
  const { isUploading: isUploadingPhoto, pickAndUploadPhoto } = useProfilePictureUpload(userId);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isSubmittingRef = useRef(false);

  const hasPrefilledRef = useRef(false);
  useEffect(() => {
    if (!me || hasPrefilledRef.current) return;
    hasPrefilledRef.current = true;
    setFirstName(me.firstName ?? '');
    setLastName(me.lastName ?? '');
  }, [me]);

  const goToOnboarding = () => navigation.replace('Onboarding');

  const handleContinue = async () => {
    if (!userId || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      if (firstName.trim() && lastName.trim()) {
        await updateParticipant({ id: userId, body: { firstName, lastName } }).unwrap();
      }
    } finally {
      isSubmittingRef.current = false;
      goToOnboarding();
    }
  };

  const initial = (firstName || me?.email || '?').charAt(0).toUpperCase();

  return (
    <KeyboardAvoidingView style={[styles.root, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Complete your profile</Text>
        <Text style={styles.subtitle}>Add a photo and confirm your name so organizers and other attendees know who you are.</Text>

        <TouchableOpacity style={styles.avatarSection} onPress={pickAndUploadPhoto} disabled={isUploadingPhoto}>
          <View style={styles.avatar}>
            {isUploadingPhoto ? (
              <ActivityIndicator color={colors.brandPink} />
            ) : me?.profilePictureUrl ? (
              <Image source={{ uri: me.profilePictureUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarEmoji}>{initial}</Text>
            )}
          </View>
          <Text style={styles.changePhoto}>Add photo</Text>
        </TouchableOpacity>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>First Name</Text>
            <AuthInput value={firstName} onChangeText={setFirstName} placeholder="First name" />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Last Name</Text>
            <AuthInput value={lastName} onChangeText={setLastName} placeholder="Last name" />
          </View>
        </View>

        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.continueText}>Continue</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={goToOnboarding} disabled={isSaving}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  scroll: { padding: spacing.lg, flexGrow: 1, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  avatarSection: { alignItems: 'center', marginBottom: spacing.xl },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brandPink,
  },
  avatarEmoji: { fontSize: 36, fontWeight: '700', color: colors.brandPink },
  avatarImage: { width: '100%', height: '100%', borderRadius: 48 },
  changePhoto: { marginTop: spacing.sm, fontSize: 14, fontWeight: '600', color: colors.brandPink },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  continueBtn: {
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  continueText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  skipBtn: { alignItems: 'center', marginTop: spacing.md },
  skipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
});

export default CompleteProfileScreen;

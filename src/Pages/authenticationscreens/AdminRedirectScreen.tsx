import React, { useEffect } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { AuthLayout } from '../../components/auth/AuthLayout';
import GlassSurface from '../../components/common/GlassSurface';
import { RootStackParamList } from '../../navigation/types';
import { logout } from '../../store/slices/authSlice';
import { RootState } from '../../store';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminRedirect'>;

const AdminRedirectScreen: React.FC<Props> = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  
  const dashboardBaseUrl = process.env.EXPO_PUBLIC_ADMIN_DASHBOARD_URL || 'https://enevtrix1.vercel.app/admin';
  const dashboardUrl = `${dashboardBaseUrl}${dashboardBaseUrl.includes('?') ? '&' : '?'}loggedIn=true`;

  const handleRedirect = async () => {
    try {
      if (Platform.OS === 'web') {
        const win = typeof global !== 'undefined' ? (global as any).window : (globalThis as any).window;
        if (win) {
          win.location.href = dashboardUrl;
        }
      } else {
        const supported = await Linking.canOpenURL(dashboardUrl);
        if (supported) {
          await Linking.openURL(dashboardUrl);
        } else {
          console.warn(`Cannot open URL: ${dashboardUrl}`);
        }
      }
    } catch (error) {
      console.error('Error redirecting to admin dashboard:', error);
    }
  };

  useEffect(() => {
    // Smooth auto-redirect after a short delay for premium visual transition
    const timer = setTimeout(() => {
      handleRedirect();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <AuthLayout
      title={`Welcome back, ${user?.full_name || 'Admin'}`}
      subtitle="Administrative Access Authorized."
      centerTitle
      scrollable={false}
    >
      <View style={styles.container}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={colors.brandPink} style={styles.loader} />
          
          <Text style={styles.statusText}>
            Redirecting you to the Eventrix Admin Dashboard...
          </Text>
          
          <Text style={styles.infoText}>
            If you are not redirected automatically within a few seconds, please click the button below.
          </Text>

          <TouchableOpacity style={styles.primaryButtonWrap} onPress={handleRedirect} activeOpacity={0.9}>
            <GlassSurface style={styles.primaryButton} contentStyle={styles.primaryButtonContent}>
              <Text style={styles.primaryButtonText}>Open Dashboard Manually</Text>
            </GlassSurface>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButtonWrap} onPress={handleLogout} activeOpacity={0.8}>
            <View style={styles.logoutButton}>
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  loader: {
    marginBottom: spacing.lg,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brandNavy,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.4)',
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 18,
  },
  primaryButtonWrap: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.brandPink,
    height: 52,
  },
  primaryButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  logoutButtonWrap: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  logoutButton: {
    height: 48,
    borderWidth: 1.5,
    borderColor: 'rgba(244, 51, 98, 0.3)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: colors.brandPink,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AdminRedirectScreen;

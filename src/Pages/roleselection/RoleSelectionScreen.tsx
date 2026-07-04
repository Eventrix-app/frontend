import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const easeOut = Easing.out(Easing.bezier(0.25, 0.1, 0.25, 1));
const TRANS_MS = 700;

const LeftArrow = () => (
  <Svg width={22} height={22} viewBox="0 -960 960 960">
    <Path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z" fill="#FF3366" />
  </Svg>
);

const RoleSelectionScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedRole, setSelectedRole] = useState<'participant' | 'organizer' | null>(null);

  // Screen transition — slide up from below on enter, slide up out on back
  const screenTranslateY = useRef(new Animated.Value(80)).current;
  const screenOpacity    = useRef(new Animated.Value(0)).current;

  const participantScale          = useRef(new Animated.Value(1)).current;
  const organizerScale            = useRef(new Animated.Value(1)).current;
  const participantActiveOpacity  = useRef(new Animated.Value(0)).current;
  const organizerActiveOpacity    = useRef(new Animated.Value(0)).current;
  const buttonScale               = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenTranslateY, { toValue: 0,    duration: TRANS_MS, easing: easeOut, useNativeDriver: true }),
      Animated.timing(screenOpacity,    { toValue: 1,    duration: TRANS_MS, easing: easeOut, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleBackPress = () => {
    Animated.parallel([
      Animated.timing(screenTranslateY, { toValue: -screenHeight, duration: TRANS_MS, easing: easeOut, useNativeDriver: true }),
      Animated.timing(screenOpacity,    { toValue: 0,              duration: TRANS_MS, easing: easeOut, useNativeDriver: true }),
    ]).start(() => navigation.goBack());
  };

  const handleSaveAndContinue = () => {
    if (selectedRole) navigation.navigate('InterestSelection' as never);
  };

  const handleRoleSelect = (role: 'participant' | 'organizer') => {
    const targetScale   = role === 'participant' ? participantScale          : organizerScale;
    const otherScale    = role === 'participant' ? organizerScale            : participantScale;
    const targetOpacity = role === 'participant' ? participantActiveOpacity  : organizerActiveOpacity;
    const otherOpacity  = role === 'participant' ? organizerActiveOpacity    : participantActiveOpacity;

    Animated.sequence([
      Animated.parallel([
        Animated.spring(targetScale,   { toValue: 1.05, useNativeDriver: true, friction: 7 }),
        Animated.spring(otherScale,    { toValue: 1,    useNativeDriver: true, friction: 7 }),
        Animated.timing(targetOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(otherOpacity,  { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
      Animated.spring(targetScale, { toValue: 1, useNativeDriver: true, friction: 7 }),
    ]).start();

    setSelectedRole(role);
  };

  const handlePressIn  = (s: Animated.Value) => Animated.spring(s, { toValue: 0.95, useNativeDriver: true, friction: 7 }).start();
  const handlePressOut = (s: Animated.Value) => Animated.spring(s, { toValue: 1,    useNativeDriver: true, friction: 7 }).start();

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity, transform: [{ translateY: screenTranslateY }] }]}>
      <View style={styles.content}>
        <Text style={styles.heading}>Choose how you want to use Eventrix</Text>

        <View style={styles.roleSelectionContainer}>
          <Animated.View style={{ transform: [{ scale: participantScale }] }}>
            <TouchableOpacity
              style={[styles.roleOption, selectedRole === 'participant' && styles.roleOptionSelected]}
              onPress={() => handleRoleSelect('participant')}
              onPressIn={() => handlePressIn(participantScale)}
              onPressOut={() => handlePressOut(participantScale)}
              activeOpacity={0.9}
            >
              <View style={styles.roleImageStack}>
                <Animated.Image
                  source={require('../../../assets/role-selection-users/participant-Default.png')}
                  style={[styles.roleImage, { opacity: participantActiveOpacity.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
                  resizeMode="contain"
                />
                <Animated.Image
                  source={require('../../../assets/role-selection-users/particcipant-Active.png')}
                  style={[styles.roleImage, { opacity: participantActiveOpacity }]}
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: organizerScale }] }}>
            <TouchableOpacity
              style={[styles.roleOption, selectedRole === 'organizer' && styles.roleOptionSelected]}
              onPress={() => handleRoleSelect('organizer')}
              onPressIn={() => handlePressIn(organizerScale)}
              onPressOut={() => handlePressOut(organizerScale)}
              activeOpacity={0.9}
            >
              <View style={styles.roleImageStack}>
                <Animated.Image
                  source={require('../../../assets/role-selection-users/organizer-Default.png')}
                  style={[styles.roleImage, { opacity: organizerActiveOpacity.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
                  resizeMode="contain"
                />
                <Animated.Image
                  source={require('../../../assets/role-selection-users/organizer-Active.png')}
                  style={[styles.roleImage, { opacity: organizerActiveOpacity }]}
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View style={styles.bottomActions}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton} activeOpacity={0.8}>
            <LeftArrow />
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              onPress={handleSaveAndContinue}
              onPressIn={() => handlePressIn(buttonScale)}
              onPressOut={() => handlePressOut(buttonScale)}
              style={[styles.continueButton, !selectedRole && styles.continueButtonDisabled]}
              disabled={!selectedRole}
              activeOpacity={0.9}
            >
              <Text style={[styles.continueButtonText, !selectedRole && styles.continueButtonTextDisabled]}>
                Save and Continue
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Text style={styles.infoText}>You can change the roles later from settings</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    zIndex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 60,
    lineHeight: 32,
  },
  roleSelectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  roleOption: {
    alignItems: 'center',
    justifyContent: 'center',
    // paddingVertical: 5,
    // paddingHorizontal: 0,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
    width: screenWidth * 0.99,
    minHeight: 170,
  },
  roleOptionSelected: {
    borderColor: '#FF3366',
    backgroundColor: 'rgba(255, 51, 102, 0.05)',
  },
  roleImageStack: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleImage: {
    width: '100%',
    height: 140,
    maxWidth: 340,
    position: 'absolute',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 30,
    paddingTop: 20,
    gap: 24,
  },
  backButton: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FF3366',
    width: 60,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButton: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: '#FF3366',
    borderWidth: 1,
    borderColor: '#FF3366',
    width: screenWidth * 0.6,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  continueButtonTextDisabled: {
    color: '#9CA3AF',
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
});

export default RoleSelectionScreen;

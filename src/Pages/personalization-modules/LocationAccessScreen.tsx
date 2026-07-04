import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NotificationsModal } from './NotificationPreferencesScreen';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const LocationAccessScreen: React.FC = () => {
  const navigation = useNavigation();
  const [cityInput, setCityInput] = useState('');
  const [modalVisible, setModalVisible] = useState(true);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);

  const handleAllowLocation = () => {
    setModalVisible(false);
    // Show notification preferences modal
    setNotificationModalVisible(true);
  };

  const handleNotificationClose = () => {
    setNotificationModalVisible(false);
    navigation.navigate('Login' as never);
  };

  const handleNotificationContinue = (prefs: Record<string, boolean>) => {
    setNotificationModalVisible(false);
    console.log('Notification preferences:', prefs);
    navigation.navigate('Login' as never);
  };

  const handleBackdropPress = () => {
    // Optional: Allow closing modal by tapping backdrop
    // setModalVisible(false);
  };

  return (
    <>
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        statusBarTranslucent={true}
        onRequestClose={handleBackdropPress}
      >
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
        
        
        {/* Blurred Background */}
        <View style={styles.backdrop}>
          <View style={styles.blurOverlay} />
          <TouchableOpacity 
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={handleBackdropPress}
          />
        </View>
        
        {/* Modal Content */}
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.handle} />
            {/* Title */}
            <Text style={styles.title}>Enable location access</Text>
            
            {/* Subtitle */}
            <Text style={styles.subtitle}>
              We use your location to show events happening near you.
            </Text>
            
            {/* Location Image */}
            <View style={styles.imageContainer}>
              <Image
                source={require('../../../assets/location/location.png')}
                style={styles.locationImage}
                resizeMode="cover"
              />
            </View>
            
            {/* Text Input */}
            <View style={styles.inputContainer}>
              <Image
                source={require('../../../assets/location/search.png')}
                style={styles.searchIcon}
                resizeMode="contain"
                tintColor="#9CA3AF"
              />
              <TextInput
                style={styles.cityInput}
                placeholder="or enter your city manually"
                placeholderTextColor="#9CA3AF"
                value={cityInput}
                onChangeText={setCityInput}
              />
            </View>
            
            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.allowButton}
                onPress={handleAllowLocation}
                activeOpacity={0.8}
              >
                <Text style={styles.allowButtonText}>Allow Location Access</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notification Preferences Modal */}
      <NotificationsModal
        visible={notificationModalVisible}
        onClose={handleNotificationClose}
        onContinue={handleNotificationContinue}
      />
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 30,
    width: screenWidth,
    alignItems: 'center',
    boxShadow: '0 -10px 20px rgba(0, 0, 0, 0.25)',
    paddingBottom: 50,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D8D8DE',
    marginTop: 4,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Zalando Sans Expanded',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  imageContainer: {
    width: 330,
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  },
  locationImage: {
    width: '100%',
    height: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 32,
    width: '100%',
  },
  searchIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  cityInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  allowButton: {
    minWidth: 220,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#FF3366',
    borderWidth: 1,
    borderColor: '#FF3366',
    alignItems: 'center',
  },
  allowButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default LocationAccessScreen;

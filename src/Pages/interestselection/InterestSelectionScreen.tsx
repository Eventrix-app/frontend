import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Image,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { width: screenWidth } = Dimensions.get('window');

type Interest = {
  id: string;
  name: string;
  size: string;
};

type InterestCardProps = {
  interest: Interest;
  isSelected: boolean;
  boxStyle: { width: number; height: number };
  onToggle: (id: string) => void;
};

const InterestCard: React.FC<InterestCardProps> = ({
  interest,
  isSelected,
  boxStyle,
  onToggle,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const [isHovered, setIsHovered] = useState(false);

  const animateScale = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      friction: 7,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={({ pressed }) => [
          styles.interestBox,
          boxStyle,
          isSelected && styles.interestBoxSelected,
          isHovered && styles.interestBoxHovered,
          pressed && styles.interestBoxPressed,
        ]}
        onPress={() => onToggle(interest.id)}
        onHoverIn={() => {
          setIsHovered(true);
          animateScale(1.03);
        }}
        onHoverOut={() => {
          setIsHovered(false);
          animateScale(1);
        }}
        onPressIn={() => animateScale(0.97)}
        onPressOut={() => animateScale(isHovered ? 1.03 : 1)}
      >
        <Text
          style={[
            styles.interestText,
            isSelected && styles.interestTextSelected,
            isHovered && styles.interestTextHovered,
          ]}
        >
          {interest.name}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const InterestSelectionScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const interests: Interest[] = [
    { id: '1', name: 'Music', size: 'large' },
    { id: '2', name: 'Technology', size: 'medium' },
    { id: '3', name: 'Food', size: 'small' },
    { id: '4', name: 'Art & Culture', size: 'large' },
    { id: '5', name: 'Photography', size: 'medium' },
    { id: '6', name: 'Sports', size: 'small' },
    { id: '7', name: 'Fitness', size: 'medium' },
    { id: '8', name: 'Lifestyle', size: 'large' },
    { id: '9', name: 'Travel', size: 'small' },
    { id: '10', name: 'Gaming', size: 'medium' },
    { id: '11', name: 'Business', size: 'large' },
    { id: '12', name: 'Networking', size: 'small' },
    { id: '13', name: 'Programming', size: 'medium' },
    { id: '14', name: 'Education', size: 'large' },
    { id: '15', name: 'Workshops', size: 'small' },
    { id: '16', name: 'Adventure', size: 'medium' },
    { id: '17', name: 'Esports', size: 'large' },
    { id: '18', name: '+ More', size: 'medium' },
  ];

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleSaveAndContinue = () => {
    if (selectedInterests.length >= 3) {
      // Navigate to location access screen
      navigation.navigate('LocationAccess' as never);
    }
  };

  const handleInterestToggle = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const getInterestBoxStyle = (size: string) => {
    switch (size) {
      case 'large':
        return { width: screenWidth * 0.4, height: 80 };
      case 'medium':
        return { width: screenWidth * 0.3, height: 70 };
      case 'small':
        return { width: screenWidth * 0.25, height: 60 };
      default:
        return { width: screenWidth * 0.3, height: 70 };
    }
  };

  return (
    <View style={styles.container}>
      {/* Content */}
      <View style={styles.content}>
        {/* Heading */}
        <Text style={styles.heading}>Choose your interests</Text>
        <Text style={styles.subtitle}>Select atleast 3 to get better event recommendations.</Text>
        
        {/* Interest Selection */}
        <ScrollView 
          style={styles.interestContainer}
          contentContainerStyle={styles.interestContentContainer}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          decelerationRate="fast"
        >
          <View style={styles.interestGrid}>
            {interests.map((interest) => {
              const isSelected = selectedInterests.includes(interest.id);
              const boxStyle = getInterestBoxStyle(interest.size);
              
              return (
                <InterestCard
                  key={interest.id}
                  interest={interest}
                  isSelected={isSelected}
                  boxStyle={boxStyle}
                  onToggle={handleInterestToggle}
                />
              );
            })}
          </View>
        </ScrollView>
        
        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          {/* Back Arrow */}
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          
          {/* Save & Continue Button */}
          <TouchableOpacity
            onPress={handleSaveAndContinue}
            style={[
              styles.continueButton,
              selectedInterests.length < 3 && styles.continueButtonDisabled
            ]}
            disabled={selectedInterests.length < 3}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.continueButtonText,
              selectedInterests.length < 3 && styles.continueButtonTextDisabled
            ]}>
              Save and Continue
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Bottom Tagline */}
        <Text style={styles.taglineText}>
          you can change this anytime from your profiles
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  heading: {
    fontSize: 28,
    fontFamily: 'Zalando Sans Expanded',
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  interestContainer: {
    flex: 1,
  },
  interestContentContainer: {
    paddingBottom: 20,
  },
  interestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
  },
  interestBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFC0CB', // Pink border
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  interestBoxHovered: {
    borderColor: '#FF3366',
    backgroundColor: 'rgba(255, 51, 102, 0.08)',
    shadowColor: '#FF3366',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  interestBoxPressed: {
    backgroundColor: 'rgba(255, 51, 102, 0.12)',
  },
  interestBoxSelected: {
    borderColor: '#FF3366',
    backgroundColor: 'rgba(255, 51, 102, 0.05)',
  },
  interestText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  interestTextHovered: {
    color: '#FF3366',
  },
  interestTextSelected: {
    color: '#FF3366',
    fontWeight: '600',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 30,
    paddingTop: 20,
  },
  backButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FF3366',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: '#FF3366',
    fontWeight: '800',
  },
  continueButton: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: '#FF3366',
    borderWidth: 1,
    borderColor: '#FF3366',
    width: screenWidth * 0.62,
    alignItems: 'center',
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
  taglineText: {
    fontSize: 18,
    color: '#FF3366',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
});

export default InterestSelectionScreen;

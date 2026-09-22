import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Dimensions,
  Keyboard,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import CustomButton from '../components/CustomButton';
import CareWaveAlertModal from '../components/CareWaveAlertModal';
import { checkUserExists, sendEmailOtp } from '../services/authService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PhoneEntryScreenProps {
  onNavigateToOtp: (phoneNumber: string, email: string, userExists: boolean) => void;
}

export default function PhoneEntryScreen({ onNavigateToOtp }: PhoneEntryScreenProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState<'PHONE' | 'EMAIL'>('PHONE');
  const [userExists, setUserExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEmailExistsModal, setShowEmailExistsModal] = useState(false);

  const handlePhoneSubmit = async () => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    if (cleanNumber.length !== 10) {
      Alert.alert(
        'Invalid Phone Number',
        'Please enter a valid 10-digit mobile number to continue.',
        [{ text: 'OK' }]
      );
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    try {
      console.log(`[PhoneEntry] Checking user existence for number: ${cleanNumber}`);
      const response = await checkUserExists(cleanNumber);
      
      if (response.exists) {
        if (response.email && response.email.trim() !== '') {
          console.log(`[PhoneEntry] User exists with linked email: ${response.email}. Dispatched OTP.`);
          const sendRes = await sendEmailOtp(response.email, cleanNumber);
          setLoading(false);
          if (sendRes.success) {
            onNavigateToOtp(cleanNumber, response.email, true);
          } else {
            Alert.alert('Verification Error', sendRes.message || 'Could not send verification code.');
          }
        } else {
          console.log(`[PhoneEntry] User exists but lacks linked email. Directing to email capture.`);
          setUserExists(true);
          setStage('EMAIL');
          setLoading(false);
        }
      } else {
        console.log(`[PhoneEntry] User does not exist. Directing to email capture.`);
        setUserExists(false);
        setStage('EMAIL');
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      Alert.alert(
        'Network Error',
        'Could not reach server. Verify your internet connectivity and try again.'
      );
    }
  };

  const handleEmailSubmit = async () => {
    const cleanEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    try {
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      console.log(`[PhoneEntry] Dispatched OTP to entered email: ${cleanEmail} for phone: ${cleanNumber}`);
      const sendRes = await sendEmailOtp(cleanEmail, cleanNumber);
      setLoading(false);
      if (sendRes.success) {
        onNavigateToOtp(cleanNumber, cleanEmail, userExists);
      } else {
        if (sendRes.status === 409) {
          setShowEmailExistsModal(true);
        } else {
          Alert.alert('Verification Error', sendRes.message || 'Could not send verification code.');
        }
      }
    } catch (error) {
      setLoading(false);
      Alert.alert(
        'Network Error',
        'Failed to request verification code. Please check your connection.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Banner section with Red Gradient - Responsive sizing */}
          <LinearGradient
            colors={['#D32F2F', '#8E1C1C']}
            style={styles.headerSection}
          >
            {stage === 'EMAIL' && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStage('PHONE')}
                accessibilityRole="button"
                accessibilityLabel="Go back to phone entry"
              >
                <Feather name="chevron-left" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {/* Branded CareWave Logo */}
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
            />
            <Text style={styles.appTitle}>CareWave</Text>
            <Text style={styles.appSubtitle}>Intelligent Emergency Response</Text>
          </LinearGradient>

          {/* Lower dark sheet containing form fields */}
          <View style={styles.sheetSection}>
            <View style={styles.sheetHeader}>
              <Text style={styles.loginTitle}>{stage === 'PHONE' ? 'Login' : 'Email Setup'}</Text>
              <Text style={styles.loginSubtext}>
                {stage === 'PHONE' 
                  ? 'Enter your mobile number to continue'
                  : userExists 
                    ? 'Enter email to receive security verification code'
                    : 'Enter email to verify and register your account'}
              </Text>
            </View>

            {/* Input fields box */}
            {stage === 'PHONE' ? (
              <View style={styles.inputContainer}>
                {/* Country selector */}
                <View style={styles.countrySelector}>
                  <Text style={styles.countryText}>IN +91</Text>
                  <Feather name="chevron-down" size={16} color="#8E8E93" />
                </View>

                {/* Vertical divider line */}
                <View style={styles.divider} />

                {/* Text Input area */}
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Enter mobile number"
                  placeholderTextColor="#636366"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  accessibilityLabel="Mobile Number Input"
                />

                {/* Phone Icon indicator */}
                <Feather name="phone" size={18} color="#8E8E93" style={styles.phoneIcon} />
              </View>
            ) : (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Enter email address"
                  placeholderTextColor="#636366"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  accessibilityLabel="Email Address Input"
                />
                <Feather name="mail" size={18} color="#8E8E93" style={styles.phoneIcon} />
              </View>
            )}

            {/* Reusable Submit button */}
            <CustomButton
              title={stage === 'PHONE' ? 'Continue' : 'Send Code'}
              onPress={stage === 'PHONE' ? handlePhoneSubmit : handleEmailSubmit}
              loading={loading}
              icon="arrow-right"
            />

            {/* Privacy footer */}
            <View style={styles.privacyFooter}>
              <MaterialCommunityIcons name="shield-check-outline" size={16} color="#8E8E93" />
              <Text style={styles.privacyText}>
                We respect your privacy. Your number is safe with us.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CareWaveAlertModal
        visible={showEmailExistsModal}
        type="ERROR"
        title="Email Already Registered"
        message="This email is already linked to another CareWave account. Please use a different email or sign in."
        onClose={() => setShowEmailExistsModal(false)}
        okButtonColor="#FF4D4F"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F11',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#0F0F11',
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: SCREEN_HEIGHT < 700 ? 40 : 60,
    paddingBottom: SCREEN_HEIGHT < 700 ? 30 : 50,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: SCREEN_HEIGHT < 700 ? 32 : 52,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 22,
  },
  logoImage: {
    width: 60,
    height: 60,
    borderRadius: 15,
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
  },
  sheetSection: {
    flex: 1,
    backgroundColor: '#0F0F11',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  sheetHeader: {
    marginBottom: 24,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  loginSubtext: {
    fontSize: 14,
    color: '#8E8E93',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#2C2C2E',
    marginHorizontal: 14,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  phoneIcon: {
    marginLeft: 8,
  },
  privacyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 'auto',
    paddingVertical: 12,
  },
  privacyText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

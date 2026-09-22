import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Dimensions,
  Keyboard,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import CustomButton from '../components/CustomButton';
import { sendEmailOtp, verifyEmailOtp, mobileLogin } from '../services/authService';
import { saveAuthData } from '../services/storageService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Helper to mask email for security display
const maskEmail = (emailStr: string): string => {
  if (!emailStr || !emailStr.includes('@')) {
    return emailStr || '';
  }
  const [localPart, domain] = emailStr.split('@');
  if (localPart.length <= 3) {
    return `${localPart}***@${domain}`;
  }
  if (localPart.length === 4) {
    return `${localPart.slice(0, 2)}***${localPart.slice(-1)}@${domain}`;
  }
  if (localPart.length === 5) {
    return `${localPart.slice(0, 3)}***${localPart.slice(-1)}@${domain}`;
  }
  return `${localPart.slice(0, 3)}***${localPart.slice(-2)}@${domain}`;
};

interface OTPVerificationScreenProps {
  phoneNumber: string;
  email: string;
  userExists: boolean;
  onNavigateBack: () => void;
  onNavigateToOnboarding: (email: string) => void;
  onNavigateToHome: (firstName: string) => void;
}

export default function OTPVerificationScreen({
  phoneNumber,
  email,
  userExists,
  onNavigateBack,
  onNavigateToOnboarding,
  onNavigateToHome,
}: OTPVerificationScreenProps) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);

  // Simple countdown timer for OTP resend cooldown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter a valid 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      console.log(`[OTPVerify] Call verify-email-otp for ${email} with code ${otp}`);
      const verifyResponse = await verifyEmailOtp(email, otp);

      if (!verifyResponse.verified) {
        setLoading(false);
        let errorMsg = 'The verification code entered is incorrect.';
        if (verifyResponse.reason === 'OTP_EXPIRED') {
          errorMsg = 'This verification code has expired. Please request a new one.';
        } else if (verifyResponse.reason === 'TOO_MANY_ATTEMPTS') {
          errorMsg = 'Too many failed verification attempts. Please request a new code.';
        }
        Alert.alert('Verification Failed', errorMsg);
        return;
      }

      console.log('[OTPVerify] Verification succeeded. Navigating target flow.');

      if (userExists) {
        console.log('[Auth] User exists. Triggering mobile-login API.');
        const authResponse = await mobileLogin(phoneNumber);
        
        // Persist token and user details
        await saveAuthData(authResponse.token, {
          userId: authResponse.userId,
          firstName: authResponse.firstName,
          contactNumber: authResponse.contactNumber,
        });

        Keyboard.dismiss();
        onNavigateToHome(authResponse.firstName);
      } else {
        console.log('[Auth] New user. Proceeding to Onboarding form.');
        Keyboard.dismiss();
        onNavigateToOnboarding(email);
      }
    } catch (error) {
      setLoading(false);
      Alert.alert(
        'Authentication Error',
        'Could not complete verification. Verify your network connection and that the backend server is running.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      console.log(`[OTPVerify] Resending OTP to: ${email} for phone: ${phoneNumber}`);
      const sendRes = await sendEmailOtp(email, phoneNumber);
      setLoading(false);
      if (sendRes.success) {
        setTimer(30);
        setOtp('');
        Alert.alert('OTP Resent', 'A new verification code has been sent to your email.');
      } else {
        Alert.alert('Resend Failed', sendRes.message || 'Could not send verification code.');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to request new code. Please try again.');
    }
  };

  // Phone display removed as email OTP is delivery channel

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
          {/* Top Banner section with Red Gradient and Back chevron */}
          <LinearGradient
            colors={['#D32F2F', '#8E1C1C']}
            style={styles.headerSection}
          >
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={onNavigateBack}
              accessibilityRole="button"
              accessibilityLabel="Go back to phone entry"
            >
              <Feather name="chevron-left" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Branded CareWave Logo */}
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
            />
            <Text style={styles.appTitle}>Verify Email</Text>
            <Text style={styles.appSubtitle}>Security Checkpoint</Text>
          </LinearGradient>

          {/* Lower dark sheet */}
          <View style={styles.sheetSection}>
            <View style={styles.sheetHeader}>
              <Text style={styles.loginTitle}>Enter OTP</Text>
              <Text style={styles.loginSubtext}>
                We sent a 6-digit verification code to your registered email address.
              </Text>
              <Text style={styles.maskedEmailText}>
                {maskEmail(email)}
              </Text>
            </View>

            {/* Simplified single centered standard input */}
            <TextInput
              style={styles.otpInput}
              placeholder="000000"
              placeholderTextColor="#48484A"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              accessibilityLabel="Enter 6-digit OTP code"
              secureTextEntry={false}
            />

            {/* Verification action button */}
            <CustomButton
              title="Verify Code"
              onPress={handleVerify}
              loading={loading}
              icon="shield"
            />

            {/* Timer and Resend section */}
            <View style={styles.timerContainer}>
              {timer > 0 ? (
                <Text style={styles.timerText}>
                  Resend code in <Text style={styles.timerCountdown}>0:{timer < 10 ? `0${timer}` : timer}</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                  <Text style={styles.resendText}>Resend Verification Code</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Privacy footer */}
            <View style={styles.privacyFooter}>
              <MaterialCommunityIcons name="shield-check-outline" size={16} color="#8E8E93" />
              <Text style={styles.privacyText}>
                Secure authentication powered by CareWave.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    lineHeight: 20,
  },
  maskedEmailText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
  },
  otpInput: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 12,
    height: 58,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 16,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  timerText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  timerCountdown: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D32F2F',
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

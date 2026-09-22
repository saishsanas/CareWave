import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import './src/services/firebase';

// Keep the splash screen visible while we fetch resources / restore session
SplashScreen.preventAutoHideAsync().catch(() => {});
import PhoneEntryScreen from './src/screens/PhoneEntryScreen';
import OTPVerificationScreen from './src/screens/OTPVerificationScreen';
import NewUserOnboardingScreen from './src/screens/NewUserOnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import LiveTrackingMapScreen from './src/screens/LiveTrackingMapScreen';
import FakeCallSetupScreen from './src/screens/FakeCallSetupScreen';
import FakeCallScreen from './src/screens/FakeCallScreen';
import AIAssistantScreen from './src/screens/AIAssistantScreen';
import SafetyCheckInScreen from './src/screens/SafetyCheckInScreen';
import IncomingCallScreen from './src/screens/IncomingCallScreen';
import GeoFenceScreen from './src/screens/GeoFenceScreen';
import EmergencyContactsScreen from './src/screens/EmergencyContactsScreen';
import HospitalsScreen from './src/screens/HospitalsScreen';
import SafetyMapScreen from './src/screens/SafetyMapScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import NotificationCenterScreen from './src/screens/NotificationCenterScreen';
import { getAuthData } from './src/services/storageService';
import { startGeofenceMonitoring, stopGeofenceMonitoring } from './src/services/geofenceMonitoringService';

type Screen = 'LOADING' | 'PHONE_ENTRY' | 'OTP_VERIFICATION' | 'NEW_USER_ONBOARDING' | 'HOME' | 'LIVE_TRACKING_MAP' | 'FAKE_CALL_SETUP' | 'FAKE_CALL' | 'AI_ASSISTANT' | 'SAFETY_CHECK_IN' | 'INCOMING_CALL' | 'GEOFENCE' | 'EMERGENCY_CONTACTS' | 'HOSPITALS' | 'SAFETY_MAP' | 'ALERTS' | 'PROFILE' | 'NOTIFICATION_CENTER';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('LOADING');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [selectedEmergencyId, setSelectedEmergencyId] = useState<string | undefined>(undefined);
  const [fakeCallerName, setFakeCallerName] = useState('');
  const [pendingEmergencyType, setPendingEmergencyType] = useState<'MEDICAL' | 'POLICE' | 'OTHER' | null>(null);
  const [isCheckInTrigger, setIsCheckInTrigger] = useState(false);
  const [email, setEmail] = useState('');
  const [userExists, setUserExists] = useState(false);
  
  // Timer reference for scheduling fake calls
  const fakeCallTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Clear timers on component unmount
  useEffect(() => {
    return () => {
      if (fakeCallTimerRef.current) {
        clearTimeout(fakeCallTimerRef.current);
      }
    };
  }, []);

  // Manage GeoFence monitoring lifecycle based on active authentication session
  useEffect(() => {
    if (firstName) {
      startGeofenceMonitoring();
    } else {
      stopGeofenceMonitoring();
    }
    return () => {
      stopGeofenceMonitoring();
    };
  }, [firstName]);

  // App session restore check on startup
  useEffect(() => {
    async function restoreSession() {
      try {
        console.log('[Auth] Restoring session from persistent storage...');
        const session = await getAuthData();
        if (session) {
          console.log('[Auth] Session restored successfully for user:', session.user.firstName);
          setPhoneNumber(session.user.contactNumber);
          setFirstName(session.user.firstName);
          setCurrentScreen('HOME');
        } else {
          console.log('[Auth] No active session found. Redirecting to login onboarding.');
          setCurrentScreen('PHONE_ENTRY');
        }
      } catch (error) {
        console.error('[Auth] Failed to restore session on startup:', error);
        setCurrentScreen('PHONE_ENTRY');
      } finally {
        try {
          await SplashScreen.hideAsync();
        } catch (err) {
          console.warn('[SplashScreen] Error hiding splash screen:', err);
        }
      }
    }
    restoreSession();
  }, []);

  const navigateToOtp = (phone: string, verifiedEmail: string, exists: boolean) => {
    setPhoneNumber(phone);
    setEmail(verifiedEmail);
    setUserExists(exists);
    setCurrentScreen('OTP_VERIFICATION');
  };

  const navigateToOnboarding = (verifiedEmail: string) => {
    setEmail(verifiedEmail);
    setCurrentScreen('NEW_USER_ONBOARDING');
  };

  const navigateToHome = (userName: string) => {
    setFirstName(userName);
    setCurrentScreen('HOME');
  };

  const navigateToPhoneEntry = () => {
    setPhoneNumber('');
    setFirstName('');
    setEmail('');
    setUserExists(false);
    setCurrentScreen('PHONE_ENTRY');
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      {currentScreen === 'LOADING' ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D32F2F" />
        </View>
      ) : (
        <>
          {currentScreen === 'PHONE_ENTRY' && (
            <PhoneEntryScreen onNavigateToOtp={navigateToOtp} />
          )}
          {currentScreen === 'OTP_VERIFICATION' && (
            <OTPVerificationScreen
              phoneNumber={phoneNumber}
              email={email}
              userExists={userExists}
              onNavigateBack={navigateToPhoneEntry}
              onNavigateToOnboarding={navigateToOnboarding}
              onNavigateToHome={navigateToHome}
            />
          )}
          {currentScreen === 'NEW_USER_ONBOARDING' && (
            <NewUserOnboardingScreen
              phoneNumber={phoneNumber}
              email={email}
              onNavigateBack={() => setCurrentScreen('OTP_VERIFICATION')}
              onNavigateToHome={navigateToHome}
            />
          )}
          {currentScreen === 'HOME' && (
            <HomeScreen
              firstName={firstName}
              phoneNumber={phoneNumber}
              onSignOut={navigateToPhoneEntry}
              onNavigateToMap={(emergencyId) => {
                setSelectedEmergencyId(emergencyId);
                setCurrentScreen('LIVE_TRACKING_MAP');
              }}
              onNavigateToFakeCallSetup={() => {
                setCurrentScreen('FAKE_CALL_SETUP');
              }}
              onNavigateToAIAssistant={() => {
                setCurrentScreen('AI_ASSISTANT');
              }}
              onNavigateToSafetyCheckIn={() => {
                setCurrentScreen('SAFETY_CHECK_IN');
              }}
              onNavigateToGeoFence={() => {
                setCurrentScreen('GEOFENCE');
              }}
              onNavigateToEmergencyContacts={() => {
                setCurrentScreen('EMERGENCY_CONTACTS');
              }}
              onNavigateToHospitals={() => {
                setCurrentScreen('HOSPITALS');
              }}
              onNavigateToSafetyMap={() => {
                setCurrentScreen('SAFETY_MAP');
              }}
              onNavigateToAlerts={() => {
                setCurrentScreen('ALERTS');
              }}
              onNavigateToProfile={() => {
                setCurrentScreen('PROFILE');
              }}
              onNavigateToNotifications={() => {
                setCurrentScreen('NOTIFICATION_CENTER');
              }}
              pendingEmergencyType={pendingEmergencyType}
              isCheckInTrigger={isCheckInTrigger}
              onClearPendingEmergency={() => {
                setPendingEmergencyType(null);
                setIsCheckInTrigger(false);
              }}
            />
          )}
          {currentScreen === 'LIVE_TRACKING_MAP' && (
            <LiveTrackingMapScreen
              emergencyId={selectedEmergencyId}
              onNavigateBack={() => {
                setSelectedEmergencyId(undefined);
                setCurrentScreen('HOME');
              }}
            />
          )}
          {currentScreen === 'FAKE_CALL_SETUP' && (
            <FakeCallSetupScreen
              onNavigateBack={() => {
                setCurrentScreen('HOME');
              }}
              onStartCall={(callerName, delaySeconds) => {
                setFakeCallerName(callerName);
                
                // Clear any existing scheduled call
                if (fakeCallTimerRef.current) {
                  clearTimeout(fakeCallTimerRef.current);
                  fakeCallTimerRef.current = null;
                }

                if (delaySeconds > 0) {
                  setCurrentScreen('HOME');
                  fakeCallTimerRef.current = setTimeout(() => {
                    fakeCallTimerRef.current = null;
                    setCurrentScreen('INCOMING_CALL');
                  }, delaySeconds * 1000);
                } else {
                  setCurrentScreen('INCOMING_CALL');
                }
              }}
            />
          )}
          {currentScreen === 'FAKE_CALL' && (
            <FakeCallScreen
              callerName={fakeCallerName}
              onEndCall={() => {
                setFakeCallerName('');
                setCurrentScreen('HOME');
              }}
            />
          )}
          {currentScreen === 'AI_ASSISTANT' && (
            <AIAssistantScreen
              onNavigateBack={() => {
                setCurrentScreen('HOME');
              }}
            />
          )}
          {currentScreen === 'SAFETY_CHECK_IN' && (
            <SafetyCheckInScreen
              onNavigateBack={() => {
                setCurrentScreen('HOME');
              }}
              onTriggerEmergency={(type) => {
                setPendingEmergencyType(type);
                setIsCheckInTrigger(true);
                setCurrentScreen('HOME');
              }}
            />
          )}
          {currentScreen === 'INCOMING_CALL' && (
            <IncomingCallScreen
              callerName={fakeCallerName}
              onAccept={() => {
                setCurrentScreen('FAKE_CALL');
              }}
              onDecline={() => {
                setFakeCallerName('');
                setCurrentScreen('HOME');
              }}
            />
          )}
          {currentScreen === 'GEOFENCE' && (
            <GeoFenceScreen
              onNavigateBack={() => {
                setCurrentScreen('HOME');
              }}
            />
          )}
          {currentScreen === 'EMERGENCY_CONTACTS' && (
            <EmergencyContactsScreen
              onNavigateBack={() => {
                setCurrentScreen('HOME');
              }}
            />
          )}
          {currentScreen === 'HOSPITALS' && (
            <HospitalsScreen
              onNavigateBack={() => {
                setCurrentScreen('HOME');
              }}
            />
          )}
          {currentScreen === 'SAFETY_MAP' && (
            <SafetyMapScreen
              onNavigateBack={() => {
                setCurrentScreen('HOME');
              }}
            />
          )}
          {currentScreen === 'ALERTS' && (
            <AlertsScreen
              onNavigateBack={() => {
                setCurrentScreen('HOME');
              }}
              onNavigateToMap={(emergencyId) => {
                setSelectedEmergencyId(emergencyId);
                setCurrentScreen('LIVE_TRACKING_MAP');
              }}
            />
          )}
          {currentScreen === 'PROFILE' && (
            <ProfileScreen
              firstName={firstName}
              phoneNumber={phoneNumber}
              onNavigateBack={() => {
                setCurrentScreen('HOME');
              }}
              onSignOut={navigateToPhoneEntry}
            />
          )}
          {currentScreen === 'NOTIFICATION_CENTER' && (
            <NotificationCenterScreen
              onNavigateBack={() => {
                setCurrentScreen('HOME');
              }}
            />
          )}
        </>
      )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F11',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F0F11',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
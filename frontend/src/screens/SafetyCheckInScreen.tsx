import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Platform,
  AppState,
  AppStateStatus,
  Dimensions,
  ActivityIndicator,
  Vibration,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SafetyCheckInScreenProps {
  onNavigateBack: () => void;
  onTriggerEmergency: (type: 'MEDICAL' | 'POLICE' | 'OTHER') => void;
}

type ScreenState = 'SELECTION' | 'ACTIVE' | 'PROMPT';

export default function SafetyCheckInScreen({
  onNavigateBack,
  onTriggerEmergency,
}: SafetyCheckInScreenProps) {
  const insets = useSafeAreaInsets();
  const [screenState, setScreenState] = useState<ScreenState>('SELECTION');
  const [selectedPreset, setSelectedPreset] = useState<number | 'custom' | null>(null);
  const [customMinutes, setCustomMinutes] = useState('');
  const [expiryTime, setExpiryTime] = useState<number | null>(null);
  const [sessionDuration, setSessionDuration] = useState<number | null>(null);
  
  // Timers remaining (in seconds)
  const [checkInSecondsLeft, setCheckInSecondsLeft] = useState(0);
  const [promptSecondsLeft, setPromptSecondsLeft] = useState(60);
  const [showChooseHelpModal, setShowChooseHelpModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const activeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const promptTimerRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const soundRef = useRef<Audio.Sound | null>(null);
  const alarmPlayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // AsyncStorage Keys
  const ACTIVE_KEY = '@carewave_checkin_active';
  const EXPIRY_KEY = '@carewave_checkin_expiry';
  const DURATION_KEY = '@carewave_checkin_duration';

  const startAlarm = async () => {
    try {
      await stopAlarm();

      console.log('[WARNING SOUND START]');
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/safety-alert.mp3'),
        { shouldPlay: true }
      );
      soundRef.current = sound;

      console.log('[WARNING VIBRATION START]');
      Vibration.vibrate([0, 400, 300, 400, 300, 400]);

      const playBeep = async () => {
        try {
          console.log('[WARNING SOUND REPEAT]');
          if (soundRef.current) {
            await soundRef.current.setPositionAsync(0);
            await soundRef.current.playAsync();
          }
          Vibration.vibrate([0, 400, 300, 400, 300, 400]);
        } catch (e) {
          console.warn('[SafetyCheckIn] Error playing sound tick:', e);
        }
      };

      alarmPlayIntervalRef.current = setInterval(playBeep, 3000);
    } catch (err) {
      console.warn('[SafetyCheckIn] Failed to start alarm:', err);
    }
  };

  const stopAlarm = async () => {
    try {
      if (alarmPlayIntervalRef.current) {
        clearInterval(alarmPlayIntervalRef.current);
        alarmPlayIntervalRef.current = null;
      }
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      Vibration.cancel();
      console.log('[WARNING STOPPED]');
    } catch (err) {
      console.warn('[SafetyCheckIn] Failed to stop alarm sound:', err);
    }
  };

  // Restore session on mount
  useEffect(() => {
    restoreCheckInSession();
    
    // Subscribe to AppState changes (backgrounding/resuming)
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
      clearAllIntervals();
      stopAlarm();
    };
  }, []);

  // Sync timers whenever view states or expiry time changes
  useEffect(() => {
    clearAllIntervals();

    if (screenState === 'ACTIVE' && expiryTime) {
      stopAlarm();
      const runActiveCountdown = () => {
        const seconds = Math.max(0, Math.ceil((expiryTime - Date.now()) / 1000));
        setCheckInSecondsLeft(seconds);

        if (seconds <= 0) {
          clearAllIntervals();
          setScreenState('PROMPT');
          setPromptSecondsLeft(60);
        }
      };

      runActiveCountdown();
      activeTimerRef.current = setInterval(runActiveCountdown, 1000);
    } else if (screenState === 'PROMPT' && expiryTime) {
      const runPromptCountdown = () => {
        // Expiry prompt countdown starts immediately after checking session duration
        const diffSeconds = Math.floor((Date.now() - expiryTime) / 1000);
        const remainingPrompt = Math.max(0, 60 - diffSeconds);
        setPromptSecondsLeft(remainingPrompt);

        if (remainingPrompt <= 0) {
          clearAllIntervals();
          stopAlarm();
          handleAutoTimeoutTrigger();
        }
      };

      startAlarm();
      runPromptCountdown();
      promptTimerRef.current = setInterval(runPromptCountdown, 1000);
    } else {
      stopAlarm();
    }
  }, [screenState, expiryTime]);

  const clearAllIntervals = () => {
    if (activeTimerRef.current) {
      clearInterval(activeTimerRef.current);
      activeTimerRef.current = null;
    }
    if (promptTimerRef.current) {
      clearInterval(promptTimerRef.current);
      promptTimerRef.current = null;
    }
  };

  // Restores active check-in parameters from AsyncStorage
  const restoreCheckInSession = async () => {
    try {
      const activeStr = await AsyncStorage.getItem(ACTIVE_KEY);
      const expiryStr = await AsyncStorage.getItem(EXPIRY_KEY);
      const durationStr = await AsyncStorage.getItem(DURATION_KEY);

      if (activeStr === 'true' && expiryStr) {
        const exp = parseInt(expiryStr, 10);
        const dur = durationStr ? parseInt(durationStr, 10) : 0;
        setExpiryTime(exp);
        setSessionDuration(dur);

        const now = Date.now();
        const diff = exp - now;

        if (diff > 0) {
          setScreenState('ACTIVE');
          setCheckInSecondsLeft(Math.ceil(diff / 1000));
        } else if (diff <= 0 && diff >= -60000) {
          // Inside 60 seconds warning window
          setScreenState('PROMPT');
          setPromptSecondsLeft(Math.max(0, 60 - Math.floor(Math.abs(diff) / 1000)));
        } else {
          // Expired more than 60 seconds ago in background, trigger auto-alarm immediately
          clearCheckInStorage();
          onTriggerEmergency('OTHER');
          return;
        }
      } else {
        setScreenState('SELECTION');
      }
    } catch (err) {
      console.warn('[SafetyCheckIn] Session restore failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Recalculates remaining session time when app resumes from background
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('[SafetyCheckIn] App resumed, recalculating timers...');
      setLoading(true);
      await restoreCheckInSession();
    }
    appStateRef.current = nextAppState;
  };

  const handleStartCheckIn = async () => {
    let durationMs = 0;
    if (selectedPreset === 'custom') {
      const minutes = parseInt(customMinutes, 10);
      if (isNaN(minutes) || minutes <= 0) {
        return;
      }
      durationMs = minutes * 60 * 1000;
    } else if (typeof selectedPreset === 'number') {
      durationMs = selectedPreset;
    } else {
      return;
    }

    const expiry = Date.now() + durationMs;
    setExpiryTime(expiry);
    setSessionDuration(durationMs);
    setScreenState('ACTIVE');

    try {
      await AsyncStorage.setItem(ACTIVE_KEY, 'true');
      await AsyncStorage.setItem(EXPIRY_KEY, expiry.toString());
      await AsyncStorage.setItem(DURATION_KEY, durationMs.toString());
    } catch (err) {
      console.warn('[SafetyCheckIn] Storage save failed:', err);
    }
  };

  const handleEndCheckIn = async () => {
    clearAllIntervals();
    await stopAlarm();
    await clearCheckInStorage();
    setScreenState('SELECTION');
    setSelectedPreset(null);
    setCustomMinutes('');
    onNavigateBack();
  };

  const clearCheckInStorage = async () => {
    try {
      await AsyncStorage.removeItem(ACTIVE_KEY);
      await AsyncStorage.removeItem(EXPIRY_KEY);
      await AsyncStorage.removeItem(DURATION_KEY);
    } catch (err) {
      console.warn('[SafetyCheckIn] Storage clean failed:', err);
    }
  };

  const handleAutoTimeoutTrigger = async () => {
    await stopAlarm();
    await clearCheckInStorage();
    onTriggerEmergency('OTHER');
  };

  const handleSafeAction = async () => {
    await handleEndCheckIn();
  };

  const triggerSelectedEmergency = async (type: 'MEDICAL' | 'POLICE' | 'OTHER') => {
    setShowChooseHelpModal(false);
    clearAllIntervals();
    await stopAlarm();
    await clearCheckInStorage();
    onTriggerEmergency(type);
  };

  // Helpers to format countdown numbers to human readable layout
  const formatCheckInTime = (secondsTotal: number): string => {
    if (secondsTotal <= 0) return '0s remaining';
    const hours = Math.floor(secondsTotal / 3600);
    const mins = Math.floor((secondsTotal % 3600) / 60);
    const secs = secondsTotal % 60;

    let str = '';
    if (hours > 0) str += `${hours}h `;
    if (mins > 0 || hours > 0) str += `${mins}m `;
    str += `${secs}s remaining`;
    return str;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D32F2F" />
        <Text style={styles.loadingText}>Syncing session...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header section (Selection & Active view only) */}
      {screenState !== 'PROMPT' && (
        <View style={{ backgroundColor: '#1C1C1E', paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onNavigateBack} style={styles.backBtn} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>SAFETY CHECK-IN</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
      )}

      {/* Screen view renderer */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 + insets.top : 0}
      >
        <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {screenState === 'SELECTION' && (
          <View style={[styles.innerContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.centerIconBox}>
              <MaterialCommunityIcons name="shield-account" size={64} color="#D32F2F" />
            </View>
            <Text style={styles.welcomeTitle}>Setup Safety Check-In</Text>
            <Text style={styles.welcomeSubtitle}>
              Configure a custom duration. If you do not check back within the time window, an emergency dispatch triggers automatically.
            </Text>

            {/* Presets Cards list */}
            <View style={styles.cardsGrid}>
              <TouchableOpacity
                style={[styles.presetCard, selectedPreset === 15 * 60 * 1000 && styles.selectedCard]}
                onPress={() => setSelectedPreset(15 * 60 * 1000)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetTitle}>15 Minutes</Text>
                <Text style={styles.presetSub}>Quick check</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetCard, selectedPreset === 30 * 60 * 1000 && styles.selectedCard]}
                onPress={() => setSelectedPreset(30 * 60 * 1000)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetTitle}>30 Minutes</Text>
                <Text style={styles.presetSub}>Short transit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetCard, selectedPreset === 60 * 60 * 1000 && styles.selectedCard]}
                onPress={() => setSelectedPreset(60 * 60 * 1000)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetTitle}>1 Hour</Text>
                <Text style={styles.presetSub}>Long commute</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetCard, selectedPreset === 120 * 60 * 1000 && styles.selectedCard]}
                onPress={() => setSelectedPreset(120 * 60 * 1000)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetTitle}>2 Hours</Text>
                <Text style={styles.presetSub}>Extended travel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetCard, selectedPreset === 'custom' && styles.selectedCard, { width: '100%' }]}
                onPress={() => setSelectedPreset('custom')}
                activeOpacity={0.7}
              >
                <Text style={styles.presetTitle}>Custom Duration</Text>
                <Text style={styles.presetSub}>Configure custom minutes</Text>
              </TouchableOpacity>
            </View>

            {/* Render Custom text input field conditionally */}
            {selectedPreset === 'custom' && (
              <View style={styles.customInputWrapper}>
                <Text style={styles.inputLabel}>Enter duration in minutes</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter minutes (e.g. 45)"
                    placeholderTextColor="#636366"
                    keyboardType="number-pad"
                    value={customMinutes}
                    onChangeText={setCustomMinutes}
                    maxLength={4}
                  />
                  <Feather name="clock" size={18} color="#8E8E93" />
                </View>
              </View>
            )}

            {/* Start Button */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (selectedPreset === null || (selectedPreset === 'custom' && !customMinutes)) && styles.disabledBtn,
              ]}
              onPress={handleStartCheckIn}
              disabled={selectedPreset === null || (selectedPreset === 'custom' && !customMinutes)}
              activeOpacity={0.8}
            >
              <Feather name="play" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Start Check-In</Text>
            </TouchableOpacity>
          </View>
        )}

        {screenState === 'ACTIVE' && (
          <View style={[styles.activeInnerContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.pulseTimerBox}>
              <MaterialCommunityIcons name="timer-sand" size={72} color="#4AD2FF" />
            </View>
            <Text style={styles.activeTitle}>Safety Check-In Active</Text>
            <Text style={styles.activeSubtitle}>
              CareWave is monitoring your safety. If the timer expires without a safety confirmation, emergency responders are notified.
            </Text>

            {/* Large countdown */}
            <View style={styles.countdownBox}>
              <Text style={styles.countdownText}>
                {formatCheckInTime(checkInSecondsLeft)}
              </Text>
            </View>

            {/* Active session buttons */}
            <View style={styles.activeActions}>
              <TouchableOpacity
                style={styles.needHelpBtn}
                onPress={() => setShowChooseHelpModal(true)}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="alert-decagram" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.needHelpText}>Need Help Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.endCheckInBtn}
                onPress={handleEndCheckIn}
                activeOpacity={0.8}
              >
                <Feather name="x-circle" size={18} color="#E5E5EA" style={{ marginRight: 8 }} />
                <Text style={styles.endCheckInText}>End Check-In</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {screenState === 'PROMPT' && (
          <View style={[styles.promptInnerContent, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 16) }]}>
            {/* Red Warning Card */}
            <View style={styles.emergencyWarningCard}>
              <View style={styles.emergencyIconBox}>
                <Feather name="alert-octagon" size={48} color="#FF3B30" />
              </View>
              
              <Text style={styles.emergencyHeading}>CRITICAL SAFETY ALERT</Text>
              <Text style={styles.emergencySubheading}>Safety Check-In Expired</Text>
              
              {/* Large Countdown */}
              <View style={styles.largeCountdownContainer}>
                <Text style={styles.largeCountdownText}>{promptSecondsLeft}</Text>
                <Text style={styles.largeCountdownSub}>SECONDS REMAINING</Text>
              </View>

              <Text style={styles.emergencyWarningLabel}>
                Auto emergency activation in {promptSecondsLeft}s
              </Text>
              <Text style={styles.emergencySafeQuestion}>Are you safe?</Text>
            </View>

            {/* Prompt Actions buttons */}
            <View style={styles.promptActions}>
              <TouchableOpacity
                style={styles.imSafeBtn}
                onPress={handleSafeAction}
                activeOpacity={0.85}
              >
                <Feather name="check" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.imSafeBtnText}>I'm Safe</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.needHelpPromptBtn}
                onPress={() => setShowChooseHelpModal(true)}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="alert-circle" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.needHelpPromptText}>Need Help</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Choose Assistance Modal */}
      <Modal
        visible={showChooseHelpModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowChooseHelpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowChooseHelpModal(false)}
          />
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
            <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose Assistance</Text>
                <TouchableOpacity onPress={() => setShowChooseHelpModal(false)} style={styles.closeModalBtn}>
                  <Feather name="x" size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              <View style={styles.assistanceList}>
                <TouchableOpacity
                  style={styles.assistanceCard}
                  onPress={() => triggerSelectedEmergency('MEDICAL')}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons name="ambulance" size={28} color="#FF5252" />
                  <Text style={styles.assistanceCardText}>🚑 Medical</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.assistanceCard}
                  onPress={() => triggerSelectedEmergency('POLICE')}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons name="shield-car" size={28} color="#FF5252" />
                  <Text style={styles.assistanceCardText}>👮 Police</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.assistanceCard}
                  onPress={() => triggerSelectedEmergency('OTHER')}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons name="shield-alert" size={28} color="#FF5252" />
                  <Text style={styles.assistanceCardText}>🛡 General Emergency</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F11',
  },
  keyboardAvoid: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F0F11',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    backgroundColor: '#1C1C1E',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  innerContent: {
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 40,
    alignItems: 'center',
    width: '100%',
  },
  centerIconBox: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(211, 47, 47, 0.25)',
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  presetCard: {
    width: '48%',
    backgroundColor: '#1C1C1E',
    borderWidth: 1.5,
    borderColor: '#2C2C2E',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
  },
  selectedCard: {
    borderColor: '#D32F2F',
    backgroundColor: 'rgba(211, 47, 47, 0.05)',
  },
  presetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  presetSub: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  customInputWrapper: {
    width: '100%',
    marginBottom: 24,
  },
  inputLabel: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderWidth: 1.5,
    borderColor: '#2C2C2E',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  primaryBtn: {
    backgroundColor: '#D32F2F',
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  disabledBtn: {
    backgroundColor: '#2C2C2E',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  activeInnerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  pulseTimerBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(74, 210, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(74, 210, 255, 0.25)',
  },
  activeTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  activeSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 36,
    paddingHorizontal: 10,
  },
  countdownBox: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#2C2C2E',
    paddingVertical: 24,
    paddingHorizontal: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 44,
    width: '100%',
  },
  countdownText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  activeActions: {
    width: '100%',
    gap: 14,
  },
  needHelpBtn: {
    backgroundColor: '#D32F2F',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  needHelpText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  endCheckInBtn: {
    backgroundColor: 'transparent',
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#3A3A3C',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  endCheckInText: {
    color: '#E5E5EA',
    fontSize: 15,
    fontWeight: '700',
  },
  promptInnerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 50,
  },
  warningTimerBox: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 214, 10, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 2,
    borderColor: 'rgba(255, 214, 10, 0.25)',
  },
  promptTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFD60A',
    textAlign: 'center',
  },
  promptQuestion: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 10,
    textAlign: 'center',
  },
  promptCountdownLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 14,
    marginBottom: 44,
  },
  promptActions: {
    width: '100%',
    gap: 14,
  },
  imSafeBtn: {
    backgroundColor: '#34C759',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  imSafeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  needHelpPromptBtn: {
    backgroundColor: '#D32F2F',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  needHelpPromptText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#2C2C2E',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeModalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistanceList: {
    padding: 20,
    gap: 12,
  },
  assistanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderWidth: 1.5,
    borderColor: '#3A3A3C',
    borderRadius: 16,
    padding: 16,
  },
  assistanceCardText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 14,
  },
  emergencyWarningCard: {
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderWidth: 2,
    borderColor: '#FF3B30',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  emergencyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  emergencyHeading: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FF3B30',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  emergencySubheading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  largeCountdownContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
    width: '90%',
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  largeCountdownText: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FF3B30',
    fontVariant: ['tabular-nums'],
    lineHeight: 80,
  },
  largeCountdownSub: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF453A',
    letterSpacing: 2,
    marginTop: 4,
  },
  emergencyWarningLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FF453A',
    textAlign: 'center',
    marginBottom: 10,
  },
  emergencySafeQuestion: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

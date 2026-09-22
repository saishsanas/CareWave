import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  BackHandler,
  Dimensions,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FakeCallScreenProps {
  callerName: string;
  onEndCall: () => void;
}

// Helper to extract initials from the caller name
const getInitials = (name: string): string => {
  if (!name) return '?';
  const cleanName = name.trim();
  const parts = cleanName.split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0].substring(0, 1).toUpperCase();
  }
  const first = parts[0].substring(0, 1);
  const last = parts[parts.length - 1].substring(0, 1);
  return (first + last).toUpperCase();
};

export default function FakeCallScreen({ callerName, onEndCall }: FakeCallScreenProps) {
  const insets = useSafeAreaInsets();
  const [seconds, setSeconds] = useState(0);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Dialer button states (visual toggle feedback)
  const [isMuted, setIsMuted] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isNoteActive, setIsNoteActive] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isAddCallActive, setIsAddCallActive] = useState(false);

  // Keypad states (isolated local state)
  const [showKeypad, setShowKeypad] = useState(false);
  const [enteredDigits, setEnteredDigits] = useState('');

  // Block Android hardware back button
  useEffect(() => {
    const backAction = () => {
      // Return true to indicate we have handled the action (do nothing / block exit)
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, []);

  // Update timer every second
  useEffect(() => {
    callTimerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    };
  }, []);

  const handleEndCall = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setSeconds(0);
    onEndCall();
  };

  // Format seconds to MM:SS string
  const formatTimer = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const formattedMins = mins < 10 ? `0${mins}` : `${mins}`;
    const formattedSecs = secs < 10 ? `0${secs}` : `${secs}`;
    return `${formattedMins}:${formattedSecs}`;
  };

  const handleKeyPress = (char: string) => {
    setEnteredDigits((prev) => prev + char);
  };

  const handleBackspace = () => {
    setEnteredDigits((prev) => prev.slice(0, -1));
  };

  const initials = getInitials(callerName);

  // Helper to render dial pad keys with letters
  const renderDialKey = (digit: string, letters: string) => (
    <TouchableOpacity
      key={digit}
      style={styles.dialKey}
      onPress={() => handleKeyPress(digit)}
      activeOpacity={0.6}
    >
      <Text style={styles.dialKeyDigit}>{digit}</Text>
      {letters.length > 0 && <Text style={styles.dialKeyLetters}>{letters}</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B131E" />
      
      {/* Top section: Caller details (always visible) */}
      <View style={styles.topSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <Text style={styles.callerName} numberOfLines={1} ellipsizeMode="tail">
          {callerName}
        </Text>
        
        <Text style={styles.statusText}>{isHeld ? 'Call on hold' : 'Call in Progress'}</Text>
        
        <Text style={styles.timerText}>{formatTimer(seconds)}</Text>
      </View>

      {/* Middle section: Action grid OR dial pad slide-up */}
      <View style={styles.middleSection}>
        {!showKeypad ? (
          <View style={styles.gridContainer}>
            <View style={styles.row}>
              {/* Mute (Toggles) */}
              <View style={styles.buttonWrapper}>
                <TouchableOpacity
                  onPress={() => setIsMuted(!isMuted)}
                  style={[styles.circleButton, isMuted && styles.circleButtonActive]}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons 
                    name={isMuted ? "microphone-off" : "microphone"} 
                    size={26} 
                    color={isMuted ? "#0B131E" : "#FFFFFF"} 
                  />
                </TouchableOpacity>
                <Text style={styles.buttonLabel}>Mute</Text>
              </View>

              {/* Hold (Toggles) */}
              <View style={styles.buttonWrapper}>
                <TouchableOpacity
                  onPress={() => setIsHeld(!isHeld)}
                  style={[styles.circleButton, isHeld && styles.circleButtonActive]}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons 
                    name="pause" 
                    size={26} 
                    color={isHeld ? "#0B131E" : "#FFFFFF"} 
                  />
                </TouchableOpacity>
                <Text style={styles.buttonLabel}>Hold</Text>
              </View>

              {/* Note (Press feedback only) */}
              <View style={styles.buttonWrapper}>
                <TouchableOpacity
                  onPressIn={() => setIsNoteActive(true)}
                  onPressOut={() => setIsNoteActive(false)}
                  style={[styles.circleButton, isNoteActive && styles.circleButtonActive]}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons 
                    name="note-edit-outline" 
                    size={26} 
                    color={isNoteActive ? "#0B131E" : "#FFFFFF"} 
                  />
                </TouchableOpacity>
                <Text style={styles.buttonLabel}>Note</Text>
              </View>
            </View>

            <View style={styles.row}>
              {/* Video call (Press feedback only) */}
              <View style={styles.buttonWrapper}>
                <TouchableOpacity
                  onPressIn={() => setIsVideoActive(true)}
                  onPressOut={() => setIsVideoActive(false)}
                  style={[styles.circleButton, isVideoActive && styles.circleButtonActive]}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons 
                    name="video-outline" 
                    size={26} 
                    color={isVideoActive ? "#0B131E" : "#FFFFFF"} 
                  />
                </TouchableOpacity>
                <Text style={styles.buttonLabel}>Video call</Text>
              </View>

              {/* Add call (Press feedback only) */}
              <View style={styles.buttonWrapper}>
                <TouchableOpacity
                  onPressIn={() => setIsAddCallActive(true)}
                  onPressOut={() => setIsAddCallActive(false)}
                  style={[styles.circleButton, isAddCallActive && styles.circleButtonActive]}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons 
                    name="plus" 
                    size={26} 
                    color={isAddCallActive ? "#0B131E" : "#FFFFFF"} 
                  />
                </TouchableOpacity>
                <Text style={styles.buttonLabel}>Add call</Text>
              </View>

              {/* Record (Press feedback only) */}
              <View style={styles.buttonWrapper}>
                <TouchableOpacity
                  onPressIn={() => setIsRecording(true)}
                  onPressOut={() => setIsRecording(false)}
                  style={[styles.circleButton, isRecording && styles.circleButtonActive]}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons 
                    name="voicemail" 
                    size={26} 
                    color={isRecording ? "#0B131E" : "#FFFFFF"} 
                  />
                </TouchableOpacity>
                <Text style={styles.buttonLabel}>Record</Text>
              </View>
            </View>
          </View>
        ) : (
          <ScrollView
            style={styles.keypadScroll}
            contentContainerStyle={styles.keypadScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            <View style={styles.keypadContainer}>
              {/* Keypad Display area */}
              <View style={styles.keypadDisplayRow}>
                <Text style={styles.keypadDisplayText} numberOfLines={1} ellipsizeMode="head">
                  {enteredDigits || ' '}
                </Text>
                {enteredDigits.length > 0 && (
                  <TouchableOpacity onPress={handleBackspace} style={styles.backspaceButton}>
                    <MaterialCommunityIcons name="backspace-outline" size={24} color="#A0B0C0" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Dial Keys */}
              <View style={styles.dialPadRow}>
                {renderDialKey('1', '')}
                {renderDialKey('2', 'ABC')}
                {renderDialKey('3', 'DEF')}
              </View>
              <View style={styles.dialPadRow}>
                {renderDialKey('4', 'GHI')}
                {renderDialKey('5', 'JKL')}
                {renderDialKey('6', 'MNO')}
              </View>
              <View style={styles.dialPadRow}>
                {renderDialKey('7', 'PQRS')}
                {renderDialKey('8', 'TUV')}
                {renderDialKey('9', 'WXYZ')}
              </View>
              <View style={styles.dialPadRow}>
                {renderDialKey('*', '')}
                {renderDialKey('0', '+')}
                {renderDialKey('#', '')}
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Bottom section: Primary call actions (always visible) */}
      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom + 20, 36) }]}>
        <View style={styles.bottomRow}>
          {/* Speaker (Toggles) */}
          <View style={styles.bottomActionWrapper}>
            <TouchableOpacity
              onPress={() => setIsSpeaker(!isSpeaker)}
              style={[styles.circleButtonBottom, isSpeaker && styles.circleButtonActive]}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons 
                name="volume-high" 
                size={24} 
                color={isSpeaker ? "#0B131E" : "#FFFFFF"} 
              />
            </TouchableOpacity>
            <Text style={styles.bottomButtonLabel}>Speaker</Text>
          </View>

          {/* End Call (Disconnects) */}
          <TouchableOpacity
            onPress={handleEndCall}
            style={styles.endCallButtonCircle}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="phone-hangup" size={32} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Keypad Toggle */}
          <View style={styles.bottomActionWrapper}>
            <TouchableOpacity
              onPress={() => setShowKeypad(!showKeypad)}
              style={[styles.circleButtonBottom, showKeypad && styles.circleButtonActive]}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons 
                name="dialpad" 
                size={24} 
                color={showKeypad ? "#0B131E" : "#FFFFFF"} 
              />
            </TouchableOpacity>
            <Text style={styles.bottomButtonLabel}>Keypad</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B131E', // Android Dialing deep dark blue-grey
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topSection: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 24,
    marginTop: SCREEN_HEIGHT * 0.05,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '300',
    color: '#FFFFFF',
  },
  callerName: {
    fontSize: 32,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.5,
    maxWidth: '90%',
  },
  statusText: {
    fontSize: 13,
    color: '#A0B0C0',
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  timerText: {
    fontSize: 14,
    color: '#A0B0C0',
    textAlign: 'center',
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  },
  middleSection: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginVertical: 10,
  },
  gridContainer: {
    width: '100%',
    maxWidth: 320,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 10,
  },
  buttonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 76,
  },
  circleButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  circleButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  buttonLabel: {
    fontSize: 11,
    color: '#A0B0C0',
    textAlign: 'center',
    fontWeight: '400',
  },
  bottomSection: {
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  keypadScroll: {
    width: '100%',
    flex: 1,
  },
  keypadScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20, // Keep proper spacing above bottom actions
  },
  bottomRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 320,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomActionWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 76,
  },
  circleButtonBottom: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  bottomButtonLabel: {
    fontSize: 11,
    color: '#A0B0C0',
    textAlign: 'center',
    fontWeight: '400',
  },
  endCallButtonCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  keypadContainer: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 44,
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  keypadDisplayText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 1,
    flexShrink: 1,
  },
  backspaceButton: {
    padding: 8,
    marginLeft: 8,
  },
  dialPadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginVertical: 8,
    paddingHorizontal: 12,
  },
  dialKey: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialKeyDigit: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '400',
    lineHeight: 24,
  },
  dialKeyLetters: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: 1,
    textTransform: 'uppercase',
  },
});

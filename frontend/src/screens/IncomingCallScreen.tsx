import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Vibration,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface IncomingCallScreenProps {
  callerName: string;
  onAccept: () => void;
  onDecline: () => void;
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

export default function IncomingCallScreen({
  callerName,
  onAccept,
  onDecline,
}: IncomingCallScreenProps) {
  const insets = useSafeAreaInsets();
  const soundRef = useRef<Audio.Sound | null>(null);
  const isCleaningUpRef = useRef(false);
  const autoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const initials = getInitials(callerName);

  // Setup audio, vibration, and 30-second auto-timeout on mount
  useEffect(() => {
    let active = true;

    const startMedia = async () => {
      try {
        console.log('[IncomingCall] Configuring Audio settings...');
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          playThroughEarpieceAndroid: false,
        });

        if (!active) return;

        console.log('[IncomingCall] Initializing ringtone phone-ring.mp3...');
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/sounds/phone-ring.mp3'),
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );
        
        if (!active) {
          // If component unmounted while loading
          try {
            await sound.stopAsync();
            await sound.unloadAsync();
          } catch (err) {}
          return;
        }

        await sound.setVolumeAsync(1.0);
        console.log('[RINGTONE STARTED]');
        console.log('[RINGTONE LOOPING]');

        soundRef.current = sound;
      } catch (err) {
        console.warn('[IncomingCall] Failed to load ringtone:', err);
      }

      if (active) {
        console.log('[IncomingCall] Starting repeating vibration...');
        // Vibrate 1s, Pause 1s, repeat
        Vibration.vibrate([0, 1000, 1000], true);
      }
    };

    startMedia();

    // 30 Seconds Auto Timeout
    console.log('[IncomingCall] Scheduling 30-second auto-timeout...');
    autoTimeoutRef.current = setTimeout(() => {
      console.log('[IncomingCall] 30 seconds reached. Auto-declining call.');
      handleDecline();
    }, 30000);

    return () => {
      active = false;
      cleanupResources();
    };
  }, []);

  const cleanupResources = async () => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    console.log('[IncomingCall] Clean up audio and vibration resources...');

    // Clear auto timeout
    if (autoTimeoutRef.current) {
      clearTimeout(autoTimeoutRef.current);
      autoTimeoutRef.current = null;
    }

    // Stop and cancel vibration
    try {
      Vibration.cancel();
    } catch (err) {
      console.warn('[IncomingCall] Error cancelling vibration:', err);
    }

    // Stop and unload sound
    if (soundRef.current) {
      const tempSound = soundRef.current;
      soundRef.current = null; // Instantly nullify reference to prevent duplicate triggers
      try {
        await tempSound.stopAsync();
        console.log('[RINGTONE STOPPED]');
      } catch (err) {
        console.log('[IncomingCall] Error stopping sound:', err);
      }
      try {
        await tempSound.unloadAsync();
      } catch (err) {
        console.log('[IncomingCall] Error unloading sound:', err);
      }
    }
  };

  const handleAccept = async () => {
    await cleanupResources();
    onAccept();
  };

  const handleDecline = async () => {
    await cleanupResources();
    onDecline();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      {/* Top Details section */}
      <View style={styles.topDetails}>
        <Text style={styles.incomingLabel}>Incoming Call</Text>
        
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <Text style={styles.callerName} numberOfLines={1} ellipsizeMode="tail">
          {callerName}
        </Text>
        
        <Text style={styles.callerSubtitle}>Mobile</Text>
      </View>

      {/* Bottom Actions section */}
      <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.actionsRow}>
          {/* Decline button (Red) */}
          <View style={styles.actionItem}>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={handleDecline}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="phone-hangup" size={32} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.actionLabel}>Decline</Text>
          </View>

          {/* Accept button (Green) */}
          <View style={styles.actionItem}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAccept}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="phone" size={32} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.actionLabel}>Accept</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B131E', // Matching Active Call screen color
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topDetails: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
    marginTop: SCREEN_HEIGHT * 0.05,
  },
  incomingLabel: {
    fontSize: 14,
    color: '#A0B0C0',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 28,
  },
  avatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  avatarText: {
    fontSize: 38,
    fontWeight: '300',
    color: '#FFFFFF',
  },
  callerName: {
    fontSize: 36,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.5,
    maxWidth: '90%',
  },
  callerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  bottomActions: {
    width: '100%',
    paddingHorizontal: 36,
    marginBottom: SCREEN_HEIGHT * 0.05,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
  },
  actionItem: {
    alignItems: 'center',
  },
  actionButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  declineButton: {
    backgroundColor: '#FF3B30',
    shadowColor: '#FF3B30',
  },
  acceptButton: {
    backgroundColor: '#34C759',
    shadowColor: '#34C759',
  },
  actionLabel: {
    fontSize: 13,
    color: '#A0B0C0',
    fontWeight: '600',
  },
});

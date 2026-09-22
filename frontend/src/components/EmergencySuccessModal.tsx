import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Modal, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface EmergencySuccessModalProps {
  visible: boolean;
  onAutoTransition: () => void;
  emergencyType?: string | null;
  fireSeverity?: string | null;
  selectedSafetyType?: 'WOMEN' | 'CHILD' | null;
}

const emergencyConfigs: Record<string, { title: string; subtitle: string }> = {
  MEDICAL: {
    title: '🚨 ALERT ACTIVE',
    subtitle: 'Medical Emergency Registered Successfully',
  },
  POLICE: {
    title: 'POLICE ALERT ACTIVE',
    subtitle: 'Police Emergency Registered Successfully',
  },
  FIRE: {
    title: '🔥 FIRE ALERT ACTIVE',
    subtitle: 'Fire Emergency Registered Successfully',
  },
  OTHER: {
    title: '🌐 GENERAL EMERGENCY ACTIVE',
    subtitle: 'General Emergency Registered Successfully',
  },
};

export default function EmergencySuccessModal({
  visible,
  onAutoTransition,
  emergencyType,
  fireSeverity,
  selectedSafetyType,
}: EmergencySuccessModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const getModalText = () => {
    if (emergencyType === 'PERSONAL_SAFETY') {
      if (selectedSafetyType === 'WOMEN') {
        return {
          title: '🛡 WOMEN SAFETY ALERT ACTIVE',
          subtitle: 'Women Safety Alert Registered Successfully'
        };
      } else if (selectedSafetyType === 'CHILD') {
        return {
          title: '🛡 CHILD SAFETY ALERT ACTIVE',
          subtitle: 'Child Safety Alert Registered Successfully'
        };
      }
      return {
        title: '🛡 SAFETY ALERT ACTIVE',
        subtitle: 'Personal Safety Alert Registered Successfully'
      };
    }
    return (emergencyType && emergencyConfigs[emergencyType]) || {
      title: '🚨 ALERT ACTIVE',
      subtitle: 'Emergency Registered Successfully'
    };
  };

  const currentConfig = getModalText();

  useEffect(() => {
    if (visible) {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      pulseAnim.setValue(1);

      // Run entering animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Run looping pulse animation for the icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Auto transition after 2.5 seconds
      const timer = setTimeout(() => {
        onAutoTransition();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Animated Pulsing Icon */}
          <Animated.View style={[styles.iconBox, { transform: [{ scale: pulseAnim }] }]}>
            <MaterialCommunityIcons name="alarm-light" size={48} color="#FF5252" />
          </Animated.View>

          <Text style={styles.title}>
            {currentConfig.title}
          </Text>
          <Text style={styles.subtitle}>
            {currentConfig.subtitle}
          </Text>

          {emergencyType === 'FIRE' && fireSeverity && (
            <View style={styles.severityBadge}>
              <Text style={styles.severityText}>SEVERITY: {fireSeverity}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.bulletRow}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />
            <Text style={styles.bulletText}>Your emergency request has been recorded.</Text>
          </View>

          <View style={styles.bulletRow}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />
            <Text style={styles.bulletText}>Location captured successfully.</Text>
          </View>

          <View style={styles.bulletRow}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />
            <Text style={styles.bulletText}>Live Tracking Activated.</Text>
          </View>

          <View style={styles.bulletRow}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#34C759" />
            <Text style={styles.bulletText}>Emergency support options are being prepared.</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#1C1C1E',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#FF5252',
    padding: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  iconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 82, 82, 0.3)',
  },
  title: {
    color: '#FF5252',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#2C2C2E',
    marginVertical: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 6,
    paddingHorizontal: 10,
  },
  bulletText: {
    color: '#E5E5EA',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  severityBadge: {
    backgroundColor: 'rgba(255, 153, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#FF9900',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  severityText: {
    color: '#FF9900',
    fontSize: 12,
    fontWeight: '800',
  },
});

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface PoliceActiveModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToContacts?: () => void;
}

export default function PoliceActiveModal({ visible, onClose, onNavigateToContacts }: PoliceActiveModalProps) {
  const insets = useSafeAreaInsets();
  const handleCallPolice = () => {
    Linking.openURL('tel:100').catch((err) => console.error('Error opening dialer:', err));
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>POLICE ASSISTANCE</Text>
        </View>

        {/* Content wrapping with ScrollView to fix hidden card layout bug */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="shield-star" size={80} color="#FF5252" />
          </View>

          <Text style={styles.title}>Emergency Activated</Text>
          <Text style={styles.subtitle}>
            Your police emergency alert is currently active.
          </Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={24} color="#FF5252" style={styles.infoIcon} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Location Shared</Text>
                <Text style={styles.infoDesc}>
                  Your real-time GPS coordinates are being shared with dispatchers and emergency contacts.
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="radio" size={24} color="#FF5252" style={styles.infoIcon} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Dispatch Channel Open</Text>
                <Text style={styles.infoDesc}>
                  Local authorities are notified. Stay in a safe, well-lit area if possible.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCallPolice}
            style={styles.callBtn}
          >
            <MaterialCommunityIcons name="phone" size={24} color="#FFFFFF" />
            <Text style={styles.callBtnText}>CALL POLICE (100)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onNavigateToContacts}
            style={styles.dismissBtn}
          >
            <MaterialCommunityIcons name="account-multiple" size={20} color="#E5E5EA" style={{ marginRight: 8 }} />
            <Text style={styles.dismissBtnText}>EMERGENCY CONTACTS</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F11',
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginLeft: 12,
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 40,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 82, 82, 0.25)',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  infoCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#2C2C2E',
    padding: 20,
    width: '100%',
    gap: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 14,
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  infoDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 4,
    lineHeight: 18,
  },
  bottomBar: {
    padding: 20,
    backgroundColor: '#1C1C1E',
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    gap: 12,
  },
  callBtn: {
    backgroundColor: '#D32F2F',
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dismissBtn: {
    backgroundColor: 'transparent',
    height: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#3A3A3C',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissBtnText: {
    color: '#E5E5EA',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

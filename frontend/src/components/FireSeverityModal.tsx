import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FireSeverityModalProps {
  visible: boolean;
  onSelectSeverity: (severity: 'LOW' | 'MEDIUM' | 'HIGH') => void;
  onCancel: () => void;
}

export default function FireSeverityModal({
  visible,
  onSelectSeverity,
  onCancel,
}: FireSeverityModalProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom || 24 }]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>🔥 FIRE EMERGENCY</Text>
              <Text style={styles.subtitle}>Select Fire Severity</Text>
            </View>

            {/* Severity Cards */}
            <View style={styles.cardsContainer}>
              <TouchableOpacity
                style={[styles.card, styles.lowCard]}
                activeOpacity={0.8}
                onPress={() => onSelectSeverity('LOW')}
              >
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="circle" size={20} color="#FFCC00" />
                  <Text style={[styles.cardTitle, { color: '#FFCC00' }]}>LOW</Text>
                </View>
                <Text style={styles.cardDesc}>Small Fire</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.card, styles.mediumCard]}
                activeOpacity={0.8}
                onPress={() => onSelectSeverity('MEDIUM')}
              >
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="circle" size={20} color="#FF9500" />
                  <Text style={[styles.cardTitle, { color: '#FF9500' }]}>MEDIUM</Text>
                </View>
                <Text style={styles.cardDesc}>Spreading Fire</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.card, styles.highCard]}
                activeOpacity={0.8}
                onPress={() => onSelectSeverity('HIGH')}
              >
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="circle" size={20} color="#FF3B30" />
                  <Text style={[styles.cardTitle, { color: '#FF3B30' }]}>HIGH</Text>
                </View>
                <Text style={styles.cardDesc}>Major Fire</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Actions */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelBtn}
                activeOpacity={0.8}
                onPress={onCancel}
              >
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 6,
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 28,
  },
  card: {
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  lowCard: {
    borderColor: 'rgba(255, 204, 0, 0.3)',
  },
  mediumCard: {
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  highCard: {
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cardDesc: {
    color: '#E5E5EA',
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    width: '100%',
  },
  cancelBtn: {
    backgroundColor: '#2C2C2E',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#3A3A3C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#E5E5EA',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

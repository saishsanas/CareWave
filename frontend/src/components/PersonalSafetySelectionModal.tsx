import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface PersonalSafetySelectionModalProps {
  visible: boolean;
  onSelectType: (type: 'WOMEN' | 'CHILD') => void;
  onCancel: () => void;
}

export default function PersonalSafetySelectionModal({
  visible,
  onSelectType,
  onCancel,
}: PersonalSafetySelectionModalProps) {
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
              <Text style={styles.title}>🛡 PERSONAL SAFETY</Text>
              <Text style={styles.subtitle}>Select Assistance Type</Text>
            </View>

            {/* Selection Options */}
            <View style={styles.cardsContainer}>
              <TouchableOpacity
                style={[styles.card, styles.womenCard]}
                activeOpacity={0.8}
                onPress={() => onSelectType('WOMEN')}
              >
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="face-woman" size={32} color="#FF69B4" />
                  <Text style={[styles.cardTitle, { color: '#FF69B4' }]}>Women Safety</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#8E8E93" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.card, styles.childCard]}
                activeOpacity={0.8}
                onPress={() => onSelectType('CHILD')}
              >
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons name="baby-face-outline" size={32} color="#4AD2FF" />
                  <Text style={[styles.cardTitle, { color: '#4AD2FF' }]}>Child Safety</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
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
  womenCard: {
    borderColor: 'rgba(255, 105, 180, 0.25)',
  },
  childCard: {
    borderColor: 'rgba(74, 210, 255, 0.25)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
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

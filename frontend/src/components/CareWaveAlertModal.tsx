import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export type AlertModalType = 'SUCCESS' | 'ERROR' | 'VALIDATION' | 'DELETE_CONFIRMATION';

interface CareWaveAlertModalProps {
  visible: boolean;
  type: AlertModalType;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
  okButtonColor?: string;
}

export default function CareWaveAlertModal({
  visible,
  type,
  title,
  message,
  onClose,
  onConfirm,
  okButtonColor,
}: CareWaveAlertModalProps) {
  const isConfirmType = type === 'DELETE_CONFIRMATION';

  const getIcon = () => {
    switch (type) {
      case 'SUCCESS':
        return <MaterialCommunityIcons name="check-circle" size={48} color="#34C759" />;
      case 'ERROR':
        return <MaterialCommunityIcons name="alert-circle" size={48} color="#FF3B30" />;
      case 'VALIDATION':
        return <MaterialCommunityIcons name="alert" size={48} color="#FFD60A" />;
      case 'DELETE_CONFIRMATION':
        return <Feather name="trash-2" size={48} color="#FF3B30" />;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            {getIcon()}
          </View>
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonContainer}>
            {isConfirmType ? (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.confirmButton]}
                  onPress={() => {
                    if (onConfirm) onConfirm();
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmButtonText}>Remove</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.okButton, okButtonColor ? { backgroundColor: okButtonColor } : null]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.okButtonText}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1.5,
    borderColor: '#2C2C2E',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  okButton: {
    backgroundColor: '#D32F2F',
  },
  okButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#3A3A3C',
  },
  cancelButtonText: {
    color: '#E5E5EA',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmButton: {
    backgroundColor: '#D32F2F',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});

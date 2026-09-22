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

interface PersonalSafetyActiveModalProps {
  visible: boolean;
  selectedSafetyType: 'WOMEN' | 'CHILD' | null;
  onClose: () => void;
  onNavigateToContacts?: () => void;
}

export default function PersonalSafetyActiveModal({
  visible,
  selectedSafetyType,
  onClose,
  onNavigateToContacts,
}: PersonalSafetyActiveModalProps) {
  const insets = useSafeAreaInsets();
  const isWomen = selectedSafetyType === 'WOMEN';

  const title = isWomen ? '🛡 WOMEN SAFETY ALERT ACTIVE' : '🛡 CHILD SAFETY ALERT ACTIVE';
  const headerTitle = isWomen ? 'WOMEN SAFETY' : 'CHILD SAFETY';
  const subtitle = isWomen ? 'Women Safety Alert Active' : 'Child Safety Alert Active';
  const callBtnText = isWomen ? 'CALL WOMEN HELPLINE (1091)' : 'CALL CHILD HELPLINE (1098)';
  const phoneNumber = isWomen ? '1091' : '1098';
  const themeColor = isWomen ? '#FF69B4' : '#4AD2FF';
  const iconName = isWomen ? 'face-woman' : 'baby-face-outline';

  const handleCallHelpline = () => {
    Linking.openURL(`tel:${phoneNumber}`).catch((err) => console.error('Error opening dialer:', err));
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
          <Text style={styles.headerTitle}>{headerTitle}</Text>
        </View>

        {/* Content wrapping with ScrollView to fix layout bug */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.iconContainer, { borderColor: `${themeColor}40`, backgroundColor: `${themeColor}15` }]}>
            <MaterialCommunityIcons name={iconName} size={80} color={themeColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </ScrollView>

        {/* Action Buttons */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCallHelpline}
            style={[styles.callBtn, { backgroundColor: themeColor }]}
          >
            <MaterialCommunityIcons name="phone" size={24} color="#FFFFFF" />
            <Text style={styles.callBtnText}>{callBtnText}</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 10,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 20,
    backgroundColor: '#1C1C1E',
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    gap: 12,
  },
  callBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000000',
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
    height: 52,
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

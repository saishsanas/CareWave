import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Linking,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getContacts, EmergencyContact } from '../services/emergencyContactService';

interface GeneralEmergencyActiveModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function GeneralEmergencyActiveModal({
  visible,
  onClose,
}: GeneralEmergencyActiveModalProps) {
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchContacts();
    }
  }, [visible]);

  const fetchContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getContacts();
      setContacts(data);
    } catch (err: any) {
      console.error('[GeneralEmergencyActiveModal] Error loading contacts:', err);
      setError('Failed to load emergency contacts. Tap to retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleCallContact = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`).catch((err) =>
      console.error('Error opening dialer:', err)
    );
  };

  const notifiedCount = contacts.filter((c) => c.linkedToRegisteredUser).length;
  const phoneCount = contacts.filter((c) => !c.linkedToRegisteredUser).length;

  const notifiedText = notifiedCount === 1 ? '1 Contact Notified' : `${notifiedCount} Contacts Notified`;
  const phoneText = phoneCount === 1 ? '1 Phone Contact Available' : `${phoneCount} Phone Contacts Available`;

  const renderContactItem = ({ item }: { item: EmergencyContact }) => {
    const isRegistered = item.linkedToRegisteredUser;
    const relationFormatted = item.relation
      ? item.relation.charAt(0).toUpperCase() + item.relation.slice(1).toLowerCase()
      : '';

    return (
      <View style={[styles.contactCard, isRegistered ? styles.contactCardNotified : styles.contactCardPhoneOnly]}>
        <View style={styles.contactInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.contactName}>{item.fullName}</Text>
            {relationFormatted ? (
              <View style={styles.relationBadge}>
                <Text style={styles.relationBadgeText}>{relationFormatted}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.contactPhone}>{item.contactNumber}</Text>
          <View style={styles.statusRow}>
            <Text style={[styles.statusText, isRegistered ? styles.statusRegistered : styles.statusExternal]}>
              {isRegistered ? '🟢 Receives CareWave Alerts' : '⚪ Phone Contact Only'}
            </Text>
            <Text style={styles.statusHelperText}>
              {isRegistered
                ? 'Will receive notifications and live tracking updates.'
                : 'Available for direct calling but does not receive app alerts.'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.callContactBtn}
          activeOpacity={0.8}
          onPress={() => handleCallContact(item.contactNumber)}
        >
          <MaterialCommunityIcons name="phone" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Main Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🚨 EMERGENCY CONTACTS</Text>
          <Text style={styles.headerSubtitle}>
            Review who received this alert and who can be contacted by phone.
          </Text>
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          {!loading && !error && contacts.length > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Alert Status</Text>
              <View style={styles.summaryRow}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#30D158" />
                <Text style={styles.summaryText}>{notifiedText}</Text>
              </View>
              <View style={styles.summaryRow}>
                <MaterialCommunityIcons name="phone" size={16} color="#8E8E93" />
                <Text style={styles.summaryText}>{phoneText}</Text>
              </View>
            </View>
          )}

          {loading ? (
            <View style={styles.spinnerWrapper}>
              <ActivityIndicator size="large" color="#FF3B30" />
            </View>
          ) : error ? (
            <TouchableOpacity style={styles.errorContainer} onPress={fetchContacts} activeOpacity={0.7}>
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#FF3B30" style={{ marginBottom: 12 }} />
              <Text style={styles.errorText}>{error}</Text>
            </TouchableOpacity>
          ) : contacts.length === 0 ? (
            /* Empty State */
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <MaterialCommunityIcons name="account-multiple-remove-outline" size={64} color="#8E8E93" />
              </View>
              <Text style={styles.emptyTextTitle}>No emergency contacts available.</Text>
            </View>
          ) : (
            /* Contacts List */
            <FlatList
              data={contacts}
              keyExtractor={(item) => item.contactId}
              renderItem={renderContactItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Bottom Actions */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onClose}
            style={styles.dismissBtn}
          >
            <Text style={styles.dismissBtnText}>DISMISS</Text>
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
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  summaryCard: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1.5,
    borderColor: '#2C2C2E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  summaryText: {
    fontSize: 13,
    color: '#E5E5EA',
    fontWeight: '600',
  },
  spinnerWrapper: {
    flex: 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyState: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(142, 142, 147, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(142, 142, 147, 0.25)',
  },
  emptyTextTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  listContainer: {
    gap: 12,
    paddingBottom: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
  },
  contactCardNotified: {
    borderColor: 'rgba(52, 199, 89, 0.4)',
    borderWidth: 1.5,
  },
  contactCardPhoneOnly: {
    borderColor: '#2C2C2E',
    borderWidth: 1.5,
  },
  contactInfo: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  relationBadge: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.25)',
  },
  relationBadgeText: {
    color: '#FF3B30',
    fontSize: 10,
    fontWeight: '700',
  },
  contactPhone: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  statusRow: {
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusHelperText: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
    fontWeight: '400',
    lineHeight: 15,
  },
  statusRegistered: {
    color: '#30D158',
  },
  statusExternal: {
    color: '#8E8E93',
  },
  callContactBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 20,
    backgroundColor: '#1C1C1E',
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  dismissBtn: {
    backgroundColor: 'transparent',
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#3A3A3C',
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

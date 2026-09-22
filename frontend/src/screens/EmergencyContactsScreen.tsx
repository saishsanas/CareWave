import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Linking,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getContacts,
  createContact,
  deleteContact,
  EmergencyContact,
} from '../services/emergencyContactService';
import CareWaveAlertModal, { AlertModalType } from '../components/CareWaveAlertModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface EmergencyContactsScreenProps {
  onNavigateBack: () => void;
}

export default function EmergencyContactsScreen({ onNavigateBack }: EmergencyContactsScreenProps) {
  const insets = useSafeAreaInsets();

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [relation, setRelation] = useState('');
  const [showRelationSelector, setShowRelationSelector] = useState(false);

  // Reusable CareWave Alert Modal state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<AlertModalType>('VALIDATION');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [onAlertConfirm, setOnAlertConfirm] = useState<(() => void) | undefined>(undefined);

  const relationsList = [
    'Mother',
    'Father',
    'Child',
    'Brother',
    'Sister',
    'Spouse',
    'Guardian',
    'Friend',
    'Other',
  ];

  useEffect(() => {
    fetchContactsData();
  }, []);

  const showAlert = (type: AlertModalType, title: string, message: string, onConfirm?: () => void) => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setOnAlertConfirm(() => onConfirm);
    setAlertVisible(true);
  };

  const fetchContactsData = async () => {
    setLoading(true);
    try {
      const data = await getContacts();
      setContacts(data);
    } catch (error: any) {
      console.error('[EmergencyContactsScreen] Error fetching contacts:', error);
      showAlert('ERROR', 'Error', 'Failed to retrieve emergency contacts.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 10) {
      setPhoneNumber(cleaned);
    }
  };

  const handleAddContact = async () => {
    if (!fullName.trim()) {
      showAlert('VALIDATION', 'Validation Error', 'Full Name is required.');
      return;
    }
    if (!phoneNumber.trim()) {
      showAlert('VALIDATION', 'Validation Error', 'Phone Number is required.');
      return;
    }

    // Strict frontend 10-digit validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      showAlert('VALIDATION', 'Validation Error', 'Enter a valid 10-digit mobile number.');
      return;
    }

    if (!relation) {
      showAlert('VALIDATION', 'Validation Error', 'Relation is required.');
      return;
    }

    setSubmitting(true);
    try {
      await createContact(fullName.trim(), phoneNumber.trim(), relation.toUpperCase());
      showAlert('SUCCESS', 'Success', 'Emergency contact added successfully.');
      setFullName('');
      setPhoneNumber('');
      setRelation('');
      await fetchContactsData();
    } catch (error: any) {
      console.error('[EmergencyContactsScreen] Error adding contact:', error);
      showAlert('ERROR', 'Failed to Add Contact', error.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContact = (contactId: string, name: string) => {
    showAlert(
      'DELETE_CONFIRMATION',
      'Remove Contact?',
      `Are you sure you want to remove "${name}" from your trusted emergency contacts?`,
      async () => {
        setDeletingId(contactId);
        try {
          await deleteContact(contactId);
          showAlert('SUCCESS', 'Success', 'Contact removed successfully.');
          await fetchContactsData();
        } catch (error: any) {
          console.error('[EmergencyContactsScreen] Error deleting contact:', error);
          showAlert('ERROR', 'Error', 'Failed to delete contact.');
        } finally {
          setDeletingId(null);
        }
      }
    );
  };

  const handleCallContact = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch((err) => {
      console.error('[EmergencyContactsScreen] Dialer error:', err);
      showAlert('ERROR', 'Error', 'Could not open the phone dialer.');
    });
  };

  const isFormValid =
    fullName.trim().length > 0 &&
    phoneNumber.trim().length > 0 &&
    relation.length > 0 &&
    !submitting;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onNavigateBack}
          style={styles.backBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Emergency Contacts</Text>
          <Text style={styles.headerSubtitle}>Manage trusted people</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Add Contact Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Add Trusted Contact</Text>

          {/* Full Name */}
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            style={styles.textInput}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter full name"
            placeholderTextColor="#8E8E93"
            autoCorrect={false}
          />

          {/* Phone Number */}
          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            style={styles.textInput}
            value={phoneNumber}
            onChangeText={handlePhoneChange}
            placeholder="e.g. 9876543210"
            placeholderTextColor="#8E8E93"
            keyboardType="phone-pad"
            maxLength={10}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Relation Selector */}
          <Text style={styles.inputLabel}>Relation</Text>
          <TouchableOpacity
            style={styles.selectorCard}
            activeOpacity={0.8}
            onPress={() => setShowRelationSelector(true)}
          >
            <View style={styles.selectorLeft}>
              <MaterialCommunityIcons
                name="account-multiple"
                size={20}
                color="#FF3B30"
                style={styles.iconMargin}
              />
              <Text style={relation ? styles.selectedText : styles.placeholderText}>
                {relation || 'Select Relation'}
              </Text>
            </View>
            <Feather name="chevron-down" size={20} color="#8E8E93" />
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, !isFormValid && styles.submitBtnDisabled]}
            activeOpacity={0.85}
            onPress={handleAddContact}
            disabled={!isFormValid}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Add Contact</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Trusted Contacts List Section */}
        <Text style={styles.sectionTitle}>Trusted Contacts</Text>

        {loading ? (
          <View style={styles.spinnerWrapper}>
            <ActivityIndicator size="large" color="#FF3B30" />
          </View>
        ) : contacts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="users" size={44} color="#3A3A3C" />
            <Text style={styles.emptyText}>No emergency contacts added yet.</Text>
          </View>
        ) : (
          <View style={styles.contactsList}>
            {contacts.map((contact) => {
              const isDeleting = deletingId === contact.contactId;
              const isRegistered = contact.linkedToRegisteredUser;

              return (
                <View key={contact.contactId} style={styles.contactCard}>
                  {/* Left Section: Info */}
                  <View style={styles.contactCardInfo}>
                    <View style={styles.nameRow}>
                      <Text
                        style={styles.contactCardTitle}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {contact.fullName}
                      </Text>
                      {/* Relation Badge */}
                      <View style={styles.relationBadge}>
                        <Text style={styles.relationBadgeText}>
                          {contact.relation.charAt(0) + contact.relation.slice(1).toLowerCase()}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={styles.contactNumberText}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {contact.contactNumber}
                    </Text>

                    {/* Registration Status Badge */}
                    <View style={styles.badgeContainer}>
                      <View style={[styles.statusBadge, isRegistered ? styles.statusBadgeRegistered : styles.statusBadgeExternal]}>
                        <View style={[styles.statusDot, isRegistered ? styles.statusDotRegistered : styles.statusDotExternal]} />
                        <Text style={[styles.statusText, isRegistered ? styles.statusTextRegistered : styles.statusTextExternal]}>
                          {isRegistered ? 'CareWave User' : 'External Contact'}
                        </Text>
                      </View>

                      {/* GeoFence Badge */}
                      {isRegistered && (
                        <View style={styles.geofenceBadge}>
                          <MaterialCommunityIcons name="map-marker-radius" size={11} color="#FFD60A" style={{ marginRight: 3 }} />
                          <Text style={styles.geofenceBadgeText}>Eligible For GeoFence</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Right Section: Actions */}
                  <View style={styles.actionButtons}>
                    {/* Call Button */}
                    <TouchableOpacity
                      style={styles.callBtn}
                      activeOpacity={0.8}
                      onPress={() => handleCallContact(contact.contactNumber)}
                    >
                      <Feather name="phone" size={18} color="#34C759" />
                    </TouchableOpacity>

                    {/* Delete Button */}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      activeOpacity={0.8}
                      onPress={() => handleDeleteContact(contact.contactId, contact.fullName)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <ActivityIndicator size="small" color="#FF3B30" />
                      ) : (
                        <Feather name="trash-2" size={18} color="#FF3B30" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Relation Bottom Sheet Selector Modal */}
      <Modal
        visible={showRelationSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRelationSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowRelationSelector(false)}
          />
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Relation</Text>
              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => setShowRelationSelector(false)}
              >
                <Feather name="x" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalList} showsVerticalScrollIndicator={false}>
              {relationsList.map((rel) => (
                <TouchableOpacity
                  key={rel}
                  style={styles.relationItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    setRelation(rel);
                    setShowRelationSelector(false);
                  }}
                >
                  <Text style={styles.relationItemText}>{rel}</Text>
                  {relation === rel && (
                    <Feather name="check" size={18} color="#FF3B30" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* CareWave Themed Alert Modal */}
      <CareWaveAlertModal
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
        onConfirm={onAlertConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F11',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '400',
    color: '#8E8E93',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 20,
    padding: 20,
    marginBottom: 26,
  },
  cardHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 18,
    letterSpacing: 0.3,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E5E5EA',
    marginBottom: 8,
    marginTop: 14,
  },
  textInput: {
    height: 50,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#3A3A3C',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  selectorCard: {
    height: 50,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#3A3A3C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconMargin: {
    marginRight: 10,
  },
  placeholderText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    height: 52,
    backgroundColor: '#D32F2F',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#2C2C2E',
    borderColor: '#3A3A3C',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  emptyCard: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  contactsList: {
    gap: 12,
  },
  contactCard: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 110, // Fixed height to prevent UI breakage
  },
  contactCardInfo: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '90%',
  },
  contactCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    maxWidth: '60%',
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
  contactNumberText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 5,
  },
  statusBadgeRegistered: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.25)',
  },
  statusBadgeExternal: {
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.25)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotRegistered: {
    backgroundColor: '#34C759',
  },
  statusDotExternal: {
    backgroundColor: '#8E8E93',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextRegistered: {
    color: '#34C759',
  },
  statusTextExternal: {
    color: '#9E9E93',
  },
  geofenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 214, 10, 0.12)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 10, 0.25)',
  },
  geofenceBadgeText: {
    color: '#FFD60A',
    fontSize: 10,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 10,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerWrapper: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    height: SCREEN_HEIGHT * 0.7, // Occupies roughly 70% of screen height
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
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalList: {
    padding: 20,
  },
  relationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingVertical: 18, // Improved touch target spacing
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  relationItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

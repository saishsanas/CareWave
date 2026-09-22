import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { getSettings, saveSettings, AppSettings } from '../services/storageService';
import {
  getUserProfile,
  updateUserProfile,
  getUserProfileStats,
  UserProfile,
  UserProfileStats
} from '../services/profileService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ProfileScreenProps {
  firstName: string;
  phoneNumber: string;
  onNavigateBack: () => void;
  onSignOut: () => void;
}

type ViewType = 'DASHBOARD' | 'PERSONAL_INFO' | 'MEDICAL_INFO' | 'STATS' | 'SETTINGS' | 'ABOUT';

export default function ProfileScreen({
  firstName: initialFirstName,
  phoneNumber,
  onNavigateBack,
  onSignOut
}: ProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const [currentView, setCurrentView] = useState<ViewType>('DASHBOARD');

  // Backend Profile Data States
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Backend Stats Data States
  const [stats, setStats] = useState<UserProfileStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Local Settings States
  const [settings, setSettings] = useState<AppSettings>({
    notifications: true,
    soundAlerts: true,
    vibrationAlerts: true
  });

  // Edit Forms Temp States
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGender, setEditGender] = useState<'MALE' | 'FEMALE' | null>(null);
  const [editBloodGroup, setEditBloodGroup] = useState<UserProfile['bloodGroup']>(null);

  // Selector Modals Visibility
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [bloodGroupModalVisible, setBloodGroupModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Load Settings immediately
  useEffect(() => {
    loadLocalSettings();
  }, []);

  const loadLocalSettings = async () => {
    try {
      const saved = await getSettings();
      setSettings(saved);
    } catch (err) {
      console.error('[ProfileScreen] Error loading local settings:', err);
    }
  };

  const handleSaveSettings = async (key: keyof AppSettings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings(updated);
  };

  // Background Load profile data (Personal & Medical views call this lazily)
  const fetchProfileData = async () => {
    if (profile) return; // Only fetch if not already loaded in session
    setProfileLoading(true);
    try {
      const data = await getUserProfile();
      setProfile(data);
      // Populate edit states
      setEditFirstName(data.firstName);
      setEditLastName(data.lastName || '');
      setEditEmail(data.email || '');
      setEditGender(data.gender);
      setEditBloodGroup(data.bloodGroup);
    } catch (err) {
      console.error('[ProfileScreen] Error fetching profile:', err);
      Alert.alert('Error', 'Failed to retrieve profile information.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Background Load stats data (Stats view calls this lazily)
  const fetchStatsData = async () => {
    setStatsLoading(true);
    try {
      const data = await getUserProfileStats();
      setStats(data);
    } catch (err) {
      console.error('[ProfileScreen] Error fetching statistics:', err);
      // Graceful fallback to 0 count handled in UI
    } finally {
      setStatsLoading(false);
    }
  };

  // Save changes to profile info
  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      if (!editFirstName.trim()) {
        Alert.alert('Validation Error', 'Full name cannot be empty.');
        setProfileSaving(false);
        return;
      }

      const payload: Partial<UserProfile> = {
        firstName: editFirstName.trim(),
        gender: editGender,
        bloodGroup: editBloodGroup
      };

      const updated = await updateUserProfile(payload);
      setProfile(updated);
      setEditFirstName(updated.firstName);
      setEditGender(updated.gender);
      setEditBloodGroup(updated.bloodGroup);

      Alert.alert(
        'Profile Updated',
        'Your profile has been updated successfully.',
        [{ text: 'OK', onPress: () => setCurrentView('DASHBOARD') }]
      );
    } catch (err: any) {
      console.error('[ProfileScreen] Error saving profile changes:', err);
      Alert.alert('Update Failed', err.message || 'Failed to save changes.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Header and navigation wrappers
  const navigateToView = (view: ViewType) => {
    setCurrentView(view);
    if (view === 'PERSONAL_INFO' || view === 'MEDICAL_INFO') {
      fetchProfileData();
    } else if (view === 'STATS') {
      fetchStatsData();
    }
  };

  // Enum friendly label mappings
  const getGenderLabel = (g: typeof editGender) => {
    if (!g) return 'Select Gender';
    return g === 'MALE' ? 'Male' : 'Female';
  };

  const getBloodGroupLabel = (bg: typeof editBloodGroup) => {
    switch (bg) {
      case 'A_POSITIVE': return 'A+';
      case 'A_NEGATIVE': return 'A-';
      case 'B_POSITIVE': return 'B+';
      case 'B_NEGATIVE': return 'B-';
      case 'AB_POSITIVE': return 'AB+';
      case 'AB_NEGATIVE': return 'AB-';
      case 'O_POSITIVE': return 'O+';
      case 'O_NEGATIVE': return 'O-';
      default: return 'Select Blood Group';
    }
  };

  // Render Dashboard
  const renderDashboard = () => {
    const fullName = profile 
      ? profile.firstName.trim()
      : initialFirstName;

    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Profile summary card */}
        <View style={styles.headerCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{fullName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.headerName}>{fullName}</Text>
          <Text style={styles.headerPhone}>{phoneNumber}</Text>
        </View>

        {/* Menu items */}
        <View style={styles.menuContainer}>
          <TouchableOpacity 
            style={styles.menuItem} 
            activeOpacity={0.8}
            onPress={() => navigateToView('PERSONAL_INFO')}
          >
            <View style={styles.menuIconBox}>
              <Feather name="user" size={20} color="#FF5252" />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuTitle}>Personal Information</Text>
              <Text style={styles.menuSubtitle}>Manage your account details</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            activeOpacity={0.8}
            onPress={() => navigateToView('STATS')}
          >
            <View style={styles.menuIconBox}>
              <Feather name="bar-chart-2" size={20} color="#FF5252" />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuTitle}>Emergency Statistics</Text>
              <Text style={styles.menuSubtitle}>View CareWave activity</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            activeOpacity={0.8}
            onPress={() => navigateToView('SETTINGS')}
          >
            <View style={styles.menuIconBox}>
              <Feather name="settings" size={20} color="#FF5252" />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuTitle}>Settings</Text>
              <Text style={styles.menuSubtitle}>App preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            activeOpacity={0.8}
            onPress={() => navigateToView('ABOUT')}
          >
            <View style={styles.menuIconBox}>
              <Feather name="info" size={20} color="#FF5252" />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuTitle}>About CareWave</Text>
              <Text style={styles.menuSubtitle}>Project information</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* Separated Logout Card */}
        <View style={styles.logoutSection}>
          <TouchableOpacity 
            style={styles.logoutBtn} 
            activeOpacity={0.8}
            onPress={() => setLogoutModalVisible(true)}
          >
            <Feather name="log-out" size={20} color="#FF5252" style={{ marginRight: 8 }} />
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // Render Personal Information Edit screen
  const renderPersonalInfo = () => {
    if (profileLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF5252" />
          <Text style={styles.loadingText}>Fetching profile details...</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.formLabel}>Full Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter full name"
            placeholderTextColor="#8E8E93"
            value={editFirstName}
            onChangeText={setEditFirstName}
          />

          <Text style={[styles.formLabel, { marginTop: 16 }]}>Gender</Text>
          <TouchableOpacity 
            style={styles.dropdownSelector} 
            onPress={() => setGenderModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.dropdownValue, !editGender && styles.dropdownPlaceholder]}>
              {getGenderLabel(editGender)}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#8E8E93" />
          </TouchableOpacity>

          <Text style={[styles.formLabel, { marginTop: 16 }]}>Blood Group</Text>
          <TouchableOpacity 
            style={styles.dropdownSelector} 
            onPress={() => setBloodGroupModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.dropdownValue, !editBloodGroup && styles.dropdownPlaceholder]}>
              {getBloodGroupLabel(editBloodGroup)}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#8E8E93" />
          </TouchableOpacity>

          <Text style={[styles.formLabel, { marginTop: 16 }]}>Email</Text>
          <View style={[styles.textInput, styles.readOnlyInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <Text style={styles.readOnlyText}>{editEmail || 'N/A'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Feather name="lock" size={12} color="#34C759" />
              <Text style={[styles.readOnlyText, { color: '#34C759', fontSize: 12 }]}>Verified</Text>
            </View>
          </View>

          <Text style={[styles.formLabel, { marginTop: 16 }]}>Phone Number</Text>
          <View style={[styles.textInput, styles.readOnlyInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <Text style={styles.readOnlyText}>{phoneNumber}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Feather name="lock" size={12} color="#34C759" />
              <Text style={[styles.readOnlyText, { color: '#34C759', fontSize: 12 }]}>Verified</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.primarySaveBtn} 
          onPress={handleSaveProfile}
          activeOpacity={0.8}
          disabled={profileSaving}
        >
          {profileSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.primarySaveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // Render Medical Information Edit screen
  const renderMedicalInfo = () => {
    if (profileLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF5252" />
          <Text style={styles.loadingText}>Fetching medical details...</Text>
        </View>
      );
    }

    return (
      <View style={styles.subContainer}>
        <View style={styles.card}>
          <Text style={styles.formLabel}>Blood Group</Text>
          <TouchableOpacity 
            style={styles.dropdownSelector} 
            onPress={() => setBloodGroupModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.dropdownValue, !editBloodGroup && styles.dropdownPlaceholder]}>
              {getBloodGroupLabel(editBloodGroup)}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#8E8E93" />
          </TouchableOpacity>
          <Text style={styles.formTip}>This information helps responders identify your blood group during medical emergencies.</Text>
        </View>

        <TouchableOpacity 
          style={styles.primarySaveBtn} 
          onPress={handleSaveProfile}
          activeOpacity={0.8}
          disabled={profileSaving}
        >
          {profileSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.primarySaveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // Render Statistics Dashboard screen
  const renderStats = () => {
    if (statsLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF5252" />
          <Text style={styles.loadingText}>Fetching activity statistics...</Text>
        </View>
      );
    }

    const contactsCount = stats?.emergencyContactsCount ?? 0;
    const zonesCount = stats?.safeZonesCount ?? 0;
    const myAlerts = stats?.alertsCreatedCount ?? 0;
    const monitoringAlerts = stats?.alertsMonitoringCount ?? 0;

    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.statsGrid}>
          <View style={styles.statsCard}>
            <Feather name="users" size={24} color="#FF5252" style={{ marginBottom: 12 }} />
            <Text style={styles.statsNumber}>{contactsCount}</Text>
            <Text style={styles.statsLabel}>Emergency Contacts</Text>
          </View>

          <View style={styles.statsCard}>
            <Feather name="shield" size={24} color="#FF5252" style={{ marginBottom: 12 }} />
            <Text style={styles.statsNumber}>{zonesCount}</Text>
            <Text style={styles.statsLabel}>Safe Zones</Text>
          </View>

          <View style={styles.statsCard}>
            <Feather name="alert-triangle" size={24} color="#FF5252" style={{ marginBottom: 12 }} />
            <Text style={styles.statsNumber}>{myAlerts}</Text>
            <Text style={styles.statsLabel}>My Alerts</Text>
          </View>

          <View style={styles.statsCard}>
            <Feather name="eye" size={24} color="#FF5252" style={{ marginBottom: 12 }} />
            <Text style={styles.statsNumber}>{monitoringAlerts}</Text>
            <Text style={styles.statsLabel}>Monitoring Alerts</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  // Render Settings screen
  const renderSettings = () => {
    return (
      <View style={styles.subContainer}>
        <View style={styles.card}>
          <View style={styles.settingsRow}>
            <View>
              <Text style={styles.settingsTitle}>Notifications</Text>
              <Text style={styles.settingsSubtitle}>Receive status alert notifications</Text>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={(val) => handleSaveSettings('notifications', val)}
              trackColor={{ false: '#2C2C2E', true: 'rgba(255, 82, 82, 0.4)' }}
              thumbColor={settings.notifications ? '#FF5252' : '#8E8E93'}
            />
          </View>

          <View style={[styles.settingsRow, styles.settingsDivider]}>
            <View>
              <Text style={styles.settingsTitle}>Sound Alerts</Text>
              <Text style={styles.settingsSubtitle}>Play alarms on emergency status alerts</Text>
            </View>
            <Switch
              value={settings.soundAlerts}
              onValueChange={(val) => handleSaveSettings('soundAlerts', val)}
              trackColor={{ false: '#2C2C2E', true: 'rgba(255, 82, 82, 0.4)' }}
              thumbColor={settings.soundAlerts ? '#FF5252' : '#8E8E93'}
            />
          </View>

          <View style={[styles.settingsRow, styles.settingsDivider]}>
            <View>
              <Text style={styles.settingsTitle}>Vibration Alerts</Text>
              <Text style={styles.settingsSubtitle}>Trigger vibrations during warning status alerts</Text>
            </View>
            <Switch
              value={settings.vibrationAlerts}
              onValueChange={(val) => handleSaveSettings('vibrationAlerts', val)}
              trackColor={{ false: '#2C2C2E', true: 'rgba(255, 82, 82, 0.4)' }}
              thumbColor={settings.vibrationAlerts ? '#FF5252' : '#8E8E93'}
            />
          </View>
        </View>
      </View>
    );
  };

  // Render About screen
  const renderAbout = () => {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.aboutAppName}>CareWave</Text>
          <Text style={styles.aboutVersion}>Version 1.0</Text>
          
          <Text style={styles.aboutDescription}>
            Emergency Alert System designed to improve personal safety through SOS alerts, geofencing, emergency contacts, live tracking, and emergency resource discovery.
          </Text>

          <View style={styles.aboutSection}>
            <Text style={styles.aboutSectionHeader}>Project Guide</Text>
            <Text style={styles.aboutSectionBody}>Prof. Vidya Rajput</Text>
          </View>

          <View style={styles.aboutSection}>
            <Text style={styles.aboutSectionHeader}>Development Team</Text>
            <Text style={styles.aboutSectionBody}>1.Moin Mankar</Text>
             <Text style={styles.aboutSectionBody}>2.Nakul Siricilla</Text>
              <Text style={styles.aboutSectionBody}>3. Saish Sanas</Text>
               <Text style={styles.aboutSectionBody}>4.Mohd. Shaban Ali</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  // Screen Title header string
  const getScreenTitle = () => {
    switch (currentView) {
      case 'PERSONAL_INFO': return 'PERSONAL INFO';
      case 'MEDICAL_INFO': return 'MEDICAL INFO';
      case 'STATS': return 'STATISTICS';
      case 'SETTINGS': return 'SETTINGS';
      case 'ABOUT': return 'ABOUT CAREWAVE';
      case 'DASHBOARD':
      default:
        return 'PROFILE';
    }
  };

  // Handle back press within the dashboard view stack
  const handleBackPress = () => {
    if (currentView === 'DASHBOARD') {
      onNavigateBack();
    } else {
      setCurrentView('DASHBOARD');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getScreenTitle()}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Body Views switcher */}
      {currentView === 'DASHBOARD' && renderDashboard()}
      {currentView === 'PERSONAL_INFO' && renderPersonalInfo()}
      {currentView === 'MEDICAL_INFO' && renderMedicalInfo()}
      {currentView === 'STATS' && renderStats()}
      {currentView === 'SETTINGS' && renderSettings()}
      {currentView === 'ABOUT' && renderAbout()}

      {/* Gender Dropdown Selection Modal */}
      <Modal
        visible={genderModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setGenderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Gender</Text>
              <TouchableOpacity onPress={() => setGenderModalVisible(false)} style={styles.closeModalBtn}>
                <Feather name="x" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => { setEditGender('MALE'); setGenderModalVisible(false); }}
            >
              <Text style={[styles.modalOptionText, editGender === 'MALE' && styles.modalOptionTextSelected]}>Male</Text>
              {editGender === 'MALE' && <Ionicons name="checkmark" size={20} color="#FF5252" />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalOption, styles.modalDivider]}
              onPress={() => { setEditGender('FEMALE'); setGenderModalVisible(false); }}
            >
              <Text style={[styles.modalOptionText, editGender === 'FEMALE' && styles.modalOptionTextSelected]}>Female</Text>
              {editGender === 'FEMALE' && <Ionicons name="checkmark" size={20} color="#FF5252" />}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Blood Group Dropdown Selection Modal */}
      <Modal
        visible={bloodGroupModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setBloodGroupModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Blood Group</Text>
              <TouchableOpacity onPress={() => setBloodGroupModalVisible(false)} style={styles.closeModalBtn}>
                <Feather name="x" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            
            <ScrollView contentContainerStyle={{ gap: 4 }}>
              {[
                { val: 'A_POSITIVE', name: 'A+' },
                { val: 'A_NEGATIVE', name: 'A-' },
                { val: 'B_POSITIVE', name: 'B+' },
                { val: 'B_NEGATIVE', name: 'B-' },
                { val: 'AB_POSITIVE', name: 'AB+' },
                { val: 'AB_NEGATIVE', name: 'AB-' },
                { val: 'O_POSITIVE', name: 'O+' },
                { val: 'O_NEGATIVE', name: 'O-' }
              ].map((bg, index) => (
                <TouchableOpacity 
                  key={bg.val}
                  style={[styles.modalOption, index > 0 && styles.modalDivider]}
                  onPress={() => { setEditBloodGroup(bg.val as any); setBloodGroupModalVisible(false); }}
                >
                  <Text style={[styles.modalOptionText, editBloodGroup === bg.val && styles.modalOptionTextSelected]}>
                    {bg.name}
                  </Text>
                  {editBloodGroup === bg.val && <Ionicons name="checkmark" size={20} color="#FF5252" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={logoutModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Ionicons name="log-out" size={40} color="#FF5252" style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={styles.confirmModalTitle}>Confirm Logout</Text>
            <Text style={styles.confirmModalDesc}>Are you sure you want to logout of your CareWave session?</Text>
            
            <View style={styles.confirmActionRow}>
              <TouchableOpacity 
                style={styles.confirmCancelBtn} 
                onPress={() => setLogoutModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.confirmLogoutBtn} 
                onPress={() => { setLogoutModalVisible(false); onSignOut(); }}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmLogoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F11',
  },
  subContainer: {
    flex: 1,
    padding: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    backgroundColor: '#1C1C1E',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#FFFFFF',
  },
  headerCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF5252',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  headerName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerPhone: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  menuContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextBox: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E93',
  },
  logoutSection: {
    marginTop: 24,
  },
  logoutBtn: {
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#FF5252',
    fontSize: 14,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8E8E93',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: '#0F0F11',
    borderWidth: 1.2,
    borderColor: '#2C2C2E',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  dropdownSelector: {
    flexDirection: 'row',
    backgroundColor: '#0F0F11',
    borderWidth: 1.2,
    borderColor: '#2C2C2E',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  dropdownPlaceholder: {
    color: '#8E8E93',
  },
  readOnlyInput: {
    justifyContent: 'center',
    backgroundColor: '#1A1A1D',
  },
  readOnlyText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '700',
  },
  formTip: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
    lineHeight: 16,
    marginTop: 12,
  },
  primarySaveBtn: {
    backgroundColor: '#FF5252',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  primarySaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statsCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    padding: 16,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    textAlign: 'center',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  settingsDivider: {
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  settingsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  settingsSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8E8E93',
  },
  aboutAppName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  aboutVersion: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF5252',
    textAlign: 'center',
    marginBottom: 16,
  },
  aboutDescription: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  aboutSection: {
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    paddingVertical: 16,
  },
  aboutSectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  aboutSectionBody: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#2C2C2E',
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  confirmModalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#2C2C2E',
    padding: 24,
    alignItems: 'stretch',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  modalDivider: {
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  modalOptionText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOptionTextSelected: {
    color: '#FFFFFF',
  },
  confirmModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmModalDesc: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    fontWeight: '500',
  },
  confirmActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmCancelText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '800',
  },
  confirmLogoutBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#D32F2F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmLogoutText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import {
  getContacts,
  getSafeZones,
  createSafeZone,
  deleteSafeZone,
  EmergencyContact,
  SafeZone,
} from '../services/safeZoneService';
import { startGeofenceMonitoring, stopGeofenceMonitoring } from '../services/geofenceMonitoringService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface GeoFenceScreenProps {
  onNavigateBack: () => void;
}

export default function GeoFenceScreen({ onNavigateBack }: GeoFenceScreenProps) {
  const insets = useSafeAreaInsets();

  // API Lists
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);

  // Loading States
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);
  const [submittingZone, setSubmittingZone] = useState(false);
  const [deletingZoneId, setDeletingZoneId] = useState<string | null>(null);

  // Form State
  const [selectedContact, setSelectedContact] = useState<EmergencyContact | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [radiusMeters, setRadiusMeters] = useState<number>(500);
  const [centerLatitude, setCenterLatitude] = useState<number | null>(null);
  const [centerLongitude, setCenterLongitude] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');

  // UI State
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [mapSelectorVisible, setMapSelectorVisible] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [tempLatitude, setTempLatitude] = useState<number | null>(null);
  const [tempLongitude, setTempLongitude] = useState<number | null>(null);
  const [locationType, setLocationType] = useState<'CURRENT' | 'MAP' | null>(null);

  // Load initial data
  useEffect(() => {
    fetchContactsData();
    fetchSafeZonesData();
  }, []);

  const fetchContactsData = async () => {
    setLoadingContacts(true);
    try {
      const allContacts = await getContacts();
      // Filter contacts who have linkedUserId != null and linkedToRegisteredUser == true
      const filtered = allContacts.filter(
        (c) => c.linkedUserId !== null && c.linkedToRegisteredUser === true
      );
      setContacts(filtered);
    } catch (error: any) {
      console.error('[GeoFenceScreen] Error fetching contacts:', error);
      Alert.alert('Error', 'Failed to retrieve emergency contacts. Please check your connection.');
    } finally {
      setLoadingContacts(false);
    }
  };

  const fetchSafeZonesData = async () => {
    setLoadingZones(true);
    try {
      const zones = await getSafeZones();
      setSafeZones(zones);
    } catch (error: any) {
      console.error('[GeoFenceScreen] Error fetching safe zones:', error);
      Alert.alert('Error', 'Failed to retrieve safe zones.');
    } finally {
      setLoadingZones(false);
    }
  };

  const formatName = (name: string | null | undefined): string => {
    if (!name) return 'Protected User';
    const clean = name.replace(/\s+null$/i, '').replace(/^null\s+/i, '').trim();
    return clean === 'null' ? '' : clean;
  };

  const handleOpenMapSelector = async () => {
    setMapLoading(true);
    setMapSelectorVisible(true);
    setTempLatitude(null);
    setTempLongitude(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setMapCenter({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } else {
        setMapCenter({ latitude: 18.5204, longitude: 73.8567 }); // Default Pune center
      }
    } catch (error: any) {
      console.error('[GeoFenceScreen] Location fetch for map center failed:', error);
      try {
        const lastKnown = await Location.getLastKnownPositionAsync({});
        if (lastKnown) {
          setMapCenter({
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          });
        } else {
          setMapCenter({ latitude: 18.5204, longitude: 73.8567 });
        }
      } catch {
        setMapCenter({ latitude: 18.5204, longitude: 73.8567 });
      }
    } finally {
      setMapLoading(false);
    }
  };

  const handleMapMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.event === 'LOCATION_SELECT') {
        setTempLatitude(message.data.latitude);
        setTempLongitude(message.data.longitude);
      }
    } catch (error: any) {
      console.error('[GeoFenceScreen] Error parsing map select message:', error);
    }
  };

  const mapHtmlContent = React.useMemo(() => {
    if (!mapCenter) return '';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map {
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
            background-color: #0F0F11;
          }
          .custom-selection-marker {
            background: none !important;
            border: none !important;
            filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.35));
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', {
            zoomControl: true,
            attributionControl: false
          }).setView([${mapCenter.latitude}, ${mapCenter.longitude}], 15);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          var selectionMarker = null;

          var selectionIcon = L.divIcon({
            html: '<svg width="28" height="34" viewBox="0 0 28 34" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 0C6.3 0 0 6.3 0 14c0 9.3 12.5 18.5 13.3 19.1.2.1.5.2.7.2s.5-.1.7-.2C15.5 32.5 28 23.3 28 14c0-7.7-6.3-14-14-14z" fill="#FF3B30"/><circle cx="14" cy="14" r="6" fill="#FFFFFF"/></svg>',
            iconSize: [28, 34],
            iconAnchor: [14, 34],
            className: 'custom-selection-marker'
          });

          // Pulse marker for initial user location
          var userIcon = L.divIcon({
            html: '<div style="width: 14px; height: 14px; background-color: #0A84FF; border: 2.5px solid #FFFFFF; border-radius: 50%; box-shadow: 0 0 8px rgba(10, 132, 255, 0.8);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            className: 'custom-selection-marker'
          });
          L.marker([${mapCenter.latitude}, ${mapCenter.longitude}], { icon: userIcon }).addTo(map);

          map.on('click', function(e) {
            var lat = e.latlng.lat;
            var lng = e.latlng.lng;
            
            if (selectionMarker) {
              selectionMarker.setLatLng(e.latlng);
            } else {
              selectionMarker = L.marker(e.latlng, { icon: selectionIcon }).addTo(map);
            }
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              event: 'LOCATION_SELECT',
              data: { latitude: lat, longitude: lng }
            }));
          });
        </script>
      </body>
      </html>
    `;
  }, [mapCenter]);

  const handleGetCurrentLocation = async () => {
    setLocationStatus('fetching');
    setLocationType('CURRENT');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('error');
        setLocationType(null);
        Alert.alert(
          'Permission Denied',
          'CareWave requires location access to set up the safe zone center.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCenterLatitude(location.coords.latitude);
      setCenterLongitude(location.coords.longitude);
      setLocationStatus('success');
    } catch (error: any) {
      console.error('[GeoFenceScreen] Location fetch failed:', error);
      setLocationStatus('error');
      setLocationType(null);
      Alert.alert('Location Error', 'Unable to retrieve current coordinates. Verify GPS is enabled.');
    }
  };

  const handleCreateSafeZone = async () => {
    if (!selectedContact || !selectedContact.linkedUserId) {
      Alert.alert('Validation Error', 'Please select a protected user contact.');
      return;
    }
    if (!zoneName.trim()) {
      Alert.alert('Validation Error', 'Please enter a name for this zone.');
      return;
    }
    if (centerLatitude === null || centerLongitude === null) {
      Alert.alert('Validation Error', 'Please acquire center coordinates for the zone.');
      return;
    }

    setSubmittingZone(true);
    try {
      await createSafeZone(
        selectedContact.linkedUserId,
        centerLatitude,
        centerLongitude,
        radiusMeters,
        zoneName.trim()
      );

      Alert.alert('Success', 'Safe Zone created successfully.');
      
      // Clear Form
      setSelectedContact(null);
      setZoneName('');
      setRadiusMeters(500);
      setCenterLatitude(null);
      setCenterLongitude(null);
      setLocationStatus('idle');
      setLocationType(null);

      // Refresh list
      await fetchSafeZonesData();
      startGeofenceMonitoring();
    } catch (error: any) {
      console.error('[GeoFenceScreen] Creation failed:', error);
      Alert.alert('Creation Failed', error.message || 'An error occurred during safe zone setup.');
    } finally {
      setSubmittingZone(false);
    }
  };

  const handleDeleteSafeZone = (zoneId: string, name: string) => {
    Alert.alert(
      'Delete Safe Zone?',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingZoneId(zoneId);
            try {
              await deleteSafeZone(zoneId);
              Alert.alert('Success', 'Safe Zone removed successfully.');
              await fetchSafeZonesData();
              stopGeofenceMonitoring();
              startGeofenceMonitoring();
            } catch (error: any) {
              console.error('[GeoFenceScreen] Deletion failed:', error);
              Alert.alert('Error', 'Failed to delete safe zone.');
            } finally {
              setDeletingZoneId(null);
            }
          },
        },
      ]
    );
  };

  const isFormValid =
    selectedContact !== null &&
    zoneName.trim().length > 0 &&
    centerLatitude !== null &&
    centerLongitude !== null &&
    !submittingZone;

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
          <Text style={styles.headerTitle}>GeoFence Monitoring</Text>
          <Text style={styles.headerSubtitle}>
            Create and manage safe zones for family members.
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Creator Section Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Create Safe Zone</Text>

          {/* Contact Selector */}
          <Text style={styles.inputLabel}>Protected User Selection</Text>
          {loadingContacts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FF3B30" />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.selectorCard}
              activeOpacity={0.8}
              onPress={() => setShowContactSelector(true)}
            >
              <View style={styles.selectorLeft}>
                <Feather name="user" size={20} color="#FF3B30" style={styles.iconMargin} />
                <Text style={selectedContact ? styles.selectedText : styles.placeholderText}>
                  {selectedContact
                    ? `${formatName(selectedContact.fullName)} (${selectedContact.relation})`
                    : 'Select Protected User'}
                </Text>
              </View>
              <Feather name="chevron-down" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}

          {/* Zone Name Input */}
          <Text style={styles.inputLabel}>Zone Name</Text>
          <TextInput
            style={styles.textInput}
            value={zoneName}
            onChangeText={setZoneName}
            placeholder="e.g. Home, School, College, Tuition"
            placeholderTextColor="#8E8E93"
            autoCorrect={false}
          />

          {/* Radius Preset selection */}
          <Text style={styles.inputLabel}>Radius Selection</Text>
          <View style={{ gap: 8 }}>
            <View style={styles.chipRow}>
              {[100, 250, 500].map((radius) => {
                const isActive = radiusMeters === radius;
                return (
                  <TouchableOpacity
                    key={radius}
                    style={[styles.chipBtn, isActive && styles.chipBtnActive]}
                    activeOpacity={0.85}
                    onPress={() => setRadiusMeters(radius)}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {radius}m
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.chipRow}>
              {[1000, 2000, 5000].map((radius) => {
                const isActive = radiusMeters === radius;
                return (
                  <TouchableOpacity
                    key={radius}
                    style={[styles.chipBtn, isActive && styles.chipBtnActive]}
                    activeOpacity={0.85}
                    onPress={() => setRadiusMeters(radius)}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {radius}m
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Location Selection */}
          <Text style={styles.inputLabel}>Location Selection</Text>
          <View style={{ gap: 8 }}>
            <TouchableOpacity
              style={[
                styles.locationBtn,
                locationStatus === 'success' && locationType === 'CURRENT' && styles.locationBtnSuccess,
              ]}
              activeOpacity={0.8}
              onPress={handleGetCurrentLocation}
              disabled={locationStatus === 'fetching'}
            >
              {locationStatus === 'fetching' && locationType === 'CURRENT' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : locationStatus === 'success' && locationType === 'CURRENT' ? (
                <>
                  <Feather name="check" size={20} color="#FFFFFF" style={styles.iconMargin} />
                  <Text style={styles.locationBtnText}>Current Location Selected ✓</Text>
                </>
              ) : (
                <>
                  <Feather name="map-pin" size={20} color="#FFFFFF" style={styles.iconMargin} />
                  <Text style={styles.locationBtnText}>Use Current Location</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={{ color: '#8E8E93', fontSize: 11, fontWeight: '800', textAlign: 'center', marginVertical: 2 }}>OR</Text>

            <TouchableOpacity
              style={[
                styles.locationBtn,
                { backgroundColor: '#0A84FF' },
                locationStatus === 'success' && locationType === 'MAP' && styles.locationBtnSuccess,
              ]}
              activeOpacity={0.8}
              onPress={handleOpenMapSelector}
              disabled={locationStatus === 'fetching'}
            >
              {locationStatus === 'fetching' && locationType === 'MAP' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : locationStatus === 'success' && locationType === 'MAP' ? (
                <>
                  <Feather name="check" size={20} color="#FFFFFF" style={styles.iconMargin} />
                  <Text style={styles.locationBtnText}>✓ Custom Location Selected</Text>
                </>
              ) : (
                <>
                  <Feather name="map" size={20} color="#FFFFFF" style={styles.iconMargin} />
                  <Text style={styles.locationBtnText}>Pick Location on Map</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          {locationStatus === 'success' && centerLatitude && centerLongitude && (
            <Text style={styles.coordinatesText}>
              Coordinates: {centerLatitude.toFixed(5)}, {centerLongitude.toFixed(5)}
            </Text>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, !isFormValid && styles.submitBtnDisabled]}
            activeOpacity={0.85}
            onPress={handleCreateSafeZone}
            disabled={!isFormValid}
          >
            {submittingZone ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Create Safe Zone</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Existing Safe Zones Section */}
        <Text style={styles.sectionTitle}>Existing Zones</Text>

        {loadingZones ? (
          <View style={styles.spinnerWrapper}>
            <ActivityIndicator size="large" color="#FF3B30" />
          </View>
        ) : safeZones.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons
              name="map-marker-radius"
              size={44}
              color="#3A3A3C"
            />
            <Text style={styles.emptyText}>No safe zones created yet.</Text>
          </View>
        ) : (
          <View style={styles.zonesList}>
            {safeZones.map((zone) => {
              const isDeleting = deletingZoneId === zone.safeZoneId;
              return (
                <View key={zone.safeZoneId} style={styles.zoneCard}>
                  <View style={styles.zoneCardInfo}>
                    <Text style={styles.zoneCardTitle}>{zone.zoneName}</Text>
                    <View style={styles.zoneDetailsRow}>
                      <Feather name="user" size={13} color="#8E8E93" />
                      <Text style={styles.zoneDetailText}>
                        {formatName(zone.protectedUserName)}
                      </Text>
                    </View>
                    <View style={styles.zoneDetailsRow}>
                      <MaterialCommunityIcons name="radius-outline" size={13} color="#8E8E93" />
                      <Text style={styles.zoneDetailText}>{zone.radiusMeters}m radius</Text>
                    </View>
                    <View style={styles.badgeRow}>
                      <View style={styles.activeBadge}>
                        <View style={styles.activeBadgeDot} />
                        <Text style={styles.activeBadgeText}>
                          {zone.active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    activeOpacity={0.8}
                    onPress={() => handleDeleteSafeZone(zone.safeZoneId, zone.zoneName)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#FF3B30" />
                    ) : (
                      <Feather name="trash-2" size={20} color="#FF3B30" />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Contacts Bottom Sheet Selector Modal */}
      <Modal
        visible={showContactSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowContactSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowContactSelector(false)}
          />
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Protected User</Text>
              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => setShowContactSelector(false)}
              >
                <Feather name="x" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {contacts.length === 0 ? (
              <View style={styles.modalEmptyState}>
                <Feather name="users" size={40} color="#3A3A3C" style={{ marginBottom: 12 }} />
                <Text style={styles.modalEmptyText}>
                  No registered emergency contacts available.
                </Text>
              </View>
            ) : (
              <FlatList
                data={contacts}
                keyExtractor={(item) => item.contactId}
                contentContainerStyle={styles.modalList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.contactItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedContact(item);
                      setShowContactSelector(false);
                    }}
                  >
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactAvatarText}>
                        {formatName(item.fullName).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{formatName(item.fullName)}</Text>
                      <Text style={styles.contactRelation}>{item.relation}</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color="#8E8E93" />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Fullscreen Map Selector Modal */}
      <Modal
        visible={mapSelectorVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setMapSelectorVisible(false)}
      >
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setMapSelectorVisible(false)}
              style={styles.backBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Pick Location on Map</Text>
              <Text style={styles.headerSubtitle}>
                Tap on the map to set the safe zone center coordinates.
              </Text>
            </View>
          </View>

          {/* Map WebView */}
          <View style={styles.content}>
            {mapCenter && !mapLoading && (
              <WebView
                style={styles.map}
                source={{ html: mapHtmlContent }}
                originWhitelist={['*']}
                domStorageEnabled={true}
                javaScriptEnabled={true}
                onMessage={handleMapMessage}
              />
            )}
            {mapLoading && (
              <View style={[StyleSheet.absoluteFillObject, styles.center, { backgroundColor: '#0F0F11' }]}>
                <ActivityIndicator size="large" color="#FF3B30" />
                <Text style={styles.loadingText}>Fetching map center...</Text>
              </View>
            )}
          </View>

          {/* Confirm Coordinates bottom overlay */}
          {tempLatitude && tempLongitude ? (
            <View style={styles.confirmBottomCard}>
              <Text style={styles.confirmCoordsText}>
                Coordinates: {tempLatitude.toFixed(5)}, {tempLongitude.toFixed(5)}
              </Text>
              <TouchableOpacity
                style={styles.confirmBtn}
                activeOpacity={0.8}
                onPress={() => {
                  setCenterLatitude(tempLatitude);
                  setCenterLongitude(tempLongitude);
                  setLocationStatus('success');
                  setLocationType('MAP');
                  setMapSelectorVisible(false);
                }}
              >
                <Text style={styles.confirmBtnText}>Confirm Location</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.confirmBottomCard}>
              <Text style={styles.mapTipText}>
                Tap anywhere on the map to place a center marker
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
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
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  chipBtn: {
    flex: 1,
    height: 40,
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#3A3A3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBtnActive: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  locationBtn: {
    height: 50,
    backgroundColor: '#D32F2F',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  locationBtnSuccess: {
    backgroundColor: '#34C759',
    shadowColor: '#34C759',
  },
  locationBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  coordinatesText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
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
  zonesList: {
    gap: 12,
  },
  zoneCard: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  zoneCardInfo: {
    flex: 1,
    gap: 6,
  },
  zoneCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  zoneDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoneDetailText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 6,
  },
  activeBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  activeBadgeText: {
    color: '#34C759',
    fontSize: 10,
    fontWeight: '700',
  },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  spinnerWrapper: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    height: 50,
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
    maxHeight: SCREEN_HEIGHT * 0.6,
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
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  contactAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '800',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contactRelation: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 2,
  },
  modalEmptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmptyText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  confirmBottomCard: {
    backgroundColor: '#1C1C1E',
    borderTopWidth: 1.5,
    borderTopColor: '#2C2C2E',
    padding: 20,
    alignItems: 'stretch',
    gap: 12,
  },
  confirmCoordsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  mapTipText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 10,
  },
  confirmBtn: {
    height: 50,
    backgroundColor: '#D32F2F',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F11',
    padding: 30,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

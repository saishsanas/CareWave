import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Linking,
  Dimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { getAlertsHistory, Alert, getRecentDisasters, DisasterAlert } from '../services/alertsService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AlertsScreenProps {
  onNavigateBack: () => void;
  onNavigateToMap: (emergencyId: string) => void;
}

export default function AlertsScreen({ onNavigateBack, onNavigateToMap }: AlertsScreenProps) {
  const insets = useSafeAreaInsets();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [disasters, setDisasters] = useState<DisasterAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal State
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [globalExpanded, setGlobalExpanded] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [alertsData, disastersData] = await Promise.all([
        getAlertsHistory(),
        getRecentDisasters()
      ]);
      setAlerts(alertsData);
      setDisasters(disastersData);
    } catch (err: any) {
      console.error('[AlertsScreen] Error loading alert history:', err);
      setError(err.message || 'Failed to fetch alert history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'MEDICAL_SOS':
        return { name: 'heart-half', color: '#FF5252' };
      case 'POLICE_SOS':
        return { name: 'shield-checkmark', color: '#0A84FF' };
      case 'FIRE_SOS':
        return { name: 'flame', color: '#FF9F0A' };
      case 'GEOFENCE_BREACH':
        return { name: 'navigate', color: '#FF2D55' };
      case 'OFFLINE':
        return { name: 'cloud-offline', color: '#8E8E93' };
      case 'GPS_DISABLED':
        return { name: 'pin-outline', color: '#FF9F0A' };
      case 'SAFETY_CHECK_IN':
        return { name: 'shield-outline', color: '#FFCC00' };
      case 'GENERAL_ALERT':
      default:
        return { name: 'warning', color: '#8E8E93' };
    }
  };

  const getAlertTypeName = (type: string) => {
    switch (type) {
      case 'MEDICAL_SOS':
        return 'MEDICAL SOS';
      case 'POLICE_SOS':
        return 'POLICE SOS';
      case 'FIRE_SOS':
        return 'FIRE SOS';
      case 'GEOFENCE_BREACH':
        return 'GEOFENCE BREACH';
      case 'OFFLINE':
        return 'OFFLINE ALERT';
      case 'GPS_DISABLED':
        return 'GPS DISABLED';
      case 'SAFETY_CHECK_IN':
        return 'SAFETY CHECK-IN';
      case 'GENERAL_ALERT':
      default:
        return 'GENERAL EMERGENCY';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '#FF5252';
      case 'RESOLVED':
        return '#4CD964';
      case 'CANCELLED':
      default:
        return '#8E8E93';
    }
  };

  const formatAlertDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const date = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const time = `${hours}:${minutes} ${ampm}`;
      
      return `${date} • ${time}`;
    } catch (err) {
      return dateStr;
    }
  };

  const getDisasterIcon = (type: string) => {
    switch (type) {
      case 'EARTHQUAKE':
        return { name: 'pulse', color: '#FF9F0A' };
      case 'FLOOD':
      case 'FLOOD_RISK':
        return { name: 'water', color: '#0A84FF' };
      case 'STORM':
        return { name: 'thunderstorm', color: '#FF3B30' };
      case 'CYCLONE':
        return { name: 'sync', color: '#FF2D55' };
      case 'HEAVY_RAIN':
        return { name: 'rainy', color: '#0A84FF' };
      default:
        return { name: 'warning', color: '#8E8E93' };
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return '#FF3B30';
      case 'HIGH':
        return '#FF9F0A';
      case 'MODERATE':
      default:
        return '#FFCC00';
    }
  };

  const renderActiveDisasterCard = (disaster: DisasterAlert, index: number) => {
    const iconInfo = getDisasterIcon(disaster.disasterType);
    const statusColor = getStatusColor(disaster.status);
    const hasDistance = disaster.distanceKm !== null && disaster.distanceKm !== undefined;
    const severityColor = getSeverityColor(disaster.severity);

    return (
      <View key={`disaster-active-${index}`} style={[styles.card, styles.disasterCardBorder, { borderColor: 'rgba(48, 209, 88, 0.3)' }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconBox}>
            <Ionicons name={iconInfo.name as any} size={22} color={iconInfo.color} />
          </View>
          <View style={styles.cardTitleCol}>
            <Text style={styles.cardTypeName}>{disaster.disasterType} WARNING</Text>
            <Text style={[styles.severityText, { color: severityColor }]}>
              {disaster.severity} SEVERITY
            </Text>
            <Text style={styles.cardOwnerName}>{disaster.locationName || 'Local Region'}</Text>
            {hasDistance ? (
              <Text style={styles.distanceText}>
                📍 {disaster.distanceKm!.toFixed(1)} km away (Radius: {disaster.warningRadiusKm.toFixed(0)} km)
              </Text>
            ) : (
              <Text style={styles.distanceText}>📍 Location unavailable</Text>
            )}
            <Text style={styles.cardTimestamp}>{formatAlertDateTime(disaster.occurredAt)}</Text>
          </View>
          <View style={styles.cardStatusCol}>
            <View style={[styles.statusBadge, { borderColor: statusColor + '40', backgroundColor: statusColor + '10' }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{disaster.status}</Text>
            </View>
            <View style={[styles.relationshipBadge, styles.badgeAffected]}>
              <Text style={[styles.relationshipBadgeText, { color: '#30D158' }]}>
                ACTIVE FOR YOU
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderGlobalDisasterCard = (disaster: DisasterAlert, index: number) => {
    const iconInfo = getDisasterIcon(disaster.disasterType);
    const statusColor = getStatusColor(disaster.status);
    const severityColor = getSeverityColor(disaster.severity);

    return (
      <View key={`disaster-global-${index}`} style={[styles.card, styles.disasterCardBorder]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconBox}>
            <Ionicons name={iconInfo.name as any} size={22} color={iconInfo.color} />
          </View>
          <View style={styles.cardTitleCol}>
            <Text style={styles.cardTypeName}>{disaster.disasterType} WARNING</Text>
            <Text style={[styles.severityText, { color: severityColor }]}>
              {disaster.severity} SEVERITY
            </Text>
            <Text style={styles.cardOwnerName}>{disaster.locationName || 'Local Region'}</Text>
            <Text style={styles.cardTimestamp}>{formatAlertDateTime(disaster.occurredAt)}</Text>
          </View>
          <View style={styles.cardStatusCol}>
            <View style={[styles.statusBadge, { borderColor: statusColor + '40', backgroundColor: statusColor + '10' }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{disaster.status}</Text>
            </View>
            <View style={[styles.relationshipBadge, styles.badgeInformational]}>
              <Text style={[styles.relationshipBadgeText, { color: '#8E8E93' }]}>
                INFORMATIONAL
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const handleOpenGoogleMaps = (lat: number, lon: number) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    Linking.openURL(url).catch((err) => console.error('Error opening Google Maps:', err));
  };

  // Filter alerts by relationship
  const myAlerts = alerts.filter((a) => a.relationship === 'CREATED_BY_ME');
  const monitoringAlerts = alerts.filter((a) => a.relationship === 'MONITORING');

  const isMockDisaster = (d: DisasterAlert) => {
    const loc = (d.locationName || '').toLowerCase();
    if (loc.includes('alert area') || loc.includes('test')) {
      return true;
    }
    if (d.distanceKm === 0) {
      return true;
    }
    return false;
  };

  // Split disasters using affectedForUser and filter out test/mock records
  const activeDisasters = disasters.filter((d) => d.affectedForUser && !isMockDisaster(d));
  const globalDisasters = disasters.filter((d) => !d.affectedForUser && !isMockDisaster(d));

  const renderAlertCard = (alert: Alert) => {
    const iconInfo = getAlertIcon(alert.alertType);
    const typeName = getAlertTypeName(alert.alertType);
    const isCreatedByMe = alert.relationship === 'CREATED_BY_ME';
    const statusColor = getStatusColor(alert.status);
    const hasCoordinates = alert.latitude !== null && alert.longitude !== null;
    const canOpenTracking = alert.status === 'ACTIVE' && alert.trackingSessionId !== null;

    return (
      <View key={alert.alertId} style={[styles.card, isCreatedByMe ? styles.myCardBorder : styles.monitoringCardBorder]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconBox}>
            <Ionicons name={iconInfo.name as any} size={22} color={iconInfo.color} />
          </View>
          <View style={styles.cardTitleCol}>
            <Text style={styles.cardTypeName}>{typeName}</Text>
            <Text style={styles.cardOwnerName}>{alert.ownerName}</Text>
            <Text style={styles.cardTimestamp}>{formatAlertDateTime(alert.createdAt)}</Text>
          </View>
          <View style={styles.cardStatusCol}>
            <View style={[styles.statusBadge, { borderColor: statusColor + '40', backgroundColor: statusColor + '10' }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{alert.status}</Text>
            </View>
            <View style={[styles.relationshipBadge, isCreatedByMe ? styles.badgeMyAlert : styles.badgeMonitoring]}>
              <Text style={[styles.relationshipBadgeText, { color: isCreatedByMe ? '#FF5252' : '#0A84FF' }]}>
                {isCreatedByMe ? 'YOU CREATED' : 'MONITORING'}
              </Text>
            </View>
          </View>
        </View>

        {/* Buttons Action Row */}
        <View style={styles.cardActions}>
          {hasCoordinates && (
            <TouchableOpacity
              style={styles.detailsBtn}
              onPress={() => setSelectedAlert(alert)}
              activeOpacity={0.8}
            >
              <Ionicons name="information-circle-outline" size={16} color="#8E8E93" style={{ marginRight: 4 }} />
              <Text style={styles.detailsBtnText}>View Details</Text>
            </TouchableOpacity>
          )}

          {canOpenTracking && (
            <TouchableOpacity
              style={styles.trackingBtn}
              onPress={() => onNavigateToMap(alert.trackingSessionId!)}
              activeOpacity={0.8}
            >
              <Ionicons name="map" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.trackingBtnText}>Open Tracking</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onNavigateBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ALERTS CENTER</Text>
        <TouchableOpacity onPress={() => fetchAlerts(true)} style={styles.reloadBtn} activeOpacity={0.8}>
          <Ionicons name="refresh" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Main List content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF5252" />
          <Text style={styles.statusText}>Loading alerts history...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={48} color="#FF5252" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchAlerts()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchAlerts(true)} tintColor="#FF5252" />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1 - My Alerts */}
          <Text style={styles.sectionHeader}>MY ALERTS ({myAlerts.length})</Text>
          {myAlerts.length === 0 ? (
            <View style={[styles.emptyContainer, { marginBottom: 20 }]}>
              <Text style={styles.emptyText}>No alerts created yet.</Text>
            </View>
          ) : (
            <View style={{ marginBottom: 12 }}>
              {myAlerts.map(renderAlertCard)}
            </View>
          )}

          {/* Section 2 - Alerts I'm Monitoring */}
          <Text style={[styles.sectionHeader, { marginTop: 12 }]}>
            ALERTS I'M MONITORING ({monitoringAlerts.length})
          </Text>
          {monitoringAlerts.length === 0 ? (
            <View style={[styles.emptyContainer, { marginBottom: 20 }]}>
              <Text style={styles.emptyText}>No alerts received from linked contacts.</Text>
            </View>
          ) : (
            <View style={{ marginBottom: 12 }}>
              {monitoringAlerts.map(renderAlertCard)}
            </View>
          )}

          {/* Section 3 - ACTIVE FOR YOU */}
          <Text style={[styles.sectionHeader, { marginTop: 12 }]}>ACTIVE FOR YOU</Text>
          {activeDisasters.length === 0 ? (
            <View style={[styles.emptyContainer, { marginBottom: 20 }]}>
              <Text style={styles.emptyText}>No active disaster alerts affecting your location.</Text>
            </View>
          ) : (
            <View style={{ marginBottom: 12 }}>
              {activeDisasters.map(renderActiveDisasterCard)}
            </View>
          )}

          {/* Section 4 - RECENT GLOBAL DISASTER EVENTS */}
          <View style={{ marginTop: 12 }}>
            <Text style={styles.sectionHeader}>
              RECENT GLOBAL DISASTER EVENTS ({globalDisasters.length})
            </Text>
            <TouchableOpacity
              style={styles.collapseToggleBtn}
              onPress={() => setGlobalExpanded(!globalExpanded)}
              activeOpacity={0.8}
            >
              <Text style={styles.collapseToggleBtnText}>
                {globalExpanded ? '▲ Hide Events' : '▼ Show Events'}
              </Text>
            </TouchableOpacity>

            {globalExpanded && (
              <View style={{ marginTop: 8 }}>
                {globalDisasters.length === 0 ? (
                  <View style={[styles.emptyContainer, { marginBottom: 20 }]}>
                    <Text style={styles.emptyText}>No disaster alerts available.</Text>
                  </View>
                ) : (
                  globalDisasters.map(renderGlobalDisasterCard)
                )}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Detail Modal */}
      <Modal
        visible={selectedAlert !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedAlert(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alert Details</Text>
              <TouchableOpacity onPress={() => setSelectedAlert(null)} style={styles.closeModalBtn}>
                <Feather name="x" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {selectedAlert && (
              <View style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Alert Type:</Text>
                  <Text style={styles.detailValue}>{getAlertTypeName(selectedAlert.alertType)}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Triggered By:</Text>
                  <Text style={styles.detailValue}>
                    {selectedAlert.alertSourceUserName} ({selectedAlert.relationship === 'CREATED_BY_ME' ? 'You' : 'Contact'})
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={[styles.detailValue, { color: getStatusColor(selectedAlert.status), fontWeight: '800' }]}>
                    {selectedAlert.status}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Occurred At:</Text>
                  <Text style={styles.detailValue}>{formatAlertDateTime(selectedAlert.createdAt)}</Text>
                </View>

                {selectedAlert.latitude !== null && selectedAlert.longitude !== null && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>GPS Position:</Text>
                      <Text style={styles.detailValue}>
                        {selectedAlert.latitude.toFixed(5)}, {selectedAlert.longitude.toFixed(5)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.mapLinkBtn}
                      onPress={() => handleOpenGoogleMaps(selectedAlert.latitude!, selectedAlert.longitude!)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="logo-google" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.mapLinkBtnText}>View on Google Maps</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
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
  reloadBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  emptyContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '500',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statusText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF5252',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#FF5252',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  myCardBorder: {
    borderColor: 'rgba(255, 82, 82, 0.25)',
  },
  monitoringCardBorder: {
    borderColor: 'rgba(10, 132, 255, 0.25)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  cardTypeName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  cardOwnerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
  },
  cardTimestamp: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8E8E93',
  },
  cardStatusCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 48,
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  relationshipBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  badgeMyAlert: {
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
  },
  badgeMonitoring: {
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
  },
  relationshipBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    paddingTop: 12,
    gap: 8,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  detailsBtnText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '700',
  },
  trackingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  trackingBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
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
  modalBody: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  mapLinkBtn: {
    backgroundColor: '#D32F2F',
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  mapLinkBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  disasterCardBorder: {
    borderColor: 'rgba(255, 159, 10, 0.25)',
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF9F0A',
    marginTop: 2,
    marginBottom: 2,
  },
  badgeAffected: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
  },
  badgeInformational: {
    backgroundColor: 'rgba(142, 142, 147, 0.15)',
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 2,
  },
  collapseToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  collapseToggleBtnText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '700',
  },
});

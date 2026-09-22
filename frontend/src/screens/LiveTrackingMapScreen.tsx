import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getLiveLocation } from '../services/trackingService';

interface LiveTrackingMapScreenProps {
  emergencyId: string | undefined;
  onNavigateBack: () => void;
}

export default function LiveTrackingMapScreen({ emergencyId, onNavigateBack }: LiveTrackingMapScreenProps) {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialCoordinates, setInitialCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<'LOADING' | 'ACTIVE' | 'NO_ACTIVE' | 'ENDED' | 'FAILED'>('LOADING');
  const statusRef = useRef<'LOADING' | 'ACTIVE' | 'NO_ACTIVE' | 'ENDED' | 'FAILED'>('LOADING');
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  const updateTrackingStatus = (newStatus: 'LOADING' | 'ACTIVE' | 'NO_ACTIVE' | 'ENDED' | 'FAILED') => {
    if (statusRef.current !== newStatus) {
      console.log(`[LiveLocation] Status changed to ${newStatus}`);
      statusRef.current = newStatus;
      setTrackingStatus(newStatus);
    }
  };

  const loadLocation = async () => {
    console.log('[LiveLocation] loadLocation called');
    if (!emergencyId || emergencyId.trim() === '') {
      console.log('[LiveLocation] No active emergency found');
      updateTrackingStatus('NO_ACTIVE');
      setInitialCoordinates(null);
      setLoading(false);
      return;
    }

    try {
      if (trackingStatus === 'LOADING') {
        setLoading(true);
      }
      
      console.log('[LiveTracking Fetch] Fetching coordinates');
      const location = await getLiveLocation(emergencyId);

      if (location.latitude === null || location.longitude === null || location.latitude === undefined || location.longitude === undefined) {
        setConsecutiveFailures(0);
        if (!initialCoordinates) {
          console.log('[LiveLocation] No active emergency found');
          updateTrackingStatus('NO_ACTIVE');
        } else {
          console.log('[LiveLocation] Tracking ended');
          updateTrackingStatus('ENDED');
        }
        setInitialCoordinates(null);
      } else {
        setConsecutiveFailures(0);
        console.log(`[LiveTracking Fetch] Latitude: ${location.latitude}`);
        console.log(`[LiveTracking Fetch] Longitude: ${location.longitude}`);
        console.log('[LiveLocation] Active emergency found');
        console.log('[LiveLocation] Polling active... Status:', trackingStatus);
        
        if (!initialCoordinates) {
          setInitialCoordinates({ latitude: location.latitude, longitude: location.longitude });
        } else {
          // Update Leaflet marker and pan map dynamically without reloading WebView
          const jsCode = `
            if (window.trackedMarker) {
              window.trackedMarker.setLatLng([${location.latitude}, ${location.longitude}]);
            }
            if (window.map) {
              window.map.panTo([${location.latitude}, ${location.longitude}]);
            }
            true;
          `;
          webViewRef.current?.injectJavaScript(jsCode);
        }
        updateTrackingStatus('ACTIVE');
      }
    } catch (err: any) {
      console.error('[LiveTracking] Failed to load live location:', err);
      const errMsg = err.message || '';
      const isInactive = errMsg.includes('403') || errMsg.includes('404') || 
                         errMsg.toLowerCase().includes('not active') || 
                         errMsg.toLowerCase().includes('not found') || 
                         errMsg.toLowerCase().includes('unauthorized') ||
                         errMsg.toLowerCase().includes('not exist');

      if (isInactive) {
        setConsecutiveFailures(0);
        if (!initialCoordinates && trackingStatus === 'LOADING') {
          console.log('[LiveLocation] No active emergency found');
          updateTrackingStatus('NO_ACTIVE');
        } else {
          console.log('[LiveLocation] Tracking ended');
          updateTrackingStatus('ENDED');
        }
        setInitialCoordinates(null);
      } else {
        if (!initialCoordinates) {
          setError(err.message || 'Failed to load live tracking location.');
          updateTrackingStatus('FAILED');
        } else {
          const nextFailures = consecutiveFailures + 1;
          setConsecutiveFailures(nextFailures);
          console.log(`[LiveLocation] Consecutive failures: ${nextFailures}`);
          
          if (nextFailures >= 3) {
            console.log('[LiveLocation] Tracking ended due to 3 consecutive failures');
            updateTrackingStatus('FAILED');
            setInitialCoordinates(null);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setConsecutiveFailures(0);
    setError(null);
    updateTrackingStatus('LOADING');
  };

  // 1. Mount / emergencyId change loader
  useEffect(() => {
    console.log('[LiveLocation] Screen mounted');
    console.log(`[LiveLocation] emergencyId value: ${emergencyId}`);
    loadLocation();
  }, [emergencyId]);

  // 2. Polling interval controller
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (emergencyId && emergencyId.trim() !== '' && trackingStatus === 'ACTIVE') {
      console.log('[LiveTracking Fetch] Interval Started');
      intervalId = setInterval(() => {
        loadLocation();
      }, 5000);
    } else {
      console.log('[LiveTracking Fetch] Not starting/stopping interval. Status:', trackingStatus);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        console.log('[LiveTracking Fetch] Interval Stopped');
      }
    };
  }, [emergencyId, trackingStatus]);

  const htmlContent = useMemo(() => {
    if (!initialCoordinates) return '';
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
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', {
            zoomControl: false,
            attributionControl: false
          }).setView([${initialCoordinates.latitude}, ${initialCoordinates.longitude}], 15);
          window.map = map;

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          var marker = L.marker([${initialCoordinates.latitude}, ${initialCoordinates.longitude}]).addTo(map);
          marker.bindPopup("<b>Tracked User</b>").openPopup();
          window.trackedMarker = marker;
        </script>
      </body>
      </html>
    `;
  }, [initialCoordinates?.latitude, initialCoordinates?.longitude]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <TouchableOpacity onPress={onNavigateBack} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>LIVE LOCATION</Text>
        </View>
        {!loading && trackingStatus === 'ACTIVE' && (
          <TouchableOpacity onPress={loadLocation} style={styles.refreshBtn} activeOpacity={0.8}>
            <Ionicons name="refresh" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content Area */}
      <View style={{ flex: 1 }}>
        {trackingStatus === 'ACTIVE' && initialCoordinates && (
          <WebView
            ref={webViewRef}
            style={styles.map}
            source={{ html: htmlContent }}
            originWhitelist={['*']}
            domStorageEnabled={true}
            javaScriptEnabled={true}
          />
        )}

        {/* Loading Overlay */}
        {trackingStatus === 'LOADING' && (
          <View style={[StyleSheet.absoluteFillObject, styles.center, { backgroundColor: '#0F0F11' }]}>
            <ActivityIndicator size="large" color="#FF3B30" />
            <Text style={styles.loadingText}>Fetching live location...</Text>
          </View>
        )}

        {/* No Active Emergency State */}
        {trackingStatus === 'NO_ACTIVE' && (
          <View style={[StyleSheet.absoluteFillObject, styles.center, { backgroundColor: '#0F0F11' }]}>
            <MaterialCommunityIcons name="map-marker-off" size={64} color="#FF3B30" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>No Active Emergency</Text>
            <Text style={styles.emptySubtitle}>There is currently no active emergency location available for tracking.</Text>
            <TouchableOpacity onPress={onNavigateBack} style={styles.actionBtn} activeOpacity={0.8}>
              <Text style={styles.actionBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Emergency Tracking Ended State */}
        {trackingStatus === 'ENDED' && (
          <View style={[StyleSheet.absoluteFillObject, styles.center, { backgroundColor: '#0F0F11' }]}>
            <MaterialCommunityIcons name="map-marker-off" size={64} color="#FF3B30" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Emergency Tracking Ended</Text>
            <Text style={styles.emptySubtitle}>The emergency is no longer active.</Text>
            <TouchableOpacity onPress={onNavigateBack} style={styles.actionBtn} activeOpacity={0.8}>
              <Text style={styles.actionBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Failed State */}
        {trackingStatus === 'FAILED' && (
          <View style={[StyleSheet.absoluteFillObject, styles.center, { backgroundColor: '#0F0F11' }]}>
            <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Unable to retrieve live location.</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity onPress={handleRetry} style={styles.actionBtn} activeOpacity={0.8}>
                <Text style={styles.actionBtnText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onNavigateBack} style={[styles.actionBtn, { backgroundColor: '#2C2C2E', borderColor: '#3A3A3C', borderWidth: 1 }]} activeOpacity={0.8}>
                <Text style={styles.actionBtnText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
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
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    backgroundColor: '#1C1C1E',
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    marginLeft: 12,
    color: '#FFFFFF',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
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
  errorText: {
    color: '#FF453A',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  errorBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  actionBtn: {
    height: 50,
    backgroundColor: '#D32F2F',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    marginTop: 20,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SafetyMapScreenProps {
  onNavigateBack: () => void;
}

interface Resource {
  id: string;
  name: string;
  type: 'HOSPITAL' | 'POLICE' | 'FIRE';
  address: string;
  distance: string;
  lat: number;
  lon: number;
}

export default function SafetyMapScreen({ onNavigateBack }: SafetyMapScreenProps) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialCoordinates, setInitialCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  useEffect(() => {
    fetchNearbyResources();
  }, []);

  const fetchNearbyResources = async () => {
    setLoading(true);
    setError(null);
    setSelectedResource(null);
    let loc = null;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      try {
        const locationPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );
        loc = await Promise.race([locationPromise, timeoutPromise]);
      } catch (locErr) {
        loc = await Location.getLastKnownPositionAsync({});
      }

      const latitude = loc ? loc.coords.latitude : 37.78825;
      const longitude = loc ? loc.coords.longitude : -122.4324;
      setInitialCoordinates({ latitude, longitude });

      const radius = 5000; // scan within 5km (5000 meters)
      
      // Fetch Hospitals/Clinics, Police, and Fire Stations in one combined query
      const query = `[out:json];(nwr["amenity"~"hospital|clinic"](around:${radius},${latitude},${longitude});nwr["healthcare"~"hospital|clinic|urgent_care"](around:${radius},${latitude},${longitude});nwr["amenity"="police"](around:${radius},${latitude},${longitude});nwr["amenity"="fire_station"](around:${radius},${latitude},${longitude}););out center;`;

      const mirrors = [
        `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
        `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`,
        `https://lz4.overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
      ];

      let response = null;
      let lastFetchError = null;

      for (const mirrorUrl of mirrors) {
        try {
          const res = await fetch(mirrorUrl, {
            headers: {
              'User-Agent':
                'CareWaveEmergencySOS/1.0 (Emergency resource map locator; contact: support@carewave.com)',
            },
          });
          if (res.ok) {
            response = res;
            break;
          }
        } catch (mirrorErr) {
          console.log(`Failed to contact mirror: ${mirrorUrl}`, mirrorErr);
          lastFetchError = mirrorErr;
        }
      }

      if (!response) {
        throw new Error(lastFetchError ? String(lastFetchError) : 'All OSM interpreter mirrors failed to respond');
      }

      const data = await response.json();
      if (!data || !data.elements) {
        throw new Error('Invalid response from Overpass interpreter');
      }

      const seenIds = new Set();
      const results: Resource[] = data.elements
        .filter((el: any) => {
          if (seenIds.has(el.id)) return false;
          seenIds.add(el.id);
          return true;
        })
        .map((el: any) => {
          const lat = el.lat ?? el.center?.lat ?? latitude;
          const lon = el.lon ?? el.center?.lon ?? longitude;
          
          let type: 'HOSPITAL' | 'POLICE' | 'FIRE' = 'HOSPITAL';
          if (el.tags.amenity === 'police') {
            type = 'POLICE';
          } else if (el.tags.amenity === 'fire_station') {
            type = 'FIRE';
          }

          return {
            id: el.id.toString(),
            name: el.tags.name || el.tags.operator || el.tags.brand || (type === 'HOSPITAL' ? 'Medical Facility' : type === 'POLICE' ? 'Police Station' : 'Fire Station'),
            type,
            address: el.tags['addr:street']
              ? `${el.tags['addr:street']} ${el.tags['addr:housenumber'] || ''}`.trim()
              : el.tags['addr:suburb'] ||
                el.tags['addr:city'] ||
                el.tags['addr:place'] ||
                (type === 'HOSPITAL' ? 'Emergency Healthcare Center' : type === 'POLICE' ? 'Police Department' : 'Fire Department Service'),
            distance: calculateDistance(latitude, longitude, lat, lon).toFixed(1) + ' km',
            lat,
            lon,
          };
        })
        .sort((a: Resource, b: Resource) => parseFloat(a.distance) - parseFloat(b.distance));

      setResources(results);
    } catch (err: any) {
      console.log('[SafetyMapScreen] API Error:', err);

      // Fallback demo mock resources if API request fails
      const fallbackLat = loc?.coords?.latitude ?? 37.78825;
      const fallbackLon = loc?.coords?.longitude ?? -122.4324;
      setInitialCoordinates({ latitude: fallbackLat, longitude: fallbackLon });

      const mockLat1 = fallbackLat + 0.004;
      const mockLon1 = fallbackLon + 0.004;
      const mockLat2 = fallbackLat - 0.007;
      const mockLon2 = fallbackLon - 0.007;
      const mockLat3 = fallbackLat + 0.009;
      const mockLon3 = fallbackLon - 0.009;

      const fallbackResults: Resource[] = [
        {
          id: 'm1',
          name: 'City Central Hospital (Demo)',
          type: 'HOSPITAL',
          address: 'Main Square, City Center',
          distance: calculateDistance(fallbackLat, fallbackLon, mockLat1, mockLon1).toFixed(1) + ' km',
          lat: mockLat1,
          lon: mockLon1,
        },
        {
          id: 'm2',
          name: 'Police HQ - District 4 (Demo)',
          type: 'POLICE',
          address: 'North Block Avenue',
          distance: calculateDistance(fallbackLat, fallbackLon, mockLat2, mockLon2).toFixed(1) + ' km',
          lat: mockLat2,
          lon: mockLon2,
        },
        {
          id: 'm3',
          name: 'Central Fire Station (Demo)',
          type: 'FIRE',
          address: 'West Side Boulevard',
          distance: calculateDistance(fallbackLat, fallbackLon, mockLat3, mockLon3).toFixed(1) + ' km',
          lat: mockLat3,
          lon: mockLon3,
        },
      ];

      setResources(fallbackResults);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const p = 0.017453292519943295;
    const c = Math.cos;
    const a =
      0.5 - c((lat2 - lat1) * p) / 2 + (c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))) / 2;
    return 12742 * Math.asin(Math.sqrt(a));
  };

  const handleNavigate = (lat: number, lon: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
    Linking.openURL(url).catch((err) => console.error('Error launching Google Maps:', err));
  };

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setSelectedResource(null);
    const jsCode = `
      if (window.updateMarkers) {
        window.updateMarkers('${filter}');
      }
      true;
    `;
    webViewRef.current?.injectJavaScript(jsCode);
  };

  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.event === 'MARKER_TAP') {
        setSelectedResource(message.data);
      } else if (message.event === 'MAP_TAP') {
        setSelectedResource(null);
      }
    } catch (e) {
      console.error('[SafetyMapScreen] Error parsing WebView message:', e);
    }
  };

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
          .custom-resource-marker {
            background: none !important;
            border: none !important;
            filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.35));
          }
          .user-location-icon {
            background: none !important;
            border: none !important;
          }
          .user-pulse-marker {
            width: 14px;
            height: 14px;
            background-color: #0A84FF;
            border: 2.5px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(10, 132, 255, 0.8);
            position: relative;
            box-sizing: content-box;
          }
          .user-pulse-marker::after {
            content: '';
            position: absolute;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: rgba(10, 132, 255, 0.35);
            top: -9px;
            left: -9px;
            animation: pulse-ring 1.8s cubic-bezier(0.215, 0.610, 0.355, 1) infinite;
            box-sizing: border-box;
          }
          @keyframes pulse-ring {
            0% {
              transform: scale(0.3);
              opacity: 1;
            }
            80%, 100% {
              transform: scale(1.2);
              opacity: 0;
            }
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', {
            zoomControl: false,
            attributionControl: false
          }).setView([${initialCoordinates.latitude}, ${initialCoordinates.longitude}], 14);
          window.map = map;

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          var allResources = ${JSON.stringify(resources)};
          var resourceMarkers = [];

          // Leaflet Custom Vector Icons
          var hospitalIcon = L.divIcon({
            html: '<svg width="28" height="34" viewBox="0 0 28 34" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 0C6.3 0 0 6.3 0 14c0 9.3 12.5 18.5 13.3 19.1.2.1.5.2.7.2s.5-.1.7-.2C15.5 32.5 28 23.3 28 14c0-7.7-6.3-14-14-14z" fill="#FF5252"/><rect x="12.5" y="9" width="3" height="10" rx="0.5" fill="#FFFFFF"/><rect x="9" y="12.5" width="10" height="3" rx="0.5" fill="#FFFFFF"/></svg>',
            iconSize: [28, 34],
            iconAnchor: [14, 34],
            className: 'custom-resource-marker'
          });

          var policeIcon = L.divIcon({
            html: '<svg width="28" height="34" viewBox="0 0 28 34" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 0C6.3 0 0 6.3 0 14c0 9.3 12.5 18.5 13.3 19.1.2.1.5.2.7.2s.5-.1.7-.2C15.5 32.5 28 23.3 28 14c0-7.7-6.3-14-14-14z" fill="#0A84FF"/><path d="M14 9 L18 10.3 V13.5 C18 15.7 16.2 17.7 14 18.3 C11.8 17.7 10 15.7 10 13.5 V10.3 L14 9 Z" fill="#FFFFFF"/></svg>',
            iconSize: [28, 34],
            iconAnchor: [14, 34],
            className: 'custom-resource-marker'
          });

          var fireIcon = L.divIcon({
            html: '<svg width="28" height="34" viewBox="0 0 28 34" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 0C6.3 0 0 6.3 0 14c0 9.3 12.5 18.5 13.3 19.1.2.1.5.2.7.2s.5-.1.7-.2C15.5 32.5 28 23.3 28 14c0-7.7-6.3-14-14-14z" fill="#FF9F0A"/><path d="M14 8.5c-.3 0-3 2.5-3 5.5a3 3 0 0 0 6 0c0-3-2.7-5.5-3-5.5z" fill="#FFFFFF"/><path d="M14 11.5c-.1 0-1.5 1.2-1.5 2.7a1.5 1.5 0 0 0 3 0c0-1.5-1.4-2.7-1.5-2.7z" fill="#FF9F0A"/></svg>',
            iconSize: [28, 34],
            iconAnchor: [14, 34],
            className: 'custom-resource-marker'
          });

          var userIcon = L.divIcon({
            html: '<div class="user-pulse-marker"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            className: 'user-location-icon'
          });

          // User Marker
          L.marker([${initialCoordinates.latitude}, ${initialCoordinates.longitude}], { icon: userIcon })
            .addTo(map)
            .bindPopup("<b>My Location</b>")
            .openPopup();

          window.updateMarkers = function(filterType) {
            // Clear existing resource markers
            resourceMarkers.forEach(function(m) {
              map.removeLayer(m);
            });
            resourceMarkers = [];

            // Add filtered markers
            var filtered = allResources.filter(function(r) {
              return filterType === 'ALL' || r.type === filterType;
            });

            // Offset overlapping coordinates slightly to prevent overlapping
            var coordinateCounts = {};
            filtered.forEach(function(r) {
              var latKey = r.lat.toFixed(5);
              var lonKey = r.lon.toFixed(5);
              var key = latKey + ',' + lonKey;
              
              var latOffset = 0;
              var lonOffset = 0;
              
              if (coordinateCounts[key] !== undefined) {
                coordinateCounts[key]++;
                // Spiral offset algorithm
                var angle = coordinateCounts[key] * 0.8;
                var radius = 0.0001 * coordinateCounts[key];
                latOffset = Math.sin(angle) * radius;
                lonOffset = Math.cos(angle) * radius;
              } else {
                coordinateCounts[key] = 0;
              }

              var lat = r.lat + latOffset;
              var lon = r.lon + lonOffset;

              var icon;
              if (r.type === 'HOSPITAL') icon = hospitalIcon;
              else if (r.type === 'POLICE') icon = policeIcon;
              else if (r.type === 'FIRE') icon = fireIcon;

              var m = L.marker([lat, lon], { icon: icon }).addTo(map);
              
              // Marker Tap Interaction
              m.on('click', function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  event: 'MARKER_TAP',
                  data: r
                }));
              });
              
              resourceMarkers.push(m);
            });
          };

          // Dismiss selected card on map tap
          map.on('click', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              event: 'MAP_TAP'
            }));
          });

          // Initial load markers
          window.updateMarkers('${activeFilter}');
        </script>
      </body>
      </html>
    `;
  }, [initialCoordinates?.latitude, initialCoordinates?.longitude, resources]);

  const getBadgeStyle = (type: 'HOSPITAL' | 'POLICE' | 'FIRE') => {
    switch (type) {
      case 'HOSPITAL':
        return styles.badgeHospital;
      case 'POLICE':
        return styles.badgePolice;
      case 'FIRE':
        return styles.badgeFire;
    }
  };

  const getBadgeTextStyle = (type: 'HOSPITAL' | 'POLICE' | 'FIRE') => {
    switch (type) {
      case 'HOSPITAL':
        return styles.badgeTextHospital;
      case 'POLICE':
        return styles.badgeTextPolice;
      case 'FIRE':
        return styles.badgeTextFire;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onNavigateBack} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SAFETY MAP</Text>
        </View>
        <TouchableOpacity
          onPress={fetchNearbyResources}
          disabled={loading}
          style={styles.reloadHeaderBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Filter Chips Container */}
      {!loading && !error && (
        <View style={styles.filterChipsRow}>
          {[
            { id: 'ALL', label: 'All' },
            { id: 'HOSPITAL', label: 'Hospitals' },
            { id: 'POLICE', label: 'Police' },
            { id: 'FIRE', label: 'Fire Stations' },
          ].map((item) => {
            const isActive = activeFilter === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => handleFilterChange(item.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Map Content Area */}
      <View style={styles.content}>
        {initialCoordinates && !error && (
          <WebView
            ref={webViewRef}
            style={styles.map}
            source={{ html: htmlContent }}
            originWhitelist={['*']}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            onMessage={handleMessage}
          />
        )}

        {/* Loading overlay */}
        {loading && !initialCoordinates && (
          <View style={[StyleSheet.absoluteFillObject, styles.center, { backgroundColor: '#0F0F11' }]}>
            <ActivityIndicator size="large" color="#FF5252" />
            <Text style={styles.loadingText}>Locating emergency assets...</Text>
          </View>
        )}

        {/* Selected Resource Detail Bottom Overlay Card */}
        {selectedResource && (
          <View style={[styles.resourceCard, { bottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardInfoCol}>
                <Text style={styles.cardResourceName} numberOfLines={1} ellipsizeMode="tail">
                  {selectedResource.name}
                </Text>
                <View style={styles.cardBadgeRow}>
                  <View style={[styles.typeBadge, getBadgeStyle(selectedResource.type)]}>
                    <Text style={[styles.typeBadgeText, getBadgeTextStyle(selectedResource.type)]}>
                      {selectedResource.type === 'HOSPITAL' ? '🏥 Hospital' : selectedResource.type === 'POLICE' ? '👮 Police' : '🚒 Fire Station'}
                    </Text>
                  </View>
                  <Text style={styles.cardDistanceText}>
                    {selectedResource.distance}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeCardBtn}
                onPress={() => setSelectedResource(null)}
                activeOpacity={0.8}
              >
                <Feather name="x" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <Text style={styles.cardAddress} numberOfLines={2}>
              {selectedResource.address}
            </Text>

            <TouchableOpacity
              style={styles.navigateBtn}
              onPress={() => handleNavigate(selectedResource.lat, selectedResource.lon)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="navigation" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.navigateBtnText}>Navigate</Text>
            </TouchableOpacity>
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
  headerLeft: {
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
  reloadHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipsRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1C1C1E',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  filterChipActive: {
    backgroundColor: '#FF5252',
    borderColor: '#FF5252',
  },
  filterChipText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
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
  resourceCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#1C1C1E',
    borderWidth: 1.5,
    borderColor: '#2C2C2E',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardInfoCol: {
    flex: 1,
    paddingRight: 8,
  },
  cardResourceName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeHospital: {
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderColor: 'rgba(255, 82, 82, 0.25)',
  },
  badgeTextHospital: {
    color: '#FF5252',
  },
  badgePolice: {
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    borderColor: 'rgba(10, 132, 255, 0.25)',
  },
  badgeTextPolice: {
    color: '#0A84FF',
  },
  badgeFire: {
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    borderColor: 'rgba(255, 159, 10, 0.25)',
  },
  badgeTextFire: {
    color: '#FF9F0A',
  },
  cardDistanceText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
  },
  closeCardBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAddress: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  navigateBtn: {
    backgroundColor: '#D32F2F',
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  navigateBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

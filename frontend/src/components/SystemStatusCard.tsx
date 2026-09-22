import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

interface SystemStatusCardProps {
  batteryLevel: number | null;
  gpsEnabled: boolean | null;
  networkConnected: boolean | null;
  liveTrackingActive: boolean;
}

export default function SystemStatusCard({
  batteryLevel,
  gpsEnabled,
  networkConnected,
  liveTrackingActive,
}: SystemStatusCardProps) {
  // Determine battery level color
  const getBatteryColor = (level: number | null) => {
    if (level === null) return '#8E8E93';
    if (level >= 50) return '#34C759'; // Green
    if (level >= 20) return '#FFCC00'; // Yellow
    return '#FF3B30'; // Red
  };

  const batteryDisplay = batteryLevel !== null ? `${batteryLevel}%` : 'Loading...';
  const batteryColor = getBatteryColor(batteryLevel);

  // Status helpers
  const gpsText = gpsEnabled === null ? 'Loading...' : gpsEnabled ? 'Enabled' : 'Disabled';
  const gpsColor = gpsEnabled ? '#34C759' : '#FF3B30';

  const networkText = networkConnected === null ? 'Loading...' : networkConnected ? 'Connected' : 'Offline';
  const networkColor = networkConnected ? '#34C759' : '#FF3B30';

  return (
    <View style={styles.card}>
      <Text style={styles.title}>System Status</Text>

      {/* Battery Row */}
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="battery" size={18} color="#FF5252" />
          </View>
          <Text style={styles.label}>Phone Battery</Text>
        </View>
        <Text style={[styles.value, { color: batteryColor }]}>{batteryDisplay}</Text>
      </View>
      <View style={styles.separator} />

      {/* GPS Location Row */}
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <View style={styles.iconContainer}>
            <Feather name="map-pin" size={16} color="#FF5252" />
          </View>
          <Text style={styles.label}>GPS Location</Text>
        </View>
        <Text style={[styles.value, { color: gpsColor }]}>{gpsText}</Text>
      </View>
      <View style={styles.separator} />

      {/* Network Row */}
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <View style={styles.iconContainer}>
            <Feather name="wifi" size={16} color="#FF5252" />
          </View>
          <Text style={styles.label}>Network</Text>
        </View>
        <Text style={[styles.value, { color: networkColor }]}>{networkText}</Text>
      </View>
      <View style={styles.separator} />

      {/* SMS Service Row */}
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <View style={styles.iconContainer}>
            <Feather name="message-square" size={16} color="#FF5252" />
          </View>
          <Text style={styles.label}>SMS Service</Text>
        </View>
        <Text style={[styles.value, { color: '#34C759' }]}>Ready</Text>
      </View>
      <View style={styles.separator} />

      {/* Live Tracking Row */}
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <View style={styles.iconContainer}>
            <Feather name="activity" size={16} color="#FF5252" />
          </View>
          <Text style={styles.label}>Live Tracking</Text>
        </View>
        <Text style={[styles.value, { color: liveTrackingActive ? '#34C759' : '#FFCC00' }]}>
          {liveTrackingActive ? 'ACTIVE' : 'Inactive'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 20,
    padding: 18,
    marginVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 82, 82, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#E5E5EA',
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: '#2C2C2E',
    marginVertical: 2,
  },
});

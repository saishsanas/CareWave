import * as Location from 'expo-location';
import { BACKEND_API_URL } from '../constants/api';
import { getAuthData } from './storageService';
import { getSafeZones } from './safeZoneService';

let monitoringIntervalId: ReturnType<typeof setInterval> | null = null;
let isUpdatingLocation = false;

/**
 * Periodically sends the user's location to the backend for GeoFence evaluation.
 * Triggered every 120 seconds during normal app usage.
 */
async function sendUserLocation(): Promise<void> {
  if (isUpdatingLocation) {
    console.log('[GeofenceMonitor] Location update already in progress. Skipping loop.');
    return;
  }

  isUpdatingLocation = true;
  const url = `${BACKEND_API_URL}/users/location`;
  
  try {
    const session = await getAuthData();
    if (!session || !session.token) {
      console.warn('[GeofenceMonitor] Active session not found. Skipping location update.');
      isUpdatingLocation = false;
      return;
    }

    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[GeofenceMonitor] Foreground location permission denied. Reporting GPS disabled.');
      await publishLocationUpdate(url, session.token, { gpsEnabled: false });
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const payload = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        gpsEnabled: true,
      };

      console.log('[GeofenceMonitor] Sending location update to backend...', payload);
      await publishLocationUpdate(url, session.token, payload);
    } catch (locErr) {
      console.warn('[GeofenceMonitor] Failed to fetch current position. Reporting GPS disabled:', locErr);
      await publishLocationUpdate(url, session.token, { gpsEnabled: false });
    }
  } catch (err) {
    console.error('[GeofenceMonitor] Unexpected error in sendUserLocation:', err);
  } finally {
    isUpdatingLocation = false;
  }
}

/**
 * Performs the actual HTTP PATCH request to update user location.
 */
async function publishLocationUpdate(url: string, token: string, payload: any): Promise<void> {
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.warn(`[GeofenceMonitor] PATCH /users/location failed with status ${response.status}: ${errText}`);
    } else {
      console.log('[GeofenceMonitor] Location update published successfully.');
    }
  } catch (fetchErr) {
    console.error('[GeofenceMonitor] Network error publishing location update:', fetchErr);
  }
}

/**
 * Starts the GeoFence periodic location monitoring interval.
 * Ties start lifecycle to the authenticated session.
 * Checks for at least one active Safe Zone before starting.
 */
export async function startGeofenceMonitoring(): Promise<void> {
  if (monitoringIntervalId) {
    console.log('[GeofenceMonitor] Monitoring is already active. Skipping duplicate startup.');
    return;
  }

  try {
    console.log('[GeofenceMonitor] Checking safe zones participation before starting monitoring...');
    const zones = await getSafeZones();
    const hasActiveZones = zones.some((zone) => zone.active === true);

    if (!hasActiveZones) {
      console.log('[GeofenceMonitor] User does not participate in any active Safe Zones. Monitoring interval will not start.');
      return;
    }

    console.log('[GeofenceMonitor] Active safe zone participation verified. Initiating monitoring.');

    // Request permissions upfront
    await Location.requestForegroundPermissionsAsync();

    // Trigger initial location update immediately
    sendUserLocation();

    // Start periodic 120-second loop
    monitoringIntervalId = setInterval(sendUserLocation, 120000);
    console.log('[GeofenceMonitor] Started periodic geofence monitoring (120s interval).');
  } catch (error) {
    console.error('[GeofenceMonitor] Failed to start monitoring:', error);
  }
}

/**
 * Stops the GeoFence periodic location monitoring interval.
 */
export function stopGeofenceMonitoring(): void {
  if (monitoringIntervalId) {
    clearInterval(monitoringIntervalId);
    monitoringIntervalId = null;
    console.log('[GeofenceMonitor] Stopped periodic geofence monitoring.');
  }
}

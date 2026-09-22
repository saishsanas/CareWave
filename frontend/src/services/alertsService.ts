import { BACKEND_API_URL } from '../constants/api';
import { getAuthData } from './storageService';

export interface Alert {
  alertId: string;
  alertType: 'MEDICAL_SOS' | 'POLICE_SOS' | 'FIRE_SOS' | 'GEOFENCE_BREACH' | 'OFFLINE' | 'GPS_DISABLED' | 'GENERAL_ALERT';
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED';
  relationship: 'CREATED_BY_ME' | 'MONITORING';
  ownerName: string;
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
  trackingSessionId: string | null;
  alertSourceUserId: string;
  alertSourceUserName: string;
}

/**
 * Fetches the filtered alert history from the backend.
 */
export async function getAlertsHistory(): Promise<Alert[]> {
  const url = `${BACKEND_API_URL}/alerts/history`;
  const session = await getAuthData();
  if (!session || !session.token) {
    throw new Error('Authentication session not found.');
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`HTTP Error ${response.status}: ${errorText || response.statusText}`);
  }

  return response.json();
}

export interface DisasterAlert {
  disasterType: 'EARTHQUAKE' | 'FLOOD' | 'STORM' | 'CYCLONE' | 'HEAVY_RAIN' | 'FLOOD_RISK';
  severity: 'MODERATE' | 'HIGH' | 'CRITICAL';
  distanceKm: number | null;
  warningRadiusKm: number;
  affectedForUser: boolean;
  occurredAt: string;
  status: 'ACTIVE' | 'RESOLVED';
  locationName: string;
}

/**
 * Fetches recent disaster events relevant to the authenticated user.
 */
export async function getRecentDisasters(): Promise<DisasterAlert[]> {
  const url = `${BACKEND_API_URL}/disasters/recent`;
  const session = await getAuthData();
  if (!session || !session.token) {
    throw new Error('Authentication session not found.');
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`HTTP Error ${response.status}: ${errorText || response.statusText}`);
  }

  return response.json();
}

import { BACKEND_API_URL } from '../constants/api';
import { getAuthData } from './storageService';
import * as Location from 'expo-location';

let activeTrackingEmergencyId: string | null = null;
let isLocationUpdateInProgress = false;

export interface CancelAlertResponse {
  breachEventId: string;
  alertStatus: string;
  processedAt: string;
  message: string;
}

export interface ActiveEmergencyResponse {
  emergencyId: string;
  emergencyStatus: string;
  emergencyType: string;
  createdAt: string;
  userId?: string;
  victimName?: string;
  victimPhone?: string;
}

/**
 * Calls the PATCH /emergency/cancel endpoint to cancel an active emergency alert.
 */
export async function cancelAlert(emergencyId: string): Promise<ActiveEmergencyResponse> {
  activeTrackingEmergencyId = null;
  const url = `${BACKEND_API_URL}/emergency/cancel`;
  const session = await getAuthData();
  if (!session || !session.token) {
    throw new Error('Authentication session not found.');
  }

  const payload = { emergencyId };

  console.log('[API Request] PATCH - ' + url);
  console.log('[API Payload]', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    });

    console.log(`[API Response Status] ${response.status} - ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP Error ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    console.log('[API Response Body]', JSON.stringify(data, null, 2));

    return data as ActiveEmergencyResponse;
  } catch (error: any) {
    console.error(`[API Error] PATCH ${url} failed:`, error);
    throw error;
  }
}

/**
 * Calls the PATCH /emergency/resolve endpoint to resolve an active emergency alert.
 */
export async function resolveAlert(emergencyId: string): Promise<ActiveEmergencyResponse> {
  activeTrackingEmergencyId = null;
  const url = `${BACKEND_API_URL}/emergency/resolve`;
  const session = await getAuthData();
  if (!session || !session.token) {
    throw new Error('Authentication session not found.');
  }

  const payload = { emergencyId };

  console.log('[API Request] PATCH - ' + url);
  console.log('[API Payload]', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    });

    console.log(`[API Response Status] ${response.status} - ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP Error ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    console.log('[API Response Body]', JSON.stringify(data, null, 2));

    return data as ActiveEmergencyResponse;
  } catch (error: any) {
    console.error(`[API Error] PATCH ${url} failed:`, error);
    throw error;
  }
}

/**
 * Calls the GET /emergency/active endpoint to fetch the active emergency for the logged-in user.
 */
export async function getActiveEmergency(): Promise<ActiveEmergencyResponse | null> {
  const url = `${BACKEND_API_URL}/emergency/active`;
  const session = await getAuthData();
  if (!session || !session.token) {
    throw new Error('Authentication session not found.');
  }

  console.log('[API Request] GET - ' + url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.token}`,
      },
    });

    console.log(`[API Response Status] ${response.status} - ${response.statusText}`);

    if (response.status === 204) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status} - ${response.statusText}`);
    }

    const text = await response.text();
    console.log('[API Response Body]', text);
    if (!text || text === 'null' || text.trim() === '') {
      return null;
    }

    const data = JSON.parse(text);
    return data as ActiveEmergencyResponse;
  } catch (error: any) {
    console.error(`[API Error] GET ${url} failed:`, error);
    return null;
  }
}

export interface LiveLocationResponse {
  latitude: number;
  longitude: number;
  lastLocationUpdatedAt: string;
  gpsEnabled: boolean;
}

/**
 * Calls the GET /tracking/live-location endpoint to fetch the tracked user's real-time coordinates.
 */
export async function getLiveLocation(eventId: string): Promise<LiveLocationResponse> {
  const url = `${BACKEND_API_URL}/tracking/live-location?eventId=${encodeURIComponent(eventId)}`;
  const session = await getAuthData();
  if (!session || !session.token) {
    throw new Error('Authentication session not found.');
  }

  console.log('[API Request] GET - ' + url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.token}`,
      },
    });

    console.log(`[API Response Status] ${response.status} - ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP Error ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    console.log('[API Response Body]', JSON.stringify(data));
    return data as LiveLocationResponse;
  } catch (error: any) {
    console.error(`[API Error] GET ${url} failed:`, error);
    throw error;
  }
}

/**
 * Sends updated GPS coordinates for an active emergency.
 */
export async function updateLiveLocation(
  eventId: string,
  latitude: number,
  longitude: number
): Promise<any> {
  const url = `${BACKEND_API_URL}/tracking/live-location`;
  const session = await getAuthData();
  if (!session || !session.token) {
    throw new Error('Authentication session not found.');
  }

  const payload = {
    eventId,
    latitude,
    longitude,
  };

  console.log('[LiveTracking Update] Sending coordinates');
  console.log('[API Request] PATCH - ' + url);
  console.log('[API Payload]', JSON.stringify(payload));

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    });

    console.log(`[API Response Status] ${response.status} - ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP Error ${response.status}: ${errorText || response.statusText}`);
    }

    if (response.status === 204) {
      console.log('[LiveTracking Update] PATCH Success');
      return null;
    }

    const data = await response.json();
    console.log('[LiveTracking Update] Success');
    return data;
  } catch (error: any) {
    console.error('[LiveTracking Update] Failure:', error);
    throw error;
  }
}

/**
 * Fetches coordinates from Expo Location and posts updates to updateLiveLocation.
 */
export async function sendCurrentEmergencyLocation(emergencyId: string): Promise<boolean> {
  if (isLocationUpdateInProgress) {
    console.log('[LiveTracking Update] Execution skipped: update already in progress');
    return false;
  }

  activeTrackingEmergencyId = emergencyId;
  isLocationUpdateInProgress = true;

  console.log(`[LiveTracking Update] Emergency ID: ${emergencyId}`);
  try {
    const locationData = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    if (activeTrackingEmergencyId !== emergencyId) {
      console.log('[LiveTracking Update] Execution aborted: emergency is no longer active');
      return false;
    }

    const { latitude, longitude } = locationData.coords;
    console.log(`[LiveTracking Update] Latitude: ${latitude}`);
    console.log(`[LiveTracking Update] Longitude: ${longitude}`);

    await updateLiveLocation(emergencyId, latitude, longitude);
    return true;
  } catch (error: any) {
    console.log('[LiveTracking Update] PATCH Failed');
    return false;
  } finally {
    isLocationUpdateInProgress = false;
  }
}

/**
 * Sends a stateless POST request to acknowledge an active emergency event.
 */
export async function acknowledgeEmergency(emergencyId: string): Promise<boolean> {
  const url = `${BACKEND_API_URL}/emergency/${emergencyId}/acknowledge`;
  const session = await getAuthData();
  if (!session || !session.token) {
    throw new Error('Authentication session not found.');
  }

  console.log('[API Request] POST - ' + url);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.token}`,
      },
    });

    console.log(`[API Response Status] ${response.status} - ${response.statusText}`);
    return response.ok;
  } catch (error: any) {
    console.error(`[API Error] POST ${url} failed:`, error);
    return false;
  }
}


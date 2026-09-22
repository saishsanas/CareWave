import { BACKEND_API_URL } from '../constants/api';
import { getAuthData } from './storageService';

export interface EmergencyContact {
  contactId: string;
  fullName: string;
  contactNumber: string;
  relation: string;
  linkedUserId: string | null;
  linkedToRegisteredUser: boolean;
}

export interface SafeZone {
  safeZoneId: string;
  guardianUserId: string;
  protectedUserId: string;
  protectedUserName?: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  zoneName: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Fetches all emergency contacts belonging to the current user.
 */
export async function getContacts(): Promise<EmergencyContact[]> {
  const url = `${BACKEND_API_URL}/users/contacts`;
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

/**
 * Fetches all safe zones created by the current user.
 */
export async function getSafeZones(): Promise<SafeZone[]> {
  const url = `${BACKEND_API_URL}/safe-zones`;
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

/**
 * Creates a new safe zone.
 */
export async function createSafeZone(
  protectedUserId: string,
  centerLatitude: number,
  centerLongitude: number,
  radiusMeters: number,
  zoneName: string
): Promise<SafeZone> {
  const url = `${BACKEND_API_URL}/safe-zones`;
  const session = await getAuthData();
  if (!session || !session.token) {
    throw new Error('Authentication session not found.');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.token}`,
    },
    body: JSON.stringify({
      protectedUserId,
      centerLatitude,
      centerLongitude,
      radiusMeters,
      zoneName,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`HTTP Error ${response.status}: ${errorText || response.statusText}`);
  }

  return response.json();
}

/**
 * Deletes an existing safe zone.
 */
export async function deleteSafeZone(safeZoneId: string): Promise<void> {
  const url = `${BACKEND_API_URL}/safe-zones/${safeZoneId}`;
  const session = await getAuthData();
  if (!session || !session.token) {
    throw new Error('Authentication session not found.');
  }

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session.token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`HTTP Error ${response.status}: ${errorText || response.statusText}`);
  }
}

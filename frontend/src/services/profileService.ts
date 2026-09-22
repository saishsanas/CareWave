import { BACKEND_API_URL } from '../constants/api';
import { getAuthData } from './storageService';

export interface UserProfile {
  firstName: string;
  lastName: string | null;
  email: string | null;
  gender: 'MALE' | 'FEMALE' | null;
  bloodGroup:
    | 'A_POSITIVE'
    | 'A_NEGATIVE'
    | 'B_POSITIVE'
    | 'B_NEGATIVE'
    | 'AB_POSITIVE'
    | 'AB_NEGATIVE'
    | 'O_POSITIVE'
    | 'O_NEGATIVE'
    | null;
  contactNumber: string;
}

export interface UserProfileStats {
  emergencyContactsCount: number;
  safeZonesCount: number;
  alertsCreatedCount: number;
  alertsMonitoringCount: number;
}

/**
 * Fetches current user profile from the backend.
 */
export async function getUserProfile(): Promise<UserProfile> {
  const url = `${BACKEND_API_URL}/users/profile`;
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
 * Updates current user profile on the backend.
 */
export async function updateUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
  const url = `${BACKEND_API_URL}/users/profile`;
  const session = await getAuthData();
  if (!session || !session.token) {
    throw new Error('Authentication session not found.');
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${session.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`HTTP Error ${response.status}: ${errorText || response.statusText}`);
  }

  return response.json();
}

/**
 * Fetches user activity statistics counts from the backend.
 */
export async function getUserProfileStats(): Promise<UserProfileStats> {
  const url = `${BACKEND_API_URL}/users/profile/stats`;
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

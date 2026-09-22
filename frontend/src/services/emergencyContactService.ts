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
 * Registers a new emergency contact.
 */
export async function createContact(
  fullName: string,
  contactNumber: string,
  relation: string
): Promise<EmergencyContact> {
  const url = `${BACKEND_API_URL}/users/contacts`;
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
      fullName,
      contactNumber,
      relation,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`HTTP Error ${response.status}: ${errorText || response.statusText}`);
  }

  return response.json();
}

/**
 * Deletes an existing emergency contact.
 */
export async function deleteContact(contactId: string): Promise<void> {
  const url = `${BACKEND_API_URL}/users/contacts/${contactId}`;
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

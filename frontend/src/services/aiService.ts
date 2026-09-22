import { BACKEND_API_URL } from '../constants/api';
import { getAuthData } from './storageService';

/**
 * Sends a chat message query to the backend AI Emergency Assistant.
 * Retrieves authenticated user credentials from storage and attaches the Bearer token.
 */
export async function sendChatMessage(message: string): Promise<string> {
  const url = `${BACKEND_API_URL}/ai/chat`;
  
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
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`HTTP Error ${response.status}: ${errorText || response.statusText}`);
  }

  const data = await response.json();
  return data.response;
}

import { BACKEND_API_URL } from '../constants/api';
import { getAuthData } from './storageService';

export interface NotificationItem {
  notificationId: string;
  title: string;
  message: string;
  notificationType: 'SOS_ALERT' | 'GEOFENCE_EVENT' | 'MONITORING_EVENT' | 'CONTACT_EVENT' | 'SYSTEM_EVENT';
  createdAt: string;
  isRead: boolean;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

/**
 * Fetches the user's notification history.
 */
export async function getNotifications(): Promise<NotificationItem[]> {
  const url = `${BACKEND_API_URL}/notifications`;
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
 * Fetches the count of unread notifications.
 */
export async function getUnreadCount(): Promise<number> {
  const url = `${BACKEND_API_URL}/notifications/unread-count`;
  const session = await getAuthData();
  if (!session || !session.token) {
    return 0;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.token}`,
      },
    });

    if (!response.ok) return 0;
    const data: UnreadCountResponse = await response.json();
    return data.unreadCount;
  } catch (error) {
    console.error('[NotificationService] Error fetching unread count:', error);
    return 0;
  }
}

/**
 * Marks a single notification as read.
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const url = `${BACKEND_API_URL}/notifications/read/${notificationId}`;
  const session = await getAuthData();
  if (!session || !session.token) {
    throw new Error('Authentication session not found.');
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${session.token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`HTTP Error ${response.status}: ${errorText || response.statusText}`);
  }
}

/**
 * Marks all notifications as read.
 */
export async function markAllAsRead(): Promise<void> {
  const url = `${BACKEND_API_URL}/notifications/read-all`;
  const session = await getAuthData();
  if (!session || !session.token) {
    throw new Error('Authentication session not found.');
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${session.token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`HTTP Error ${response.status}: ${errorText || response.statusText}`);
  }
}

/**
 * Deletes a single notification.
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const url = `${BACKEND_API_URL}/notifications/${notificationId}`;
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

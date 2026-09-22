import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@carewave_auth_token';
const USER_KEY = '@carewave_auth_user';

export interface AuthenticatedUser {
  userId: string;
  firstName: string;
  contactNumber: string;
}

export interface AuthSession {
  token: string;
  user: AuthenticatedUser;
}

/**
 * Saves authenticated user session to local persistent storage.
 */
export async function saveAuthData(token: string, user: AuthenticatedUser): Promise<void> {
  console.log('[Storage] Saving auth token and user meta.');
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('[Storage] Error saving auth data:', error);
    throw error;
  }
}

/**
 * Retrieves authenticated user session from local persistent storage.
 */
export async function getAuthData(): Promise<AuthSession | null> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const userJson = await AsyncStorage.getItem(USER_KEY);
    if (token && userJson) {
      return { token, user: JSON.parse(userJson) };
    }
  } catch (error) {
    console.error('[Storage] Error loading auth data:', error);
  }
  return null;
}

/**
 * Clears local persistent session storage data.
 */
export async function clearAuthData(): Promise<void> {
  console.log('[Storage] Clearing local session data.');
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('[Storage] Error clearing auth data:', error);
    throw error;
  }
}

const SETTINGS_KEY = '@carewave_app_settings';

export interface AppSettings {
  notifications: boolean;
  soundAlerts: boolean;
  vibrationAlerts: boolean;
}

/**
 * Saves frontend-only settings (notifications, sound, vibration switches) locally.
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('[Storage] Error saving app settings:', error);
  }
}

/**
 * Retrieves local frontend settings, falling back to enabled by default.
 */
export async function getSettings(): Promise<AppSettings> {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    if (json) {
      return JSON.parse(json);
    }
  } catch (error) {
    console.error('[Storage] Error loading app settings:', error);
  }
  return {
    notifications: true,
    soundAlerts: true,
    vibrationAlerts: true,
  };
}

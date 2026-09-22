import { BACKEND_API_URL } from '../constants/api';
import { getAuthData } from './storageService';

export interface EmergencyResponseData {
  emergencyId: string;
  emergencyStatus: string;
  emergencyType: string;
  createdAt?: string;
}

export interface FireConfiguration {
  fireSeverity: 'LOW' | 'MEDIUM' | 'HIGH';
  evacuationMessage: string;
  emergencyRadiusKm: number;
}

/**
 * Single source of truth for Fire severity configurations (evacuation message & radius presets).
 */
export function getFireConfiguration(severity: 'LOW' | 'MEDIUM' | 'HIGH'): FireConfiguration {
  const messages = {
    LOW: 'Small fire reported. Please stay alert and clear the immediate area.',
    MEDIUM: 'Spreading fire reported. Evacuate the area immediately.',
    HIGH: 'Major fire reported! Evacuate immediately and contact emergency services.'
  };
  const radii = {
    LOW: 0.5,
    MEDIUM: 1.0,
    HIGH: 2.0
  };
  return {
    fireSeverity: severity,
    evacuationMessage: messages[severity],
    emergencyRadiusKm: radii[severity]
  };
}

/**
 * Creates a new emergency request on the backend.
 * Retrieves authenticated user credentials from storage, and makes the POST /emergency request.
 */
export async function createEmergency(
  latitude: number,
  longitude: number,
  emergencyType: string,
  fireSeverity?: string,
  evacuationMessage?: string,
  emergencyRadiusKm?: number
): Promise<EmergencyResponseData> {
  const url = `${BACKEND_API_URL}/emergency`;
  
  const session = await getAuthData();
  if (!session || !session.token || !session.user || !session.user.userId) {
    throw new Error('Authentication session not found or invalid.');
  }

  const payload: any = {
    userId: session.user.userId,
    latitude,
    longitude,
    emergencyType,
  };

  if (fireSeverity) payload.fireSeverity = fireSeverity;
  if (evacuationMessage) payload.evacuationMessage = evacuationMessage;
  if (emergencyRadiusKm !== undefined) payload.emergencyRadiusKm = emergencyRadiusKm;

  console.log(`[${emergencyType === 'POLICE' ? 'Police' : emergencyType === 'FIRE' ? 'Fire' : 'Emergency'} Request]`);
  console.log(`Endpoint URL: ${url}`);
  console.log(`Payload: ${JSON.stringify(payload, null, 2)}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    });

    console.log(`[${emergencyType === 'POLICE' ? 'Police' : emergencyType === 'FIRE' ? 'Fire' : 'Emergency'} Response Status]`);
    console.log(`Status Code: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP Error ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    console.log(`[${emergencyType === 'POLICE' ? 'Police' : emergencyType === 'FIRE' ? 'Fire' : 'Emergency'} Response Body]`);
    console.log(`Response Body: ${JSON.stringify(data, null, 2)}`);

    return data as EmergencyResponseData;
  } catch (error: any) {
    console.log(`[${emergencyType === 'POLICE' ? 'Police' : emergencyType === 'FIRE' ? 'Fire' : 'Emergency'} Error]`);
    console.log(`Error Details: ${error.message || error}`);
    throw error;
  }
}

/**
 * Creates a new medical emergency request on the backend.
 * Wrapper around createEmergency for backwards compatibility.
 */
export async function createMedicalEmergency(latitude: number, longitude: number): Promise<EmergencyResponseData> {
  return createEmergency(latitude, longitude, 'MEDICAL');
}

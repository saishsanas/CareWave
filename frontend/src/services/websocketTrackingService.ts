import { BACKEND_WS_URL } from "../constants/api";
import { getAuthData } from "./storageService";

type LocationCallback = (location: { latitude: number; longitude: number }) => void;

class WebSocketTrackingService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private subscribedTopic: string | null = null;
  private locationCallback: LocationCallback | null = null;

  public async connect(protectedUserId: string, onLocationReceived?: LocationCallback): Promise<boolean> {
    const authData = await getAuthData();
    const token = authData?.token;
    if (!token) {
      console.warn("[WebSocketTracking] No auth token available");
      return false;
    }

    this.locationCallback = onLocationReceived || null;
    this.subscribedTopic = `/topic/tracking/${protectedUserId}`;

    return new Promise((resolve) => {
      try {
        const wsUrl = `${BACKEND_WS_URL}/ws`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log("[WebSocketTracking] Connection opened, sending STOMP CONNECT");
          const connectFrame = `CONNECT\naccept-version:1.2,1.1,1.0\nAuthorization:Bearer ${token}\n\n\0`;
          this.ws?.send(connectFrame);
        };

        this.ws.onmessage = (event) => {
          const message = event.data as string;
          if (message.startsWith("CONNECTED")) {
            console.log("[WebSocketTracking] STOMP CONNECTED successfully");
            this.isConnected = true;
            this.reconnectAttempts = 0;

            if (this.subscribedTopic) {
              const subFrame = `SUBSCRIBE\nid:sub-0\ndestination:${this.subscribedTopic}\n\n\0`;
              this.ws?.send(subFrame);
              console.log("[WebSocketTracking] Subscribed to topic:", this.subscribedTopic);
            }
            resolve(true);
          } else if (message.startsWith("MESSAGE")) {
            try {
              const bodyIndex = message.indexOf("\n\n");
              if (bodyIndex !== -1) {
                const bodyStr = message.substring(bodyIndex + 2).replace(/\0/g, "").trim();
                if (bodyStr) {
                  const data = JSON.parse(bodyStr);
                  if (data.latitude != null && data.longitude != null && this.locationCallback) {
                    this.locationCallback({ latitude: data.latitude, longitude: data.longitude });
                  }
                }
              }
            } catch (e) {
              console.error("[WebSocketTracking] Failed to parse message body:", e);
            }
          }
        };

        this.ws.onerror = (error) => {
          console.warn("[WebSocketTracking] Error:", error);
          resolve(false);
        };

        this.ws.onclose = () => {
          console.log("[WebSocketTracking] Connection closed");
          this.isConnected = false;
          this.scheduleReconnect(protectedUserId);
        };
      } catch (err) {
        console.error("[WebSocketTracking] Setup failed:", err);
        resolve(false);
      }
    });
  }

  public sendLocationUpdate(latitude: number, longitude: number, gpsEnabled: boolean = true) {
    if (!this.ws || !this.isConnected) {
      return false;
    }
    try {
      const payload = JSON.stringify({ latitude, longitude, gpsEnabled });
      const sendFrame = `SEND\ndestination:/app/tracking.update\ncontent-type:application/json\n\n${payload}\0`;
      this.ws.send(sendFrame);
      return true;
    } catch (e) {
      console.error("[WebSocketTracking] Send failed:", e);
      return false;
    }
  }

  private scheduleReconnect(protectedUserId: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn("[WebSocketTracking] Max reconnect attempts reached. Falling back to REST polling.");
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    console.log(`[WebSocketTracking] Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.connect(protectedUserId, this.locationCallback || undefined);
    }, delay);
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        const discFrame = "DISCONNECT\n\n\0";
        this.ws.send(discFrame);
        this.ws.close();
      } catch (ignored) {}
      this.ws = null;
    }
    this.isConnected = false;
    this.subscribedTopic = null;
    this.locationCallback = null;
    console.log("[WebSocketTracking] Disconnected cleanly");
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const webSocketTrackingService = new WebSocketTrackingService();

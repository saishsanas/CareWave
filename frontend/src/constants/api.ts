import { Platform } from "react-native";

const DEFAULT_PRODUCTION_URL = "https://carewave-backend-m2f1.onrender.com";


const DEFAULT_LOCAL_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:8080"
    : "http://localhost:8080";

export const BACKEND_API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_API_URL ||
  (__DEV__ ? DEFAULT_LOCAL_URL : DEFAULT_PRODUCTION_URL);


const DEFAULT_LOCAL_WS_URL =
  Platform.OS === "android"
    ? "ws://10.0.2.2:8080"
    : "ws://localhost:8080";

export const BACKEND_WS_URL =
  process.env.EXPO_PUBLIC_WS_URL ||
  process.env.EXPO_PUBLIC_BACKEND_WS_URL ||
  (BACKEND_API_URL.startsWith("https://")
    ? BACKEND_API_URL.replace("https://", "wss://")
    : BACKEND_API_URL.startsWith("http://")
    ? BACKEND_API_URL.replace("http://", "ws://")
    : DEFAULT_LOCAL_WS_URL);

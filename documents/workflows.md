# CareWave System Workflows & External Integrations

This document details the core operational workflows and third-party service integrations within the CareWave platform.

---

## 🚨 Emergency SOS Workflow

```text
User presses SOS
        │
        ▼
Backend creates Emergency Event & Persists to Database
        │
        ▼
Redis Active Tracking Session Created (`carewave:active-tracking:{emergencyId}`)
        │
        ▼
Kafka Event Published (`carewave-emergency-events`)
        │
        ▼
Guardian Notification via Firebase Cloud Messaging (FCM) & SMS
        │
        ▼
Live Tracking Session Starts over STOMP WebSocket (`/ws`)
        │
        ▼
Guardian Opens Live Tracking Screen
        │
        ▼
Location Updated & Streamed Every 5 Seconds
        │
        ▼
Emergency Ends / Cancelled / Resolved
        │
        ▼
Redis Session Cleaned Up & Tracking Stops
```

---

## 🛡️ GeoFence Monitoring Workflow

```text
User Creates Safe Zone
        │
        ▼
Background Location Updates
        │
        ▼
User Exits Safe Zone
        │
        ▼
Exit Cooldown Initiated
        │
        ▼
GeoFence Breach Detected
        │
        ▼
Guardian Notification Sent via FCM
        │
        ▼
Live Tracking Session Activated
        │
        ▼
Guardian Tracks User Location
        │
        ▼
User Returns to Safe Zone
        │
        ▼
Tracking Automatically Deactivated
```

---

## 🌍 Disaster Monitoring Workflow

```text
Scheduled Monitoring Job
      │
      ▼
USGS Earthquake API & Weather Service Query
      │
      ▼
Process Environmental / Seismic Data
      │
      ▼
Store Disaster Event in MySQL
      │
      ▼
Compare Active User Geospatial Locations
      │
      ▼
Notify Affected Users
      │
      ▼
Notify Guardians of At-Risk Users
```

---

## 🌐 External Integrations

| Service | Purpose |
| :--- | :--- |
| **Firebase Cloud Messaging (FCM)** | Real-time push notifications for SOS & GeoFence alerts |
| **Twilio API** | Emergency SMS alerts |
| **Gemini AI API** | AI-powered emergency assistant guidance |
| **USGS Earthquake API** | Real-time seismic event detection |
| **OpenStreetMap / React Native Maps** | Geolocation mapping & hospital navigation |

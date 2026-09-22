<div align="center">

<p align="center">
<img src="assets/carewave_logo.png" width="170"/>
</p>

# 🚨 CareWave — Intelligent Personal Emergency & Disaster Safety System

> **Final-Year B.E. Computer Engineering Capstone Project**  
> **Team Lead & Backend/System Architect:** Saish Sanas ([@saishsanas](https://github.com/saishsanas))  
> **Canonical Repository:** [https://github.com/saishsanas/CareWave](https://github.com/saishsanas/CareWave)

![Java](https://img.shields.io/badge/Java-21-orange)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5.13-brightgreen)
![React Native](https://img.shields.io/badge/React_Native-0.81.5-blue)
![Expo](https://img.shields.io/badge/Expo-SDK_54-black)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)
![Redis](https://img.shields.io/badge/Redis-7.x-red)
![Kafka](https://img.shields.io/badge/Apache_Kafka-3.x-black)
![Firebase](https://img.shields.io/badge/Firebase-FCM-yellow)

</div>

---

## 📌 Overview

**CareWave** is an enterprise-grade, real-time personal safety, emergency SOS, and disaster alert system built to protect individuals during critical situations. The platform seamlessly connects mobile end-users with emergency contacts, nearby medical/emergency services, and automated alert broadcast networks via high-availability backend microservices.

This repository contains the **complete, verified full-stack implementation** comprising both the Spring Boot backend service (`/backend`) and the React Native / Expo mobile application (`/frontend`), alongside project documentation, research papers, and architectural design specifications.

---

## ✨ Key Capabilities

- 🚨 **One-Tap SOS Emergency System**: Immediate emergency triggers with GPS location broadcast, automated contact alerts, and notification routing.
- 📍 **Real-Time Live Location Tracking**: STOMP over WebSocket real-time location streaming powered by an active Redis cache session with automated MySQL persistence.
- 🛡️ **Disaster & Geo-Fence Alerts**: Automated notifications for natural disasters (earthquakes, extreme weather) and custom geo-fence safe-zone breaches.
- ⏱️ **Safety Check-In & Timers**: Countdown-based safety monitoring with automated escalation upon missed check-ins.
- 🤖 **AI Emergency Assistant**: Intelligent guidance powered by Gemini AI API for emergency situations.
- 📞 **Concealed Safety Tools**: Discrete tools including fake call triggers and hazard navigation maps.

---

## 🏗 System Architecture

CareWave employs a decoupled, event-driven microservices-capable architecture designed for scale, fault tolerance, and ultra-low latency emergency routing.

```
+-------------------------------------------------------------------------+
|                       CareWave Mobile Client                            |
|             (React Native 0.81.5 / Expo SDK 54 / TypeScript)           |
+-------------------------------------------------------------------------+
       |                                          ^
  HTTP/REST (JWT Auth)                       WebSocket / STOMP
       |                                          |
       v                                          v
+-------------------------------------------------------------------------+
|                    Spring Boot 3.5.13 Backend                           |
|                      (Java 21 / Spring Security)                        |
|                                                                         |
|  [Auth Filter / Rate Limiter] -> [REST Controllers]                     |
|  [STOMP Handler]             -> [Location Tracking Manager]              |
|  [Kafka Producer]            -> [Emergency Event Publisher]             |
+-------------------------------------------------------------------------+
   |                  |                    |                  |
   v                  v                    v                  v
+----------+    +--------------+    +--------------+   +---------------+
|  MySQL   |    |    Redis     |    | Apache Kafka |   | Firebase FCM  |
| (Relational|  | (Active Loc  |    | (Async Event |   | & Twilio      |
| Authorita-|   |  Session &   |    |  Processing &|   | (Push & SMS   |
|   tive)   |    | WebSocket)   |    |  Broadcast)  |   | Delivery)     |
+----------+    +--------------+    +--------------+   +---------------+
```

---

## 🛠 Technology Stack

### **Backend**
- **Framework**: Spring Boot 3.5.13 / Java 21
- **Database**: Native MySQL 8.0 (authoritative persistence with query-optimized indexing)
- **Active Tracking Cache**: Redis 7.x (ephemeral session state, TTL-managed key-value store)
- **Message Broker & Event Pipeline**: Apache Kafka (decoupled emergency event dispatch)
- **Real-Time Gateway**: Spring STOMP over WebSocket (`/ws`)
- **Security**: Spring Security, JWT authentication, sliding-window Rate-Limiting filter, sanitized exception responses
- **Third-Party Integrations**: Firebase Admin SDK (FCM), Twilio SMS Gateway

### **Frontend**
- **Framework**: React Native 0.81.5 (React 19.1.0) / Expo SDK 54 (TypeScript)
- **Maps & Geolocation**: `react-native-maps`, native geolocation API (`expo-location`)
- **Real-Time Client**: `@stomp/stompjs` WebSocket client with automatic fallback
- **State & Local Storage**: AsyncStorage with encrypted token preservation

---

## 👨‍💻 Team & Role Attribution

### **Project Team**
- **Saish Sanas** ([@saishsanas](https://github.com/saishsanas)) — **Team Lead & Backend/System Architect**
- **Moin Mankar** — Backend Developer
- **Mohd. Shaban Tabarak Ali** — Database Developer
- **Nakul Siricilla** — Frontend Developer
- **Prof. Vidya Rajput** — Project Guide

### **My Responsibilities & Technical Contributions**
- Led the 4-member engineering team throughout the capstone development lifecycle.
- Architected the Spring Boot 3.5.13 event-driven backend and database schema.
- Implemented real-time STOMP over WebSocket location tracking pipeline with Redis active session caching.
- Designed the decoupled Kafka emergency event publishing pipeline for idempotent notification dispatch.
- Implemented sliding-window rate-limiting security filters and sanitized exception handling.
- Coordinated integration testing, release assembly, and co-authored the published research paper.

---

## 📂 Repository Structure

```
CareWave/
├── backend/                  # Spring Boot 3.5.13 Java 21 Backend Application
│   ├── src/                  # Controllers, Services, Repositories, Entities, Configs
│   ├── Dockerfile            # Multi-stage production container build specification
│   ├── pom.xml               # Maven project definition and dependencies
│   └── mvnw.cmd / mvnw       # Maven wrapper scripts
├── frontend/                 # React Native 0.81.5 / Expo SDK 54 Mobile Application
│   ├── src/                  # Screens, Components, Services, Navigation, Utilities
│   ├── assets/               # Audio files, icons, splash images
│   ├── app.json              # Expo app configuration
│   └── package.json          # Node dependencies & scripts
├── architecture/             # Architecture diagrams (softwareArchiDiagram, blockdiagram)
├── assets/                   # App logos and media resources
├── documents/                # B.E. Project Report, Published Research Paper & Flowcharts
├── screenshots/              # 10 UI screen captures and feature showcase
├── .gitignore                # Root Git ignore rules
└── README.md                 # Master project documentation
```

---

## 📚 Project Documentation & Publications

This repository contains academic publications and technical reports located in the `documents/` directory:
- 📘 **Final B.E. Project Report**: `documents/CareWave_BE_Project_Report.pdf`
- 📄 **Published Research Paper**: `documents/ResearchPaperCarewave.pdf`
- 📄 **Review Paper**: `documents/Carewave_ReviewPaper.pdf`
- 📊 **Workflows & Flowcharts**: `documents/workflows.md`

---

## ⚙️ Quick Start Guide

### Prerequisites
- JDK 21+
- Node.js 18.x LTS+
- MySQL 8.0+
- Redis 7.x+
- Apache Kafka 3.x+

### 1. Backend Setup
```bash
cd backend
./mvnw clean test
./mvnw spring-boot:run
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npx expo start
```

### 3. Docker Container Execution
```bash
cd backend
docker build -t carewave-backend:latest .
docker run -p 8080:8080 carewave-backend:latest
```

---

## 📄 License & Intellectual Property

Developed as a Final-Year Bachelor of Engineering (B.E.) Capstone Engineering Project at Navsahyadri Group of Institutes (Savitribai Phule Pune University).  
All rights reserved © 2026 Saish Sanas & Team CareWave.
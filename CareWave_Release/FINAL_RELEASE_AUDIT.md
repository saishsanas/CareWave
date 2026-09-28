# CareWave — Final Android APK Release Audit

**Date:** September 28, 2026  
**Status:** RELEASE VERIFIED & READY FOR DISTRIBUTION  
**Build Target:** Production Android Standalone APK  
**Package Name:** `com.carewave.app`  
**Target Architecture:** Android arm64-v8a, armeabi-v7a, x86, x86_64  

---

## 1. Executive Summary

The production standalone release APK for **CareWave** has been compiled, packaged, signed, installed on the existing Android emulator (`Medium_Phone_API_35` / `emulator-5554`), launched into the foreground, and verified against the live Render production backend.

### Key Milestones Completed:
- ✅ **Clean Prebuild & Native Configuration:** Expo SDK 54 prebuild generated clean native Gradle files with package `com.carewave.app` and integrated Firebase Google Services (`google-services.json`).
- ✅ **Gradle Release Compilation:** Full release build completed with R8 minification, Hermes bytecode pre-compilation, and CMake C++ native toolchain compilation.
- ✅ **Standalone APK Artifact:** Generated and placed at both `c:\Projects\carewave\CareWave.apk` and `c:\Projects\carewave\CareWave_Release\CareWave.apk` with matching SHA-256 verification.
- ✅ **Emulator Deployment:** Successfully streamed and installed via ADB to running emulator `emulator-5554` without restarting or terminating the process.
- ✅ **Zero-Crash Foreground Execution:** Successfully launched `com.carewave.app/.MainActivity` into the foreground with active focus (`mCurrentFocus = Window{... com.carewave.app.MainActivity}`).
- ✅ **Production Backend Handshake:** Verified live HTTPS requests to `https://carewave-backend-m2f1.onrender.com`:
  - `POST /auth/check-user` → **HTTP 200 OK**
  - `POST /auth/send-email-otp` → **HTTP 200 OK** (Dispatched to verified email via Resend)
  - UI seamlessly rendered: Phone Login → Email Setup → OTP Security Checkpoint.

---

## 2. Release Artifact Information

| Field | Detail |
|---|---|
| **File Name** | `CareWave.apk` |
| **Locations** | `c:\Projects\carewave\CareWave.apk`<br>`c:\Projects\carewave\CareWave_Release\CareWave.apk` |
| **File Size** | 96,577,436 bytes (~92.10 MB) |
| **SHA-256 Checksum** | `1DF8D579FC16BFD4D3F9BE506FC4CE129FC851D11DB509244096446F62C5B1C2` |
| **Package Identifier** | `com.carewave.app` |
| **Target SDK / Min SDK** | Target SDK 36, Compile SDK 36, Min SDK 24 |
| **Engine** | Hermes (Bytecode Ahead-Of-Time compilation) |
| **Production API** | `https://carewave-backend-m2f1.onrender.com` |
| **Production WebSocket** | `wss://carewave-backend-m2f1.onrender.com` |

---

## 3. Build & Runtime Compatibility Fixes Applied

To ensure a release build without modifying architectural intent or adding features, two targeted compatibility fixes were applied:

1. **Path-Length & Windows Junction Mitigation:**
   - React Native New Architecture C++ codegen generates paths exceeding 260 characters (`CMAKE_OBJECT_PATH_MAX`) when building in deeply nested folders.
   - Built via temporary NTFS junction `C:\cw` with `bundle-wrapper.js` ensuring Metro bundles from the canonical path without Windows drive-letter concatenation artifacts. The junction was removed immediately upon build completion.

2. **Hermes Release Startup Order (`InitializeCore` & `FormData`):**
   - **Root Cause:** In Expo SDK 54, `expo` imports `./winter/runtime.native.ts` before `react-native`. `runtime.native.ts` executes `installFormDataPatch(FormData)`. In Hermes strict mode, evaluating bare identifier `FormData` before React Native's `setUpXHR.js` runs triggers `ReferenceError: Property 'FormData' doesn't exist`. Top-level `if` polyfills failed because ES6 module `import { registerRootComponent } from 'expo'` is hoisted before statement execution.
   - **Clean Source Fix:** Added `import 'react-native/Libraries/Core/InitializeCore';` at line 1 of `index.ts`. Because ES6 imports execute in order of declaration, `InitializeCore` evaluates first (module index 8 vs 268 for winter runtime), initializing `FormData`, `performance.now`, timers, and XHR globals cleanly before Expo's winter runtime executes.

---

## 4. Production Smoke Verification Evidence

### Step 1: App Launch & Activity Record
```
Starting: Intent { cmp=com.carewave.app/.MainActivity }
Status: ok
LaunchState: COLD
Activity: com.carewave.app/.MainActivity
TotalTime: 990
Complete
mCurrentFocus=Window{de8098d u0 com.carewave.app/com.carewave.app.MainActivity}
```

### Step 2: Production API Request Log (Check User)
```
[PhoneEntry] Checking user existence for number: 9999911111
[API Request] POST - https://carewave-backend-m2f1.onrender.com/auth/check-user
[API Payload] { "phoneNumber": "9999911111" }
[API Response Status] 200 - 
[API Response Body] { "exists": false }
[PhoneEntry] User does not exist. Directing to email capture.
```

### Step 3: Production API Request Log (Send OTP)
```
[PhoneEntry] Dispatched OTP to entered email: saishsanas@gmail.com for phone: 9999911111
[API Request] POST - https://carewave-backend-m2f1.onrender.com/auth/send-email-otp
[API Payload] { "email": "saishsanas@gmail.com", "phoneNumber": "9999911111" }
[API Response Status] 200 - 
```

### Step 4: UI Screen Progression (Saved in `CareWave_Release/screenshots/`)
1. `01_login_screen.png`: CareWave branding, phone number input with `+91` prefix, clean dark mode layout.
2. `02_email_setup.png`: Dynamic transition to email entry upon detecting new contact number.
3. `03_otp_verification.png`: 6-digit OTP verification screen with 30s cooldown timer and security checkpoint styling.

---

## 5. Security & Confidentiality Audit

- **Secrets Sanitization:** No passwords, JWT secrets, database connection strings, or third-party API keys were hardcoded or printed.
- **Git Hygiene:** Branch `main` remains clean with zero unnecessary commits.
- **Target Integrity:** Chronos repository untouched; Render/Aiven/Firebase production infrastructure configuration preserved without alteration.

---

## 6. Release Verdict

| Criteria | Status |
|---|---|
| Gradle Release Compilation | **PASS** |
| APK Signing & Packaging | **PASS** |
| Emulator Streamed Installation | **PASS** |
| Zero-Crash Foreground Execution | **PASS** |
| Production Backend Connection | **PASS (HTTP 200)** |
| Production OTP Dispatch | **PASS (HTTP 200)** |
| Artifact Preservation & Checksum | **PASS** |
| **FINAL RELEASE READINESS** | **APPROVED FOR DEPLOYMENT** |

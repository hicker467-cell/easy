# 📱 Student Attendance System — API & Mobile App Guide

A full-featured Student Attendance System built with **Next.js 16**, **MongoDB Atlas**, **GPS Geofencing**, and a complete REST API ready for building a **React Native / Flutter Android APK**.

---

## 🔗 Live Backend URL

| Environment | URL |
|---|---|
| Local Dev | `http://localhost:3000` |
| Android Emulator | `http://10.0.2.2:3000` |
| Production (Deploy on Vercel) | `https://your-vercel-url.vercel.app` |

---

## 🔑 Admin Credentials

| Field | Value |
|---|---|
| Email | `sudhir@gmail.com` |
| Password | `1234567890` |

---

## ✨ Features

1. 🖐️ **1-Tap Fingerprint Punch In/Out** (Offline Location & Online modes)
2. 📍 **Live GPS Coordinates & Geofence Office Distance** (meters)
3. 📝 **Mandatory Punch-Out Study Notes** (Min 30 characters)
4. 🎙️ **Voice Note Recording** (Audio base64 attachment on punch-out)
5. 🔄 **Live GPS Refresh** (Manual + Admin Live Track button)
6. 👁️ **Guest Visitor Tracker** (IP, Device, GPS, Screen, Referrer)
7. 📅 **Month-wise Calendar** with day-wise session logs
8. 📤 **CSV Export** for Admin
9. 🌐 **Google Maps Link** for every student & guest location
10. 🔒 **Google OAuth Login** (set env keys to activate)

---

## 🌍 Environment Variables (`.env.local`)

```env
# MongoDB Atlas
MONGODB_URI=your_mongodb_atlas_connection_string

# Google OAuth (Optional — set to activate real Google Login)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

## 📡 API Reference

### 1. Auth API — `POST /api/auth`

#### 🔑 Login
```json
{
  "action": "login",
  "email": "rahul@student.edu",
  "password": "yourpassword"
}
```

#### 📝 Register
```json
{
  "action": "register",
  "name": "Rahul Sharma",
  "email": "rahul@student.edu",
  "password": "yourpassword"
}
```

#### 🔓 Forgot Password — Send OTP
```json
{
  "action": "forgot-password",
  "email": "rahul@student.edu"
}
```

#### 🔢 Reset Password
```json
{
  "action": "reset-password",
  "email": "rahul@student.edu",
  "otp": "123456",
  "newPassword": "newpassword123"
}
```

#### 🔵 Google OAuth Login
```json
{
  "action": "google",
  "credential": "<google_jwt_token>"
}
```

---

### 2. Attendance API — `POST /api/attendance`

#### 🖐️ Punch In
```json
{
  "action": "punch-in",
  "studentId": "STU-2026-001",
  "studentName": "Rahul Sharma",
  "mode": "location",
  "location": { "latitude": 28.6139, "longitude": 77.2090 }
}
```
> `mode` = `"location"` (GPS/Offline) or `"online"`

#### 📝 Punch Out
```json
{
  "action": "punch-out",
  "attendanceId": "att_1710000000000",
  "notes": "Today I studied Next.js API design and GPS tracking for 3 hours.",
  "audioNote": "data:audio/webm;base64,GkXfo59..."
}
```
> `notes` must be at least **30 characters**

#### 🔄 Update Live GPS
```json
{
  "action": "update-location",
  "attendanceId": "att_1710000000000",
  "location": { "latitude": 28.6145, "longitude": 77.2095 }
}
```

#### 📜 Get Attendance Logs
```
GET /api/attendance?studentId=STU-2026-001
```

---

### 3. Admin API — `GET /api/admin`

```
GET /api/admin?month=2026-08
GET /api/admin?month=2026-08&studentId=STU-2026-001
```

Returns: `students`, `attendance`, `guestLogs`, `settings`

---

## 📱 React Native Example

```javascript
const BASE_URL = 'http://10.0.2.2:3000'; // Android Emulator

async function punchIn(studentId, studentName, lat, lng) {
  const res = await fetch(`${BASE_URL}/api/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'punch-in',
      studentId,
      studentName,
      mode: 'location',
      location: { latitude: lat, longitude: lng }
    })
  });
  return await res.json();
}
```

---

## 🤖 APK Build Guide (React Native)

You can build a native Android APK by connecting this Next.js backend to a React Native frontend:

### Step 1 — Create React Native App
```bash
npx react-native@latest init StudentApp
cd StudentApp
```

### Step 2 — Install Required Libraries
```bash
npm install @react-native-community/geolocation
npm install react-native-fingerprint-scanner
npm install @react-native-async-storage/async-storage
```

### Step 3 — Set Backend URL in App
```javascript
// config.js
export const API_BASE = 'https://your-vercel-url.vercel.app'; // Production
// OR for local: 'http://10.0.2.2:3000'
```

### Step 4 — Build APK
```bash
cd android
./gradlew assembleRelease
```
APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🛠️ Run Backend Locally

```bash
# Install dependencies
npm install

# Start Dev Server
npm run dev
# → http://localhost:3000

# Production Build
npm run build
```

---

## 🚀 Deploy on Vercel (Free)

```bash
npm install -g vercel
vercel
```

Add environment variables in Vercel Dashboard:
- `MONGODB_URI`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

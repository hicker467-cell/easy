# 📱 Student Attendance Mobile App API & Setup Guide

This document provides a complete guide and API reference for building a **Student Mobile App** (React Native, Flutter, Swift/iOS, Kotlin/Android, or Web) powered by this Next.js Backend.

---

## 🚀 Quick Overview

- **Base URL (Local Dev)**: `http://localhost:3000`
- **Base URL (Mobile Emulator)**: `http://10.0.2.2:3000` (Android Emulator) or `http://<YOUR_LOCAL_IP>:3000`
- **Authentication**: Email/Password login, Registration, 1-Click Google Login, and OTP Forgot Password Reset.
- **Key Features**:
  1. 🖐️ **1-Tap Fingerprint Punch In** (Offline Location & Online modes)
  2. 📍 **Live GPS Coordinates & Geofence Campus Distance**
  3. 📝 **Mandatory Punch-Out Study Notes** (Strict minimum of 30 characters)
  4. 🎙️ **Voice Note Recording** (Audio base64 attachment)
  5. 🔄 **Live GPS Refresh & Attendance History Logs**

---

## 📡 API Reference for Student Mobile App

### 1. Authentication API (`POST /api/auth`)

#### 🔑 A. Student Login
- **Endpoint**: `POST /api/auth`
- **Request Body**:
```json
{
  "action": "login",
  "email": "rahul@student.edu",
  "password": "yourpassword"
}
```
- **Response Success (200 OK)**:
```json
{
  "success": true,
  "user": {
    "studentId": "STU-2026-001",
    "name": "Rahul Sharma",
    "email": "rahul@student.edu",
    "role": "student"
  }
}
```

---

#### 📝 B. Student Registration
- **Endpoint**: `POST /api/auth`
- **Request Body**:
```json
{
  "action": "register",
  "name": "Rahul Sharma",
  "email": "rahul@student.edu",
  "password": "yourpassword"
}
```
- **Response Success (200 OK)**:
```json
{
  "success": true,
  "user": {
    "studentId": "STU-2026-001",
    "name": "Rahul Sharma",
    "email": "rahul@student.edu",
    "role": "student"
  }
}
```

---

#### 🔓 C. Forgot Password — Send OTP
- **Endpoint**: `POST /api/auth`
- **Request Body**:
```json
{
  "action": "forgot-password",
  "email": "rahul@student.edu"
}
```
- **Response Success**:
```json
{
  "success": true,
  "message": "OTP sent to your email! (Demo OTP: 123456)",
  "otp": "123456"
}
```

---

#### 🔢 D. Verify OTP & Reset Password
- **Endpoint**: `POST /api/auth`
- **Request Body**:
```json
{
  "action": "reset-password",
  "email": "rahul@student.edu",
  "otp": "123456",
  "newPassword": "newpassword123"
}
```
- **Response Success**:
```json
{
  "success": true,
  "message": "Password reset successfully!"
}
```

---

### 2. Attendance & Punch API (`/api/attendance`)

#### 🖐️ A. Punch In
- **Endpoint**: `POST /api/attendance`
- **Request Body**:
```json
{
  "action": "punch-in",
  "studentId": "STU-2026-001",
  "studentName": "Rahul Sharma",
  "mode": "location", 
  "location": {
    "latitude": 28.6139,
    "longitude": 77.2090
  }
}
```
*Note: `mode` can be `"location"` (Offline Location Mode) or `"online"` (Online Mode).*

- **Response Success**:
```json
{
  "success": true,
  "record": {
    "id": "att_1710000000000",
    "studentId": "STU-2026-001",
    "studentName": "Rahul Sharma",
    "date": "2026-08-01",
    "punchInTime": "2026-08-01T14:30:00.000Z",
    "mode": "location",
    "locationData": {
      "latitude": 28.6139,
      "longitude": 77.2090,
      "distanceMeters": 0,
      "withinRange": true,
      "isLeftCampus": false,
      "ipAddress": "192.168.1.17"
    },
    "status": "active"
  }
}
```

---

#### 📝 B. Punch Out (Requires Min 30 Chars Study Notes)
- **Endpoint**: `POST /api/attendance`
- **Request Body**:
```json
{
  "action": "punch-out",
  "attendanceId": "att_1710000000000",
  "notes": "Today I studied Next.js App Router API design and React Native GPS tracking for 3 hours.",
  "audioNote": "data:audio/webm;base64,GkXfo59ChoEBQ..."
}
```
*Note: `notes` must be at least 30 characters long.*

- **Response Success**:
```json
{
  "success": true,
  "record": {
    "id": "att_1710000000000",
    "studentId": "STU-2026-001",
    "punchOutTime": "2026-08-01T17:30:00.000Z",
    "durationMinutes": 180,
    "notes": "Today I studied Next.js App Router API design and React Native GPS tracking for 3 hours.",
    "status": "completed"
  }
}
```

---

#### 🔄 C. Refresh GPS Location / Live Ping
- **Endpoint**: `POST /api/attendance`
- **Request Body**:
```json
{
  "action": "update-location",
  "attendanceId": "att_1710000000000",
  "location": {
    "latitude": 28.6145,
    "longitude": 77.2095
  }
}
```
- **Response Success**:
```json
{
  "success": true
}
```

---

#### 📜 D. Get Student Attendance Logs & Active Session
- **Endpoint**: `GET /api/attendance?studentId=STU-2026-001`
- **Response Success**:
```json
{
  "success": true,
  "records": [
    {
      "id": "att_1710000000000",
      "studentId": "STU-2026-001",
      "date": "2026-08-01",
      "punchInTime": "2026-08-01T14:30:00.000Z",
      "punchOutTime": "2026-08-01T17:30:00.000Z",
      "mode": "location",
      "status": "completed",
      "notes": "Today I studied Next.js App Router API design and React Native GPS tracking for 3 hours."
    }
  ]
}
```

---

## 📱 Mobile App Code Snippet (React Native / JavaScript)

```javascript
// Example Punch In Call from Mobile App
async function punchInStudent(studentId, studentName, lat, lng, mode = 'location') {
  try {
    const response = await fetch('http://10.0.2.2:3000/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'punch-in',
        studentId: studentId,
        studentName: studentName,
        mode: mode,
        location: { latitude: lat, longitude: lng }
      })
    });
    const data = await response.json();
    if (data.success) {
      console.log('Punched in successfully!', data.record);
    } else {
      alert(data.error);
    }
  } catch (error) {
    console.error('Punch in error:', error);
  }
}
```

---

## 🛠️ How to Run Backend locally

```bash
# 1. Install dependencies
npm install

# 2. Start Dev Server
npm run dev

# Backend will run on http://localhost:3000
```

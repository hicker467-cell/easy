import mongoose from 'mongoose';

// In-Memory Fallback DB Store for local instant execution
let globalStore = {
  users: [
    {
      studentId: 'ADMIN-001',
      name: 'School Admin',
      email: 'sudhir@gmail.com',
      password: '1234567890',
      role: 'admin'
    },
    {
      studentId: 'STU-2026-001',
      name: 'Rahul Sharma',
      email: 'rahul@student.edu',
      password: 'password123',
      role: 'student'
    }
  ],
  attendance: [
    {
      id: 'att_1',
      studentId: 'STU-2026-001',
      studentName: 'Rahul Sharma',
      date: new Date().toISOString().split('T')[0],
      month: new Date().toISOString().substring(0, 7),
      punchInTime: new Date(Date.now() - 3600000 * 2).toISOString(),
      punchOutTime: new Date(Date.now() - 3600000).toISOString(),
      durationMinutes: 60,
      mode: 'location',
      locationData: {
        latitude: 28.6139,
        longitude: 77.2090,
        distanceMeters: 18,
        withinRange: true,
        isLeftCampus: false,
        ipAddress: '192.168.1.17'
      },
      notes: 'Today I studied React hooks, Next.js API route architecture, and Tailwind CSS v4 design principles.',
      audioNote: null,
      adminVoiceReply: null,
      status: 'completed'
    }
  ],
  guestAccessLogs: [
    {
      id: 'guest_1',
      ipAddress: '192.168.1.17',
      device: 'Windows PC (Chrome)',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0]
    }
  ],
  settings: {
    campusLat: 28.6139,
    campusLng: 77.2090,
    campusRadiusMeters: 200
  }
};

export function getStore() {
  return globalStore;
}

export async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    return null;
  }
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }
  try {
    return await mongoose.connect(MONGODB_URI);
  } catch (error) {
    console.warn('MongoDB connection failed. Using in-memory fallback store.', error.message);
    return null;
  }
}

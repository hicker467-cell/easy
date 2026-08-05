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
    }
  ],
  attendance: [],
  guestAccessLogs: [],
  settings: {
    campusLat: 28.4625,
    campusLng: 77.0300,
    campusRadiusMeters: 100
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

import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema(
  {
    campusLat: { type: Number, default: 28.6139 },
    campusLng: { type: Number, default: 77.2090 },
    campusRadiusMeters: { type: Number, default: 200 },
    adminPin: { type: String, default: 'admin123' }
  },
  { timestamps: true }
);

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

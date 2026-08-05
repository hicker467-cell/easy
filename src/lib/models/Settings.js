import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema(
  {
    campusLat: { type: Number, default: 28.4625 },
    campusLng: { type: Number, default: 77.0300 },
    campusRadiusMeters: { type: Number, default: 100 },
    adminPin: { type: String, default: 'admin123' }
  },
  { timestamps: true }
);

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

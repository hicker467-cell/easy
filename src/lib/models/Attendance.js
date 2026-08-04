import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    month: { type: String, required: true }, // YYYY-MM
    punchInTime: { type: Date, required: true },
    punchOutTime: { type: Date },
    durationMinutes: { type: Number, default: 0 },
    mode: { type: String, enum: ['location', 'online'], default: 'location' },
    classMode: { type: String, enum: ['offline', 'online'], default: 'offline' },
    locationData: {
      latitude: Number,
      longitude: Number,
      distanceMeters: Number,
      withinRange: Boolean,
      isLeftCampus: Boolean
    },
    notes: { type: String },
    audioNote: { type: String }, // Base64 audio clip
    adminVoiceReply: { type: String }, // Base64 admin voice reply
    adminReplyTime: { type: Date },
    status: { type: String, enum: ['active', 'completed'], default: 'active' }
  },
  { timestamps: true }
);

export default mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://sudhir10:sudhir10@ac-6ciz9cb-shard-00-00.s93owkp.mongodb.net:27017,ac-6ciz9cb-shard-00-01.s93owkp.mongodb.net:27017,ac-6ciz9cb-shard-00-02.s93owkp.mongodb.net:27017/?ssl=true&replicaSet=atlas-hs79l0-shard-0&authSource=admin&appName=Cluster0';

// User Schema
const UserSchema = new mongoose.Schema({
  studentId: String,
  name: String,
  email: String,
  password: String,
  role: String
});

// Attendance Schema
const AttendanceSchema = new mongoose.Schema({
  studentId: String,
  studentName: String,
  date: String,
  month: String,
  punchInTime: String,
  punchOutTime: String,
  durationMinutes: Number,
  mode: String,
  locationData: Object,
  notes: String,
  audioNote: String,
  adminVoiceReply: String,
  status: String
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);

const students = [
  { studentId: 'STU-2026-001', name: 'Student A', email: 'a@gmail.com', password: '123456', role: 'student' },
  { studentId: 'STU-2026-002', name: 'Student B', email: 'b@gmail.com', password: '123456', role: 'student' },
  { studentId: 'STU-2026-003', name: 'Student C', email: 'c@gmail.com', password: '123456', role: 'student' },
  { studentId: 'STU-2026-004', name: 'Student D', email: 'd@gmail.com', password: '123456', role: 'student' },
  { studentId: 'STU-2026-005', name: 'Student E', email: 'e@gmail.com', password: '123456', role: 'student' },
  { studentId: 'ADMIN-001', name: 'School Admin', email: 'sudhir@gmail.com', password: '1234567890', role: 'admin' }
];

async function seed() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!');

    // Clear all existing users and attendance
    console.log('🗑️  Clearing existing users and attendance...');
    await User.deleteMany({});
    await Attendance.deleteMany({});
    console.log('✅ Database cleared!');

    // Insert fresh students
    console.log('👤 Inserting 5 students + 1 admin...');
    await User.insertMany(students);
    console.log('✅ Students inserted!');

    console.log('\n📋 Accounts created:');
    students.forEach(s => {
      console.log(`  ${s.role === 'admin' ? '👑' : '🎓'} ${s.email} | Password: ${s.password} | ID: ${s.studentId}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Done! DB seeded successfully.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

seed();

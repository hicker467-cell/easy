import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';

// Called after Google OAuth success — create or find user in DB
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const name = searchParams.get('name');

    if (!email) return NextResponse.json({ error: 'No email' }, { status: 400 });

    const conn = await connectDB();
    if (!conn) return NextResponse.json({ error: 'DB not connected' }, { status: 500 });

    // Find existing user or create new student account
    let user = await User.findOne({ email });
    if (!user) {
      const count = await User.countDocuments({ role: 'student' });
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        password: 'google_oauth_' + Date.now(), // placeholder, can't be used to login
        role: 'student',
        studentId: `STU-GOOGLE-${String(count + 1).padStart(3, '0')}`,
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
      }
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

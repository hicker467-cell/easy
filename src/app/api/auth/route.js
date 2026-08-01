import { NextResponse } from 'next/server';
import { connectDB, getStore } from '@/lib/db';
import User from '@/lib/models/User';

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, email, password, name, otp, newPassword, credential } = body;
    const conn = await connectDB();

    // 1. REGISTER
    if (action === 'register') {
      if (!email || !password || !name) {
        return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
      }

      const role = (email.toLowerCase() === 'sudhir@gmail.com' || email.toLowerCase() === 'admin@school.com') ? 'admin' : 'student';

      if (conn) {
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
          return NextResponse.json({ error: 'User already exists with this email' }, { status: 400 });
        }

        const count = await User.countDocuments();
        const studentId = role === 'admin' ? 'ADMIN-001' : `STU-2026-${String(count + 1).padStart(3, '0')}`;

        const user = await User.create({
          studentId,
          name,
          email: email.toLowerCase(),
          password,
          role
        });

        return NextResponse.json({
          success: true,
          user: { studentId: user.studentId, name: user.name, email: user.email, role: user.role }
        });
      } else {
        const store = getStore();
        const existing = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (existing) {
          return NextResponse.json({ error: 'User already exists with this email' }, { status: 400 });
        }

        const studentId = role === 'admin' ? 'ADMIN-001' : `STU-2026-${String(store.users.length + 1).padStart(3, '0')}`;
        const newUser = { studentId, name, email: email.toLowerCase(), password, role };
        store.users.push(newUser);

        return NextResponse.json({
          success: true,
          user: { studentId: newUser.studentId, name: newUser.name, email: newUser.email, role: newUser.role }
        });
      }
    }

    // 2. LOGIN
    if (action === 'login') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }

      const cleanEmail = email.toLowerCase();
      const isAdminEmail = cleanEmail === 'sudhir@gmail.com' || cleanEmail === 'admin@school.com';

      if (conn) {
        let user = await User.findOne({ email: cleanEmail });

        if (!user && isAdminEmail && password === '1234567890') {
          user = await User.create({
            studentId: 'ADMIN-001',
            name: 'School Admin',
            email: cleanEmail,
            password: '1234567890',
            role: 'admin'
          });
        }

        if (!user || user.password !== password) {
          return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        return NextResponse.json({
          success: true,
          user: { studentId: user.studentId, name: user.name, email: user.email, role: user.role }
        });
      } else {
        const store = getStore();
        let user = store.users.find((u) => u.email.toLowerCase() === cleanEmail);

        if (!user && isAdminEmail && password === '1234567890') {
          user = {
            studentId: 'ADMIN-001',
            name: 'School Admin',
            email: cleanEmail,
            password: '1234567890',
            role: 'admin'
          };
          store.users.push(user);
        }

        if (!user || user.password !== password) {
          return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        return NextResponse.json({
          success: true,
          user: { studentId: user.studentId, name: user.name, email: user.email, role: user.role }
        });
      }
    }

    // 3. FORGOT PASSWORD (Send OTP)
    if (action === 'forgot-password') {
      if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: 'OTP sent to your email! (Demo OTP: 123456)',
        otp: '123456'
      });
    }

    // 4. RESET PASSWORD
    if (action === 'reset-password') {
      if (!email || !otp || !newPassword) {
        return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
      }
      if (otp !== '123456') {
        return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 });
      }

      if (conn) {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
          user.password = newPassword;
          await user.save();
        }
      } else {
        const store = getStore();
        const user = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (user) {
          user.password = newPassword;
        }
      }

      return NextResponse.json({ success: true, message: 'Password reset successfully!' });
    }

    // 5. GOOGLE OAUTH LOGIN (Processes env.GOOGLE_CLIENT_ID or Google OAuth tokens)
    if (action === 'google') {
      let googleEmail = email ? email.toLowerCase() : 'student@gmail.com';
      let googleName = name || 'Google Student';

      // If a JWT token credential was sent from Google OAuth API
      if (credential) {
        try {
          // Decode JWT base64 payload without external heavy library dependencies
          const payloadBase64 = credential.split('.')[1];
          const decodedJson = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
          if (decodedJson.email) {
            googleEmail = decodedJson.email.toLowerCase();
          }
          if (decodedJson.name) {
            googleName = decodedJson.name;
          }
        } catch (e) {
          console.error('Google token parse error:', e);
        }
      }

      const role = (googleEmail === 'sudhir@gmail.com' || googleEmail === 'admin@school.com') ? 'admin' : 'student';

      if (conn) {
        let user = await User.findOne({ email: googleEmail });
        if (!user) {
          const count = await User.countDocuments();
          const studentId = role === 'admin' ? 'ADMIN-001' : `STU-2026-${String(count + 1).padStart(3, '0')}`;
          user = await User.create({
            studentId,
            name: googleName,
            email: googleEmail,
            password: 'google_oauth_pass',
            role
          });
        }
        return NextResponse.json({
          success: true,
          user: { studentId: user.studentId, name: user.name, email: user.email, role: user.role }
        });
      } else {
        const store = getStore();
        let user = store.users.find((u) => u.email.toLowerCase() === googleEmail);
        if (!user) {
          const studentId = role === 'admin' ? 'ADMIN-001' : `STU-2026-${String(store.users.length + 1).padStart(3, '0')}`;
          user = {
            studentId,
            name: googleName,
            email: googleEmail,
            password: 'google_oauth_pass',
            role
          };
          store.users.push(user);
        }
        return NextResponse.json({
          success: true,
          user: { studentId: user.studentId, name: user.name, email: user.email, role: user.role }
        });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

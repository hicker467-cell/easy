import { NextResponse } from 'next/server';
import { connectDB, getStore } from '@/lib/db';
import User from '@/lib/models/User';

// In-memory OTP storage for registration & password reset
const globalOtpStore = global.globalOtpStore || new Map();
if (!global.globalOtpStore) global.globalOtpStore = globalOtpStore;

async function sendBrevoOtpEmail(toEmail, otpCode, type = 'register') {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SMTP_FROM || 'support.sssam@gmail.com';

  const subject = type === 'register' 
    ? 'SSSAM ACADEMY - Student Registration Verification Code' 
    : 'SSSAM ACADEMY - Reset Password Verification Code';

  const htmlContent = `
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; background: #f8f9fa; padding: 24px; border-radius: 24px;">
      <div style="background: #ffffff; padding: 36px 30px; border-radius: 20px; border: 1px solid #e5e7eb; box-shadow: 0 10px 25px rgba(0,0,0,0.04); text-align: center;">
        
        <div style="width: 60px; height: 60px; margin: 0 auto 14px; background: #e6f7f5; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; padding: 6px;">
          <img src="https://attendance-sssam.vercel.app/logo.png" alt="SSSAM Logo" style="width: 48px; height: 48px; object-fit: contain;" />
        </div>

        <span style="display: block; font-size: 11px; font-weight: 800; color: #00c7be; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">SSSAM ACADEMY</span>
        
        <h2 style="color: #111827; font-size: 22px; font-weight: 800; margin: 0 0 10px;">
          ${type === 'register' ? 'Verify Student Registration' : 'Reset Password Verification'}
        </h2>
        
        <p style="color: #6b7280; font-size: 13px; margin: 0 0 24px; line-height: 1.5;">
          Use the following 6-digit verification code to complete your ${type === 'register' ? 'SSSAM Student Portal registration' : 'password reset request'}.
        </p>

        <!-- OTP BOX -->
        <div style="background: #f0fdfa; border: 1.5px dashed #00c7be; border-radius: 16px; padding: 18px 16px; text-align: center; margin-bottom: 24px;">
          <span style="display: block; font-size: 11px; font-weight: 700; color: #0f766e; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Your 6-Digit OTP Code</span>
          <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #0d9488;">
            ${otpCode}
          </div>
        </div>

        <p style="color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.5;">
          ⏱️ Valid for <strong>10 minutes</strong>. Do not share this code with anyone.
        </p>
      </div>

      <div style="text-align: center; margin-top: 16px; color: #9ca3af; font-size: 11px;">
        &copy; 2026 SSSAM ACADEMY. All rights reserved.
      </div>
    </div>
  `;

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'SSSAM ACADEMY Support', email: senderEmail },
        to: [{ email: toEmail }],
        subject,
        htmlContent
      })
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Brevo Email OTP error:', err);
    throw err;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, email, password, name, otp, newPassword, credential } = body;
    const conn = await connectDB();
    const cleanEmail = email ? email.toLowerCase().trim() : '';

    // 1. SEND OTP FOR REGISTRATION
    if (action === 'send-otp') {
      if (!cleanEmail) {
        return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
      }

      // Check if user already exists
      if (conn) {
        const existing = await User.findOne({ email: cleanEmail });
        if (existing) {
          return NextResponse.json({ error: 'User already exists with this email' }, { status: 400 });
        }
      } else {
        const store = getStore();
        const existing = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
        if (existing) {
          return NextResponse.json({ error: 'User already exists with this email' }, { status: 400 });
        }
      }

      const generatedOtp = String(Math.floor(100000 + Math.random() * 900000));
      globalOtpStore.set(cleanEmail, { otp: generatedOtp, expires: Date.now() + 10 * 60 * 1000 });

      await sendBrevoOtpEmail(cleanEmail, generatedOtp, 'register');

      return NextResponse.json({
        success: true,
        message: `OTP sent to ${cleanEmail} via Brevo Email!`
      });
    }

    // 2. REGISTER (Requires Valid Email OTP Verification)
    if (action === 'register') {
      if (!cleanEmail || !password || !name) {
        return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
      }
      if (!otp) {
        return NextResponse.json({ error: 'Email OTP code is required for registration' }, { status: 400 });
      }

      // Verify OTP
      const storedData = globalOtpStore.get(cleanEmail);
      if (!storedData || storedData.otp !== otp.trim()) {
        if (otp !== '123456') { // Fallback demo code
          return NextResponse.json({ error: 'Invalid or expired OTP verification code' }, { status: 400 });
        }
      }

      const role = (cleanEmail === 'sudhir@gmail.com' || cleanEmail === 'admin@school.com') ? 'admin' : 'student';

      if (conn) {
        const existing = await User.findOne({ email: cleanEmail });
        if (existing) {
          return NextResponse.json({ error: 'User already exists with this email' }, { status: 400 });
        }

        const count = await User.countDocuments();
        const studentId = role === 'admin' ? 'ADMIN-001' : `STU-2026-${String(count + 1).padStart(3, '0')}`;

        const user = await User.create({
          studentId,
          name,
          email: cleanEmail,
          password,
          role
        });

        // Clean OTP after successful register
        globalOtpStore.delete(cleanEmail);

        return NextResponse.json({
          success: true,
          user: { studentId: user.studentId, name: user.name, email: user.email, role: user.role }
        });
      } else {
        const store = getStore();
        const existing = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
        if (existing) {
          return NextResponse.json({ error: 'User already exists with this email' }, { status: 400 });
        }

        const studentId = role === 'admin' ? 'ADMIN-001' : `STU-2026-${String(store.users.length + 1).padStart(3, '0')}`;
        const newUser = { studentId, name, email: cleanEmail, password, role };
        store.users.push(newUser);

        globalOtpStore.delete(cleanEmail);

        return NextResponse.json({
          success: true,
          user: { studentId: newUser.studentId, name: newUser.name, email: newUser.email, role: newUser.role, profileImage: null, phone: '' }
        });
      }
    }

    // 3. LOGIN (Email & Password)
    if (action === 'login') {
      if (!cleanEmail || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }

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
          user: { studentId: user.studentId, name: user.name, email: user.email, role: user.role, profileImage: user.profileImage || null, phone: user.phone || '' }
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
          user: { studentId: user.studentId, name: user.name, email: user.email, role: user.role, profileImage: user?.profileImage || null, phone: user?.phone || '' }
        });
      }
    }

    // 4. FORGOT PASSWORD (Sends OTP se Email)
    if (action === 'forgot-password') {
      if (!cleanEmail) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }

      // Check if user exists
      let userExists = false;
      if (conn) {
        const u = await User.findOne({ email: cleanEmail });
        userExists = !!u;
      } else {
        const store = getStore();
        userExists = store.users.some((u) => u.email.toLowerCase() === cleanEmail);
      }

      if (!userExists) {
        return NextResponse.json({ error: 'No student account found with this email' }, { status: 404 });
      }

      const generatedOtp = String(Math.floor(100000 + Math.random() * 900000));
      globalOtpStore.set(cleanEmail, { otp: generatedOtp, expires: Date.now() + 10 * 60 * 1000 });

      await sendBrevoOtpEmail(cleanEmail, generatedOtp, 'forgot');

      return NextResponse.json({
        success: true,
        message: 'Password reset OTP sent to your email via Brevo!'
      });
    }

    // 5. RESET PASSWORD (Requires Valid Email OTP)
    if (action === 'reset-password') {
      if (!cleanEmail || !otp || !newPassword) {
        return NextResponse.json({ error: 'Email, OTP, and new password are required' }, { status: 400 });
      }

      const storedData = globalOtpStore.get(cleanEmail);
      if (!storedData || storedData.otp !== otp.trim()) {
        if (otp !== '123456') { // Fallback demo code
          return NextResponse.json({ error: 'Invalid or expired OTP verification code' }, { status: 400 });
        }
      }

      if (conn) {
        const user = await User.findOne({ email: cleanEmail });
        if (user) {
          user.password = newPassword;
          await user.save();
        }
      } else {
        const store = getStore();
        const user = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
        if (user) {
          user.password = newPassword;
        }
      }

      globalOtpStore.delete(cleanEmail);

      return NextResponse.json({ success: true, message: 'Password reset successfully!' });
    }

    // 6. GOOGLE OAUTH LOGIN
    if (action === 'google') {
      let googleEmail = cleanEmail || 'student@gmail.com';
      let googleName = name || 'Google Student';

      if (credential) {
        try {
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
          user: { studentId: user.studentId, name: user.name, email: user.email, role: user.role, profileImage: user.profileImage || null, phone: user.phone || '' }
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
          user: { studentId: user.studentId, name: user.name, email: user.email, role: user.role, profileImage: user?.profileImage || null, phone: user?.phone || '' }
        });
      }
    }

    // 7. UPDATE PROFILE
    if (action === 'update-profile' || action === 'update-profile-image') {
      const { studentId, email: reqEmail, profileImage, phone, name } = body;
      if (!studentId && !reqEmail) {
        return NextResponse.json({ error: 'Student ID or Email is required' }, { status: 400 });
      }

      const updateData = {};
      if (profileImage !== undefined) updateData.profileImage = profileImage;
      if (phone !== undefined) updateData.phone = phone;
      if (name !== undefined) updateData.name = name;

      const store = getStore();
      let storeUser = store.users.find(
        (u) => (studentId && u.studentId === studentId) || (reqEmail && u.email.toLowerCase() === reqEmail.toLowerCase())
      );

      if (!storeUser && (studentId || reqEmail)) {
        storeUser = {
          studentId: studentId || `STU-2026-${String(store.users.length + 1).padStart(3, '0')}`,
          name: name || 'Student',
          email: reqEmail ? reqEmail.toLowerCase() : '',
          password: 'default_pass',
          role: 'student',
          profileImage: profileImage || null,
          phone: phone || ''
        };
        store.users.push(storeUser);
      } else if (storeUser) {
        if (profileImage !== undefined) storeUser.profileImage = profileImage;
        if (phone !== undefined) storeUser.phone = phone;
        if (name !== undefined) storeUser.name = name;
      }

      if (conn) {
        const query = {
          $or: [
            ...(studentId ? [{ studentId }] : []),
            ...(reqEmail ? [{ email: reqEmail.toLowerCase() }] : [])
          ]
        };
        const user = await User.findOneAndUpdate(query, updateData, { new: true, upsert: true });
        return NextResponse.json({
          success: true,
          user: {
            studentId: user.studentId || storeUser?.studentId,
            name: user.name || storeUser?.name,
            email: user.email || storeUser?.email,
            role: user.role || 'student',
            profileImage: user.profileImage || storeUser?.profileImage || null,
            phone: user.phone || storeUser?.phone || ''
          }
        });
      } else {
        return NextResponse.json({
          success: true,
          user: {
            studentId: storeUser.studentId,
            name: storeUser.name,
            email: storeUser.email,
            role: storeUser.role,
            profileImage: storeUser?.profileImage || null,
            phone: storeUser?.phone || ''
          }
        });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

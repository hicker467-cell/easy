import { NextResponse } from 'next/server';
import { connectDB, getStore } from '@/lib/db';
import User from '@/lib/models/User';
import Attendance from '@/lib/models/Attendance';
import Settings from '@/lib/models/Settings';

function getClientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '192.168.1.17';
}

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || new Date().toISOString().substring(0, 7);
    const studentId = searchParams.get('studentId');

    const conn = await connectDB();
    const store = getStore();

    if (conn) {
      const studentQuery = { $or: [{ role: 'student' }, { role: { $exists: false } }] };
      const rawStudents = await User.find(studentQuery).select('-password').lean();

      const studentMap = new Map();

      // First populate with store users
      store.users.filter(u => u.role === 'student' || !u.role).forEach(u => {
        const key = u.studentId || u.email.toLowerCase();
        studentMap.set(key, {
          studentId: u.studentId,
          name: u.name,
          email: u.email,
          role: u.role || 'student',
          profileImage: u.profileImage || null,
          phone: u.phone || ''
        });
      });

      // Override with DB users if present
      rawStudents.forEach(s => {
        const key = s.studentId || s.email.toLowerCase();
        const existing = studentMap.get(key) || {};
        studentMap.set(key, {
          studentId: s.studentId || existing.studentId,
          name: s.name || existing.name,
          email: s.email || existing.email,
          role: s.role || existing.role || 'student',
          profileImage: s.profileImage || existing.profileImage || null,
          phone: s.phone || existing.phone || ''
        });
      });

      let students = Array.from(studentMap.values());
      if (studentId) students = students.filter(s => s.studentId === studentId);

      const attQuery = { month };
      if (studentId) attQuery.studentId = studentId;
      const attendance = await Attendance.find(attQuery).sort({ createdAt: -1 });

      let settings = await Settings.findOne();
      if (!settings) {
        settings = { campusLat: 28.4625, campusLng: 77.0300, campusRadiusMeters: 100 };
      }

      return NextResponse.json({
        success: true,
        students,
        attendance,
        guestLogs: store.guestAccessLogs || [],
        settings
      });
    } else {
      let students = store.users.filter((u) => u.role === 'student' || !u.role);
      if (studentId) students = students.filter((u) => u.studentId === studentId);

      let attendance = store.attendance.filter((r) => r.month === month);
      if (studentId) attendance = attendance.filter((r) => r.studentId === studentId);

      return NextResponse.json({
        success: true,
        students,
        attendance,
        guestLogs: store.guestAccessLogs || [],
        settings: store.settings
      });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, pin, campusLat, campusLng, campusRadiusMeters, device, userAgent, location, details } = body;
    const conn = await connectDB();

    let settings = null;
    if (conn) {
      const s = await Settings.findOne();
      if (s) settings = s;
    } else {
      settings = getStore().settings;
    }

    if (action === 'verify-pin') {
      const isAuthorized = pin === '1234567890';
      return NextResponse.json({ authorized: isAuthorized });
    }

    // Create / Add New Student Account with Password
    if (action === 'create-student') {
      const { name, email, studentId, phone, password, classMode } = body;

      if (!name || !email || !password) {
        return NextResponse.json({ error: 'Name, Email and Password are required.' }, { status: 400 });
      }

      const cleanEmail = email.toLowerCase().trim();
      const finalStudentId = studentId && studentId.trim() !== ''
        ? studentId.trim().toUpperCase()
        : `STU-2026-${String(Math.floor(100 + Math.random() * 900))}`;

      if (conn) {
        const existingEmail = await User.findOne({ email: cleanEmail });
        if (existingEmail) {
          return NextResponse.json({ error: 'A student account with this Email already exists.' }, { status: 400 });
        }
        const existingId = await User.findOne({ studentId: finalStudentId });
        if (existingId) {
          return NextResponse.json({ error: 'A student account with this Student ID already exists.' }, { status: 400 });
        }

        const newUser = await User.create({
          studentId: finalStudentId,
          name,
          email: cleanEmail,
          phone: phone || '',
          password,
          role: 'student',
          classMode: classMode || 'offline'
        });

        // Also sync into in-memory store
        const store = getStore();
        store.users.push({
          studentId: newUser.studentId,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          password: newUser.password,
          role: 'student',
          classMode: newUser.classMode
        });

        return NextResponse.json({
          success: true,
          message: 'Student account created successfully!',
          student: {
            studentId: newUser.studentId,
            name: newUser.name,
            email: newUser.email,
            phone: newUser.phone,
            role: 'student',
            profileImage: null,
            classMode: newUser.classMode
          }
        });
      } else {
        const store = getStore();
        const existingEmail = store.users.find(u => u.email.toLowerCase() === cleanEmail);
        if (existingEmail) {
          return NextResponse.json({ error: 'A student account with this Email already exists.' }, { status: 400 });
        }
        const existingId = store.users.find(u => u.studentId === finalStudentId);
        if (existingId) {
          return NextResponse.json({ error: 'A student account with this Student ID already exists.' }, { status: 400 });
        }

        const newUser = {
          studentId: finalStudentId,
          name,
          email: cleanEmail,
          phone: phone || '',
          password,
          role: 'student',
          profileImage: null,
          classMode: classMode || 'offline'
        };
        store.users.push(newUser);

        return NextResponse.json({
          success: true,
          message: 'Student account created successfully!',
          student: newUser
        });
      }
    }

    if (action === 'update-geofence') {
      if (conn) {
        let setObj = await Settings.findOne();
        if (!setObj) {
          setObj = new Settings({ campusLat, campusLng, campusRadiusMeters });
        } else {
          setObj.campusLat = campusLat;
          setObj.campusLng = campusLng;
          setObj.campusRadiusMeters = campusRadiusMeters;
        }
        await setObj.save();
        return NextResponse.json({ success: true, settings: setObj });
      } else {
        const store = getStore();
        store.settings = {
          campusLat: parseFloat(campusLat),
          campusLng: parseFloat(campusLng),
          campusRadiusMeters: parseInt(campusRadiusMeters)
        };
        return NextResponse.json({ success: true, settings: store.settings });
      }
    }

    // Log Unauthenticated Guest Access with Location Coordinates
    if (action === 'log-guest-access') {
      const ip = getClientIp(req);
      const store = getStore();
      const { guestId, ipDetails } = body;

      let lat = location?.latitude || null;
      let lng = location?.longitude || null;
      let accuracy = location?.accuracy || null;
      let dist = (lat && lng && settings?.campusLat && settings?.campusLng)
        ? calculateDistanceMeters(lat, lng, settings.campusLat, settings.campusLng)
        : null;

      // If guestId sent — update existing log location
      if (guestId) {
        const existing = store.guestAccessLogs.find((g) => g.id === guestId);
        if (existing && lat && lng) {
          existing.locationData = { latitude: lat, longitude: lng, distanceMeters: dist, accuracy };
          existing.lastLocationUpdate = new Date().toISOString();
        }
        return NextResponse.json({ success: true, guestId });
      }

      // New guest log
      const newLog = {
        id: `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        publicIp: ip,
        privateIpV4: ipDetails?.privateV4 || null,
        privateIpV6: ipDetails?.privateV6 || null,
        allIPs: ipDetails?.allIPs || [],
        ipAddress: ip, // keep for backward compat
        device: device || 'Mobile/Desktop Device',
        userAgent: userAgent || req.headers.get('user-agent') || 'Unknown Browser',
        locationData: (lat && lng) ? {
          latitude: lat,
          longitude: lng,
          distanceMeters: dist,
          accuracy
        } : null,
        platform: details?.platform || 'Unknown OS',
        timezone: details?.timezone || 'Asia/Kolkata',
        language: details?.language || 'en-US',
        screenRes: details?.screenRes || 'Standard Display',
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        isLive: true
      };

      const lastLog = store.guestAccessLogs[0];
      if (!lastLog || lastLog.publicIp !== ip || (Date.now() - new Date(lastLog.timestamp).getTime()) > 60000) {
        store.guestAccessLogs.unshift(newLog);
      }

      return NextResponse.json({ success: true, log: newLog });
    }

    // Delete a single guest log by id
    if (action === 'delete-guest') {
      const { guestId } = body;
      const store = getStore();
      store.guestAccessLogs = store.guestAccessLogs.filter((g) => g.id !== guestId);
      return NextResponse.json({ success: true });
    }

    // Delete ALL guest logs
    if (action === 'delete-all-guests') {
      const store = getStore();
      store.guestAccessLogs = [];
      return NextResponse.json({ success: true });
    }

    // Refresh a single guest's latest data from store
    if (action === 'refresh-guest') {
      const { guestId } = body;
      const store = getStore();
      const guest = store.guestAccessLogs.find((g) => g.id === guestId);
      if (!guest) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      guest.lastRefreshed = new Date().toISOString();
      return NextResponse.json({ success: true, guest });
    }

    // Delete a single student user (Temporary / Permanent Remove)
    if (action === 'delete-student') {
      const { targetStudentId } = body;
      if (!targetStudentId) {
        return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
      }

      if (conn) {
        await User.deleteOne({ studentId: targetStudentId });
        await Attendance.deleteMany({ studentId: targetStudentId });
      } else {
        const store = getStore();
        store.users = store.users.filter((u) => u.studentId !== targetStudentId);
        store.attendance = store.attendance.filter((a) => a.studentId !== targetStudentId);
      }
      return NextResponse.json({ success: true, message: 'Student removed successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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

    if (conn) {
      const studentQuery = { role: 'student' };
      if (studentId) studentQuery.studentId = studentId;
      const students = await User.find(studentQuery).select('-password');

      const attQuery = { month };
      if (studentId) attQuery.studentId = studentId;
      const attendance = await Attendance.find(attQuery).sort({ createdAt: -1 });

      let settings = await Settings.findOne();
      if (!settings) {
        settings = { campusLat: 28.6139, campusLng: 77.2090, campusRadiusMeters: 200 };
      }

      return NextResponse.json({
        success: true,
        students,
        attendance,
        guestLogs: getStore().guestAccessLogs || [],
        settings
      });
    } else {
      const store = getStore();
      let students = store.users.filter((u) => u.role === 'student');
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

    let settings = { campusLat: 28.6139, campusLng: 77.2090, campusRadiusMeters: 200 };
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

      let lat = location?.latitude || 28.6140;
      let lng = location?.longitude || 77.2091;
      let dist = calculateDistanceMeters(lat, lng, settings.campusLat, settings.campusLng);

      const newLog = {
        id: `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        ipAddress: ip,
        device: device || 'Mobile/Desktop Device',
        userAgent: userAgent || req.headers.get('user-agent') || 'Unknown Browser',
        locationData: {
          latitude: lat,
          longitude: lng,
          distanceMeters: dist
        },
        platform: details?.platform || 'Unknown OS',
        timezone: details?.timezone || 'Asia/Kolkata',
        language: details?.language || 'en-US',
        referrer: details?.referrer || 'Direct Link / WhatsApp',
        screenRes: details?.screenRes || 'Standard Display',
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0]
      };
      
      const lastLog = store.guestAccessLogs[0];
      if (!lastLog || lastLog.ipAddress !== ip || (Date.now() - new Date(lastLog.timestamp).getTime()) > 60000) {
        store.guestAccessLogs.unshift(newLog);
      }

      return NextResponse.json({ success: true, log: newLog });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

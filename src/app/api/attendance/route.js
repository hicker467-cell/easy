import { NextResponse } from 'next/server';
import { connectDB, getStore } from '@/lib/db';
import Attendance from '@/lib/models/Attendance';
import Settings from '@/lib/models/Settings';

function getCampusSettings(store) {
  return store ? store.settings : { campusLat: 28.6139, campusLng: 77.2090, campusRadiusMeters: 200 };
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

function getClientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '192.168.1.17'; // Fallback network IP
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const month = searchParams.get('month');
    const date = searchParams.get('date');

    const conn = await connectDB();

    if (conn) {
      const query = {};
      if (studentId) query.studentId = studentId;
      if (month) query.month = month;
      if (date) query.date = date;
      const records = await Attendance.find(query).sort({ createdAt: -1 });
      return NextResponse.json({ success: true, records });
    } else {
      let records = getStore().attendance;
      if (studentId) records = records.filter((r) => r.studentId === studentId);
      if (month) records = records.filter((r) => r.month === month);
      if (date) records = records.filter((r) => r.date === date);
      records.sort((a, b) => new Date(b.punchInTime) - new Date(a.punchInTime));
      return NextResponse.json({ success: true, records });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, studentId, studentName, mode, location, notes, audioNote, attendanceId, adminVoiceReply } = body;
    const conn = await connectDB();

    const clientIp = getClientIp(req);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const monthStr = dateStr.substring(0, 7);

    // Get Settings for campus location
    let settings = getCampusSettings(getStore());
    if (conn) {
      const s = await Settings.findOne();
      if (s) settings = s;
    }

    if (action === 'punch-in') {
      let existingActive = false;
      if (conn) {
        existingActive = await Attendance.findOne({ studentId, status: 'active' });
      } else {
        existingActive = getStore().attendance.find((r) => r.studentId === studentId && r.status === 'active');
      }

      if (existingActive) {
        return NextResponse.json({ error: 'You are already punched in!' }, { status: 400 });
      }

      let dist = 0;
      let withinRange = true;
      let isLeftCampus = false;

      if (location?.latitude && location?.longitude) {
        dist = calculateDistanceMeters(
          location.latitude,
          location.longitude,
          settings.campusLat,
          settings.campusLng
        );
        withinRange = dist <= settings.campusRadiusMeters;
        isLeftCampus = mode === 'location' ? !withinRange : false;
      }

      const locationObj = {
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        distanceMeters: dist,
        withinRange,
        isLeftCampus,
        ipAddress: clientIp
      };

      if (conn) {
        const record = await Attendance.create({
          studentId,
          studentName,
          date: dateStr,
          month: monthStr,
          punchInTime: now,
          mode: mode || 'location',
          locationData: locationObj,
          status: 'active'
        });
        return NextResponse.json({ success: true, record });
      } else {
        const newRecord = {
          id: `att_${Date.now()}`,
          studentId,
          studentName,
          date: dateStr,
          month: monthStr,
          punchInTime: now.toISOString(),
          punchOutTime: null,
          durationMinutes: 0,
          mode: mode || 'location',
          locationData: locationObj,
          notes: null,
          audioNote: null,
          adminVoiceReply: null,
          status: 'active'
        };
        getStore().attendance.unshift(newRecord);
        return NextResponse.json({ success: true, record: newRecord });
      }
    }

    if (action === 'update-location') {
      if (location?.latitude && location?.longitude) {
        const dist = calculateDistanceMeters(
          location.latitude,
          location.longitude,
          settings.campusLat,
          settings.campusLng
        );
        const isLeftCampus = dist > settings.campusRadiusMeters;

        if (conn) {
          await Attendance.findByIdAndUpdate(attendanceId, {
            'locationData.latitude': location.latitude,
            'locationData.longitude': location.longitude,
            'locationData.distanceMeters': dist,
            'locationData.withinRange': !isLeftCampus,
            'locationData.isLeftCampus': isLeftCampus,
            'locationData.ipAddress': clientIp
          });
        } else {
          const rec = getStore().attendance.find((r) => r.id === attendanceId || r._id === attendanceId);
          if (rec) {
            rec.locationData.latitude = location.latitude;
            rec.locationData.longitude = location.longitude;
            rec.locationData.distanceMeters = dist;
            rec.locationData.withinRange = !isLeftCampus;
            rec.locationData.isLeftCampus = isLeftCampus;
            rec.locationData.ipAddress = clientIp;
          }
        }
      }
      return NextResponse.json({ success: true });
    }

    // Refresh Live Track Ping for single record
    if (action === 'refresh-live-track') {
      let record = null;
      if (conn) {
        record = await Attendance.findById(attendanceId);
      } else {
        record = getStore().attendance.find((r) => r.id === attendanceId || r._id === attendanceId);
      }

      if (record && record.locationData?.latitude && record.locationData?.longitude) {
        const dist = calculateDistanceMeters(
          record.locationData.latitude,
          record.locationData.longitude,
          settings.campusLat,
          settings.campusLng
        );
        const isLeftCampus = dist > settings.campusRadiusMeters;
        record.locationData.distanceMeters = dist;
        record.locationData.withinRange = !isLeftCampus;
        record.locationData.isLeftCampus = isLeftCampus;
        if (!record.locationData.ipAddress) {
          record.locationData.ipAddress = clientIp;
        }

        if (conn) await record.save();
      }
      return NextResponse.json({ success: true, record });
    }

    if (action === 'punch-out') {
      if (!notes || notes.trim().length < 30) {
        return NextResponse.json(
          { error: 'Mandatory notes must be at least 30 characters long' },
          { status: 400 }
        );
      }

      if (conn) {
        const record = await Attendance.findById(attendanceId);
        if (!record) return NextResponse.json({ error: 'Active session not found' }, { status: 404 });

        const punchIn = new Date(record.punchInTime);
        const durationMin = Math.max(1, Math.round((now.getTime() - punchIn.getTime()) / (1000 * 60)));

        record.punchOutTime = now;
        record.durationMinutes = durationMin;
        record.notes = notes.trim();
        if (audioNote) record.audioNote = audioNote;
        record.status = 'completed';
        await record.save();

        return NextResponse.json({ success: true, record });
      } else {
        const rec = getStore().attendance.find((r) => r.id === attendanceId || r._id === attendanceId);
        if (!rec) return NextResponse.json({ error: 'Active session not found' }, { status: 404 });

        const punchIn = new Date(rec.punchInTime);
        const durationMin = Math.max(1, Math.round((now.getTime() - punchIn.getTime()) / (1000 * 60)));

        rec.punchOutTime = now.toISOString();
        rec.durationMinutes = durationMin;
        rec.notes = notes.trim();
        if (audioNote) rec.audioNote = audioNote;
        rec.status = 'completed';

        return NextResponse.json({ success: true, record: rec });
      }
    }

    if (action === 'admin-voice-reply') {
      if (!adminVoiceReply) {
        return NextResponse.json({ error: 'Audio voice reply is required' }, { status: 400 });
      }
      if (conn) {
        await Attendance.findByIdAndUpdate(attendanceId, {
          adminVoiceReply,
          adminReplyTime: now
        });
      } else {
        const rec = getStore().attendance.find((r) => r.id === attendanceId || r._id === attendanceId);
        if (rec) {
          rec.adminVoiceReply = adminVoiceReply;
          rec.adminReplyTime = now.toISOString();
        }
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

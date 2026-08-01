'use client';
import { useState, useEffect } from 'react';
import {
  Calendar,
  Search,
  MapPin,
  Globe,
  Clock,
  ShieldCheck,
  Download,
  X,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Settings,
  Building,
  Navigation,
  RotateCw,
  Network,
  UserCheck,
  Eye,
  Smartphone,
  Compass,
  Monitor,
  Share2
} from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';

export default function AdminDashboard({ currentUser }) {
  const [adminTab, setAdminTab] = useState('calendar'); // 'calendar' | 'location' | 'guests'
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [guestLogs, setGuestLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cardRefreshing, setCardRefreshing] = useState({});

  // Admin PIN Protection or logged in admin user
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(currentUser?.role === 'admin');
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Office Location Modal State
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [officeLat, setOfficeLat] = useState(28.6139);
  const [officeLng, setOfficeLng] = useState(77.2090);
  const [officeRadius, setOfficeRadius] = useState(200);
  const [officeSaved, setOfficeSaved] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      setIsAdminUnlocked(true);
    }
  }, [currentUser]);

  // Selected Date Modal
  const [selectedDate, setSelectedDate] = useState(null);

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const url = `/api/admin?month=${selectedMonth}${selectedStudentId ? `&studentId=${selectedStudentId}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setStudents(data.students || []);
        setAttendance(data.attendance || []);
        setGuestLogs(data.guestLogs || []);
        if (data.settings) {
          setOfficeLat(data.settings.campusLat);
          setOfficeLng(data.settings.campusLng);
          setOfficeRadius(data.settings.campusRadiusMeters);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const refreshSingleStudentLiveLocation = async (attendanceId) => {
    setCardRefreshing((prev) => ({ ...prev, [attendanceId]: true }));
    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh-live-track', attendanceId })
      });
      await fetchAttendanceData();
    } catch (err) {
      console.error(err);
    } finally {
      setCardRefreshing((prev) => ({ ...prev, [attendanceId]: false }));
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedMonth, selectedStudentId]);

  const verifyPin = async (e) => {
    e.preventDefault();
    setPinError('');
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-pin', pin: pinInput })
      });
      const data = await res.json();
      if (data.authorized) {
        setIsAdminUnlocked(true);
        setShowAdminPinModal(false);
      } else {
        setPinError('Incorrect PIN (1234567890)');
      }
    } catch (err) {
      setPinError('Verification failed');
    }
  };

  const useCurrentLocationForOffice = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOfficeLat(pos.coords.latitude);
        setOfficeLng(pos.coords.longitude);
        setFetchingGps(false);
      },
      (err) => {
        alert('Could not get current location. Please allow GPS permissions.');
        setFetchingGps(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSaveOffice = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-geofence',
          campusLat: officeLat,
          campusLng: officeLng,
          campusRadiusMeters: officeRadius
        })
      });
      const data = await res.json();
      if (data.success) {
        setOfficeSaved(true);
        setTimeout(() => {
          setOfficeSaved(false);
          setShowOfficeModal(false);
        }, 1200);
      }
    } catch (err) {
      alert('Failed to save office location');
    }
  };

  const sendAdminVoiceReply = async (attendanceId, audioBase64) => {
    if (!audioBase64) return;
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin-voice-reply',
          attendanceId,
          adminVoiceReply: audioBase64
        })
      });
      if (res.ok) {
        alert('Voice reply sent!');
        fetchAttendanceData();
      }
    } catch (err) {
      alert('Failed to send voice reply');
    }
  };

  // Export CSV
  const exportCSV = () => {
    const headers = ['Student ID', 'Student Name', 'Date', 'Punch In', 'Punch Out', 'Duration (Mins)', 'Mode', 'Office Distance (m)', 'IP Address', 'Study Notes'];
    const rows = attendance.map((r) => [
      `"${r.studentId}"`,
      `"${r.studentName}"`,
      `"${r.date}"`,
      `"${new Date(r.punchInTime).toLocaleTimeString()}"`,
      `"${r.punchOutTime ? new Date(r.punchOutTime).toLocaleTimeString() : 'Active'}"`,
      `"${r.durationMinutes || 0}"`,
      `"${r.mode}"`,
      `"${r.locationData?.distanceMeters || 0}"`,
      `"${r.locationData?.ipAddress || '192.168.1.17'}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Build Calendar Days Array (1 to 31)
  const getDaysInMonth = (yearMonthStr) => {
    const [y, m] = yearMonthStr.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    const days = [];
    while (date.getMonth() === m - 1) {
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        dayNumber: date.getDate(),
        dateStr,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' })
      });
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const daysList = getDaysInMonth(selectedMonth);

  // Group Attendance by Date
  const dateMap = attendance.reduce((acc, rec) => {
    if (!acc[rec.date]) acc[rec.date] = [];
    acc[rec.date].push(rec);
    return acc;
  }, {});

  // Filter students by Name, Student ID, or Email
  const filteredStudents = students.filter((s) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = s.name ? s.name.toLowerCase().includes(query) : false;
    const idMatch = s.studentId ? s.studentId.toLowerCase().includes(query) : false;
    const emailMatch = s.email ? s.email.toLowerCase().includes(query) : false;
    return nameMatch || idMatch || emailMatch;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Top Admin Controls */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Admin Portal</h2>
            <p className="text-xs text-slate-500">Student attendance logs & office location tracking</p>
          </div>

          <div className="flex items-center gap-2">
            
            {/* Set Office Location Button */}
            <button
              onClick={() => setShowOfficeModal(true)}
              title="Set Office Location & Geofence Radius"
              className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 flex items-center gap-1.5 text-xs font-bold"
            >
              <Building className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Set Office Location</span>
            </button>

            {!isAdminUnlocked && (
              <button
                onClick={() => setShowAdminPinModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Admin Unlock</span>
              </button>
            )}

            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-sm hover:bg-emerald-600"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* 3 Sub-Tabs: Calendar vs Student Location vs Guest Visitors (Security) */}
        <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200">
          <button
            onClick={() => setAdminTab('calendar')}
            className={`flex-1 py-1.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              adminTab === 'calendar'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>Attendance Calendar</span>
          </button>

          <button
            onClick={() => setAdminTab('location')}
            className={`flex-1 py-1.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              adminTab === 'location'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-rose-500" />
            <span>Student Locations</span>
          </button>

          <button
            onClick={() => setAdminTab('guests')}
            className={`flex-1 py-1.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              adminTab === 'guests'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            <span>Guest Visitors ({guestLogs.length})</span>
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Search Student</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Name, ID, or Email..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Student Filter</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Students ({filteredStudents.length})</option>
              {filteredStudents.map((s) => (
                <option key={s.studentId} value={s.studentId}>
                  {s.name} ({s.studentId} - {s.email})
                </option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* TAB 1: CALENDAR VIEW */}
      {adminTab === 'calendar' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Month Grid ({selectedMonth})</h3>
            <span className="text-xs text-slate-400">Click date box to view study details</span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {daysList.map((day) => {
              const dayRecords = dateMap[day.dateStr] || [];
              const hasRecords = dayRecords.length > 0;

              return (
                <button
                  key={day.dateStr}
                  onClick={() => setSelectedDate(day.dateStr)}
                  className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between h-20 ${
                    hasRecords
                      ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-500 hover:shadow-md'
                      : 'bg-slate-50/50 border-slate-150 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-slate-900">{day.dayNumber}</span>
                    <span className="text-[9px] text-slate-400 uppercase font-mono">{day.dayName}</span>
                  </div>

                  {hasRecords ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md w-fit">
                      {dayRecords.length} Session{dayRecords.length > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400">No logs</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: STUDENT LOCATIONS, DISTANCE & IP ADDRESS */}
      {adminTab === 'location' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          
          {/* Office Location Info */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2 text-xs">
            <Building className="w-4 h-4 text-indigo-600" />
            <div>
              <span className="font-bold text-slate-900 block">Office Center Location</span>
              <span className="text-[11px] text-slate-500 font-mono">
                {officeLat}, {officeLng} (Allowed Radius: {officeRadius}m)
              </span>
            </div>
          </div>

          {attendance.length === 0 ? (
            <p className="py-8 text-center text-slate-400 text-xs italic">No location records available.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {attendance.map((rec) => {
                const recId = rec.id || rec._id;
                const lat = rec.locationData?.latitude || 28.6140;
                const lng = rec.locationData?.longitude || 77.2091;
                const dist = rec.locationData?.distanceMeters || 0;
                const isLeft = rec.locationData?.isLeftCampus;
                const ip = rec.locationData?.ipAddress || '192.168.1.17';
                const mapLink = `https://maps.google.com/?q=${lat},${lng}`;
                const isSpinning = cardRefreshing[recId];

                return (
                  <div key={recId} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900">{rec.studentName}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">{rec.studentId}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Live Track Refresh Button */}
                        <button
                          onClick={() => refreshSingleStudentLiveLocation(recId)}
                          disabled={isSpinning}
                          title="Fetch current student live GPS location"
                          className="px-2 py-1 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm"
                        >
                          <RotateCw className={`w-3 h-3 text-emerald-600 ${isSpinning ? 'animate-spin' : ''}`} />
                          <span>{isSpinning ? 'Tracking...' : '🔄 Live Track'}</span>
                        </button>

                        {rec.mode === 'online' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center gap-1">
                            <Globe className="w-3 h-3 text-indigo-600" /> Online Mode
                          </span>
                        ) : isLeft ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Left Office Area
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Inside Office
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Live Distance, Coordinates & IP Address */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                        <span className="text-[11px] font-bold text-slate-500">Live Office Distance:</span>
                        <span className={`font-extrabold font-mono text-xs ${isLeft ? 'text-rose-600' : 'text-emerald-600'}`}>
                          📍 {dist} meters away ({rec.mode === 'location' ? 'Location Mode' : 'Online Mode'})
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>Coordinates: <strong>{lat.toFixed(4)}, {lng.toFixed(4)}</strong></span>
                        <span>Date: <strong>{rec.date}</strong></span>
                      </div>

                      {/* Student IP Address display directly below location */}
                      <div className="flex items-center justify-between text-[10px] text-indigo-600 font-mono bg-indigo-50/70 px-2 py-0.5 rounded-md border border-indigo-100">
                        <span className="flex items-center gap-1 font-bold">
                          <Network className="w-3 h-3 text-indigo-500" /> IP Address:
                        </span>
                        <span className="font-extrabold">{ip}</span>
                      </div>
                    </div>

                    {/* View Google Maps Link */}
                    <a
                      href={mapLink}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>📍 View Location on Google Maps ({rec.mode.toUpperCase()})</span>
                    </a>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GUEST VISITORS & LINK SHARING SECURITY (With GPS Location & Google Maps Link) */}
      {adminTab === 'guests' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Guest Visitors & Link Sharing Tracker</h3>
              <p className="text-xs text-slate-500">Tracks unauthenticated users who opened the website link with GPS Location</p>
            </div>
            <button
              onClick={fetchAttendanceData}
              className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" /> Refresh Guests
            </button>
          </div>

          {guestLogs.length === 0 ? (
            <p className="py-8 text-center text-slate-400 text-xs italic">No guest visits recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {guestLogs.map((log) => {
                const lat = log.locationData?.latitude || 28.6140;
                const lng = log.locationData?.longitude || 77.2091;
                const dist = log.locationData?.distanceMeters || 0;
                const mapLink = `https://maps.google.com/?q=${lat},${lng}`;

                return (
                  <div key={log.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                          <Smartphone className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-900">{log.device}</h4>
                          <p className="text-[10px] text-slate-400 font-mono">Access Date: {log.date}</p>
                        </div>
                      </div>

                      <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-800 text-[11px] font-extrabold font-mono flex items-center gap-1 border border-slate-300">
                        <Network className="w-3.5 h-3.5 text-indigo-600" /> IP: {log.ipAddress}
                      </span>
                    </div>

                    {/* Guest Location & Office Distance Card (Same as Student format) */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                        <span className="text-[11px] font-bold text-slate-500">Guest Office Distance:</span>
                        <span className="font-extrabold font-mono text-xs text-indigo-600">
                          📍 {dist} meters away from Office
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>Coordinates: <strong>{lat.toFixed(4)}, {lng.toFixed(4)}</strong></span>
                        <span>Access Time: <strong>{new Date(log.timestamp).toLocaleTimeString()}</strong></span>
                      </div>
                    </div>

                    {/* Rich Device Fingerprint Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                      <div className="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Monitor className="w-3 h-3 text-slate-400" /> Display Screen:
                        </span>
                        <strong className="text-slate-800">{log.screenRes || 'Standard Display'}</strong>
                      </div>

                      <div className="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Compass className="w-3 h-3 text-slate-400" /> Timezone / Language:
                        </span>
                        <strong className="text-slate-800">{log.timezone || 'Asia/Kolkata'} ({log.language || 'en-US'})</strong>
                      </div>

                      <div className="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between sm:col-span-2">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Share2 className="w-3 h-3 text-indigo-500" /> Link Source / Referrer:
                        </span>
                        <strong className="text-indigo-700">{log.referrer || 'Direct Link / WhatsApp Share'}</strong>
                      </div>
                    </div>

                    {/* View Guest Location on Google Maps */}
                    <a
                      href={mapLink}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>📍 View Guest GPS Pin on Google Maps</span>
                    </a>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* OFFICE LOCATION SETTINGS MODAL */}
      {showOfficeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Set Office Location</h3>
              </div>
              <button
                onClick={() => setShowOfficeModal(false)}
                className="p-1 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {officeSaved && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Office location updated!
              </div>
            )}

            <button
              type="button"
              onClick={useCurrentLocationForOffice}
              disabled={fetchingGps}
              className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors"
            >
              <Navigation className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span>{fetchingGps ? 'Fetching GPS...' : '📍 Use My Current Location'}</span>
            </button>

            <form onSubmit={handleSaveOffice} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Office Latitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={officeLat}
                  onChange={(e) => setOfficeLat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Office Longitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={officeLng}
                  onChange={(e) => setOfficeLng(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Allowed Radius (Meters)</label>
                <input
                  type="number"
                  required
                  value={officeRadius}
                  onChange={(e) => setOfficeRadius(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOfficeModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/20 hover:bg-indigo-500"
                >
                  Save Office
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ADMIN PIN MODAL */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-xs bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <h3 className="text-base font-bold text-slate-900">Admin PIN Access</h3>
            {pinError && <p className="text-xs text-rose-600 font-bold">{pinError}</p>}
            <form onSubmit={verifyPin} className="space-y-3">
              <input
                type="password"
                required
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter PIN (1234567890)"
                className="w-full text-center py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminPinModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DAY DETAIL MODAL */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Study Logs for Date</h3>
                <p className="text-xs text-emerald-600 font-mono font-bold">{selectedDate}</p>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-1 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!dateMap[selectedDate] || dateMap[selectedDate].length === 0 ? (
              <p className="py-8 text-center text-slate-400 text-xs italic">No attendance recorded on this day.</p>
            ) : (
              <div className="space-y-3">
                {dateMap[selectedDate].map((rec) => (
                  <div key={rec.id || rec._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <h4 className="font-bold text-slate-900">{rec.studentName}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">{rec.studentId}</p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[11px]">
                        {rec.mode === 'location' ? '🟢 Location' : '🔵 Online'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>In: {new Date(rec.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>Out: {rec.punchOutTime ? new Date(rec.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}</span>
                    </div>

                    {rec.notes && (
                      <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 space-y-1">
                        <span className="text-[10px] text-emerald-600 font-bold uppercase block">
                          Mandatory Studied Topics (30+ Chars):
                        </span>
                        <p className="leading-relaxed">{rec.notes}</p>
                      </div>
                    )}

                    {rec.audioNote && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block">Student Voice Note:</span>
                        <audio controls src={rec.audioNote} className="w-full h-7" />
                      </div>
                    )}

                    {isAdminUnlocked && (
                      <div className="pt-2 border-t border-slate-200 space-y-2">
                        <span className="text-[10px] font-bold text-slate-600 block">Admin Voice Reply:</span>
                        {rec.adminVoiceReply ? (
                          <audio controls src={rec.adminVoiceReply} className="w-full h-7" />
                        ) : (
                          <VoiceRecorder
                            label="Send Voice Reply"
                            onAudioRecorded={(base64) => sendAdminVoiceReply(rec.id || rec._id, base64)}
                          />
                        )}
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

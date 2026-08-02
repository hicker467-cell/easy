'use client';
import { useState, useEffect, useRef } from 'react';
import { Fingerprint, MapPin, Globe, Clock, FileText, CheckCircle2, RotateCw, AlertCircle, MessageSquare, X } from 'lucide-react';

export default function StudentDashboard({
  currentUser,
  setCurrentUser,
  activeTab = 'punch',
  setActiveTab,
  onOpenAuth,
  triggerProfileModal,
  setTriggerProfileModal,
  triggerSupportModal,
  setTriggerSupportModal
}) {
  const [mode, setMode] = useState('offline');
  const [pendingModeSwitch, setPendingModeSwitch] = useState(null);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [distFromCampus, setDistFromCampus] = useState(null);
  const [refreshingGps, setRefreshingGps] = useState(false);
  const [refreshingLogs, setRefreshingLogs] = useState(false);
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);

  // Office location fetched from admin settings
  const [officeLat, setOfficeLat] = useState(null);
  const [officeLng, setOfficeLng] = useState(null);

  const [activeSession, setActiveSession] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // Month-wise Attendance Calendar State for Student
  const [studentMonth, setStudentMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedStudentDate, setSelectedStudentDate] = useState(null);
  const [studentPage, setStudentPage] = useState(1);
  const [selectedDayDetailModal, setSelectedDayDetailModal] = useState(null);
  const [attendanceSubTab, setAttendanceSubTab] = useState('calendar'); // 'calendar' or 'logs'

  // Profile Upload & Phone Modal State
  const [showPhotoNoticeModal, setShowPhotoNoticeModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone || '');
  const [tempProfileImage, setTempProfileImage] = useState(currentUser?.profileImage || null);
  const [profileError, setProfileError] = useState('');
  const profileFileInputRef = useRef(null);

  useEffect(() => {
    if (currentUser?.profileImage) {
      setTempProfileImage(currentUser.profileImage);
    }
    if (currentUser?.phone) {
      setProfilePhone(currentUser.phone);
    }
  }, [currentUser]);

  const [supportError, setSupportError] = useState('');
  const [notesError, setNotesError] = useState('');

  // Trigger profile modal from Navbar
  useEffect(() => {
    if (triggerProfileModal) {
      setProfileError('');
      setShowProfileModal(true);
      if (setTriggerProfileModal) setTriggerProfileModal(false);
    }
  }, [triggerProfileModal]);

  // Trigger support modal from Navbar
  useEffect(() => {
    if (triggerSupportModal) {
      setSupportName(currentUser?.name || '');
      setSupportPhone(currentUser?.phone || '');
      setSupportError('');
      setShowSupportModal(true);
      if (setTriggerSupportModal) setTriggerSupportModal(false);
    }
  }, [triggerSupportModal, currentUser]);

  // Check if profile photo OR phone number is missing on mount / open
  useEffect(() => {
    if (currentUser) {
      setProfilePhone(currentUser.phone || '');
      setTempProfileImage(currentUser.profileImage || null);
      if (!currentUser.profileImage || !currentUser.phone) {
        setShowPhotoNoticeModal(true);
      }
    }
  }, [currentUser]);

  // Handle Ultra Micro Compressed (80x80 ~2-3KB) Photo Selection
  const handleProfilePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 80; // Ultra micro size ~2-3KB base64 JPEG
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.4);
        setTempProfileImage(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Format Mobile Number to 10 digits max with space after 5 digits (XXXXX XXXXX)
  const handlePhoneInputChange = (val) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 10);
    if (digitsOnly.length > 5) {
      setProfilePhone(`${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`);
    } else {
      setProfilePhone(digitsOnly);
    }
  };

  // Save Profile (Requires BOTH Photo & Exactly 10-Digit Mobile Number)
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!currentUser?.studentId && !currentUser?.email) return;

    setProfileError('');
    if (!tempProfileImage) {
      setProfileError('⚠️ Please select and upload a profile photo.');
      return;
    }
    const rawDigits = profilePhone.replace(/\D/g, '');
    if (rawDigits.length !== 10) {
      setProfileError('⚠️ Please enter a valid 10-digit mobile number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-profile',
          studentId: currentUser.studentId || '',
          email: currentUser.email || '',
          profileImage: tempProfileImage,
          phone: profilePhone.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Profile update failed');

      const updatedUser = {
        ...currentUser,
        ...(data.user || {}),
        profileImage: tempProfileImage,
        phone: profilePhone.trim()
      };

      localStorage.setItem('geo_current_user', JSON.stringify(updatedUser));
      if (setCurrentUser) setCurrentUser(updatedUser);

      setShowPhotoNoticeModal(false);
      setShowProfileModal(false);
    } catch (err) {
      setProfileError(err.message || 'Failed to save profile.');
    } finally {
      setSubmitting(false);
    }
  };

  // Punch In & Punch Out Modals
  const [showPunchInModal, setShowPunchInModal] = useState(false);
  const [showPunchOutModal, setShowPunchOutModal] = useState(false);
  const [studyNotes, setStudyNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Help & Support Modal State
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportName, setSupportName] = useState(currentUser?.name || '');
  const [supportPhone, setSupportPhone] = useState(currentUser?.phone || '');
  const [supportMessage, setSupportMessage] = useState('');

  const handleOpenWhatsAppSupport = (targetNumber = '919217031899') => {
    setSupportError('');
    if (!supportName.trim() || !supportPhone.trim() || !supportMessage.trim()) {
      setSupportError('⚠️ Please fill in all required fields (Name, Mobile Number, Issue Details).');
      return;
    }
    const textMessage = `Hello SSSAM ACADEMY Support,\n\nI need help.\n\n👤 Name: ${supportName.trim()}\n📞 Contact Number: ${supportPhone.trim()}\n💬 Details: ${supportMessage.trim()}`;
    const encoded = encodeURIComponent(textMessage);
    window.open(`https://wa.me/${targetNumber}?text=${encoded}`, '_blank');
    setShowSupportModal(false);
    setSupportMessage('');
  };

  const timerRef = useRef(null);

  // Fetch Attendance Records
  const fetchRecords = async () => {
    if (!currentUser) return;
    setLoading(true);
    setRefreshingLogs(true);
    try {
      const res = await fetch(`/api/attendance?studentId=${currentUser.studentId}`);
      const data = await res.json();
      if (data.records) {
        setRecords(data.records);
        const active = data.records.find((r) => r.status === 'active');
        setActiveSession(active || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshingLogs(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // Fetch office location first, then check GPS with correct office coords
    fetch('/api/admin?month=' + new Date().toISOString().substring(0, 7))
      .then((r) => r.json())
      .then((data) => {
        if (data.settings?.campusLat && data.settings?.campusLng) {
          const lat = data.settings.campusLat;
          const lng = data.settings.campusLng;
          setOfficeLat(lat);
          setOfficeLng(lng);
          checkLocation(lat, lng);
        } else {
          checkLocation(null, null);
        }
      })
      .catch(() => {
        checkLocation(null, null);
      });
  }, [currentUser]);

  // GPS Check Function — high accuracy watchPosition sampling
  const checkLocation = (oLat = officeLat, oLng = officeLng) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setRefreshingGps(true);
    setGpsPermissionDenied(false);

    let bestPos = null;
    let watchId = null;

    const finish = (pos) => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (pos) {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy)
        };
        setCurrentCoords(coords);
        const d = (oLat && oLng) ? calcDist(pos.coords.latitude, pos.coords.longitude, oLat, oLng) : null;
        setDistFromCampus(d);
        setGpsPermissionDenied(false);
      } else {
        setGpsPermissionDenied(true);
      }
      setRefreshingGps(false);
    };

    const timeout = setTimeout(() => {
      finish(bestPos);
    }, 8000);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) {
          bestPos = pos;
        }
        if (pos.coords.accuracy <= 15) {
          clearTimeout(timeout);
          finish(pos);
        }
      },
      (err) => {
        clearTimeout(timeout);
        finish(bestPos);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
    );
  };

  function calcDist(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  // Active Session Timer & Live Background Location Sync
  useEffect(() => {
    if (activeSession) {
      const startTime = new Date(activeSession.punchInTime).getTime();
      const updateTimer = () => {
        const diff = Math.floor((new Date().getTime() - startTime) / 1000);
        setElapsedSeconds(diff);
      };
      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);

      // Periodic Live Location Update to Backend every 15 seconds while active
      const syncInterval = setInterval(() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
              setCurrentCoords(coords);
              const d = (officeLat && officeLng) ? calcDist(pos.coords.latitude, pos.coords.longitude, officeLat, officeLng) : null;
              setDistFromCampus(d);

              fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'update-location',
                  attendanceId: activeSession.id || activeSession._id,
                  location: coords
                })
              }).catch(() => {});
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
          );
        }
      }, 15000);

      return () => {
        clearInterval(timerRef.current);
        clearInterval(syncInterval);
      };
    } else {
      setElapsedSeconds(0);
    }
  }, [activeSession, officeLat, officeLng]);

  // Handle Fingerprint Click
  const handleFingerprintClick = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (activeSession) {
      setShowPunchOutModal(true);
    } else {
      // Auto-trigger location fetch if missing, but open Punch In popup immediately!
      if (!currentCoords && navigator.geolocation) {
        checkLocation();
      }
      setShowPunchInModal(true);
    }
  };

  // Confirm Punch In Action
  const handleConfirmPunchIn = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'punch-in',
          studentId: currentUser.studentId,
          studentName: currentUser.name,
          mode: mode === 'offline' ? 'location' : 'online',
          location: currentCoords || null
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Punch in failed');

      setActiveSession(data.record);
      setShowPunchInModal(false);
      fetchRecords();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Punch Out
  const handleConfirmPunchOut = async (e) => {
    e.preventDefault();
    if (studyNotes.trim().length < 30) {
      alert('Notes must be at least 30 characters!');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'punch-out',
          attendanceId: activeSession.id || activeSession._id,
          notes: studyNotes
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Punch out failed');

      setShowPunchOutModal(false);
      setStudyNotes('');
      setActiveSession(null);
      fetchRecords();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-md mx-auto py-4 text-center space-y-5">

      {/* GPS Permission Alert Banner if Blocked */}
      {gpsPermissionDenied && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Please allow Location access in browser settings</span>
          </div>
          <button
            onClick={checkLocation}
            className="text-[11px] font-bold text-amber-900 underline"
          >
            Allow
          </button>
        </div>
      )}

      {/* TAB 1: PUNCH IN TAB (Minimal & Uncluttered) */}
      {activeTab === 'punch' && (
        <div className="space-y-5">
          {/* Mode & GPS Controls Container */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
            {/* Top Mode Selector (Offline vs Online) */}
            {!activeSession && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Attendance Mode:</span>
                <div className="inline-flex bg-slate-100 p-1 rounded-full border border-slate-200">
                  <button
                    onClick={() => {
                      if (mode !== 'offline') setPendingModeSwitch('offline');
                    }}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      mode === 'offline'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Offline GPS</span>
                  </button>

                  <button
                    onClick={() => {
                      if (mode !== 'online') setPendingModeSwitch('online');
                    }}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      mode === 'online'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Online</span>
                  </button>
                </div>
              </div>
            )}

            {/* Manual Refresh GPS Button */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium text-left">
                {mode === 'offline' 
                  ? distFromCampus !== null 
                    ? `📍 Distance: ${distFromCampus}m` 
                    : '📍 Location Not Fetched' 
                  : '🌐 Online Mode Enabled'}
              </span>
              <button
                onClick={checkLocation}
                disabled={refreshingGps}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold transition-all shadow-2xs"
              >
                <RotateCw className={`w-3.5 h-3.5 text-emerald-600 ${refreshingGps ? 'animate-spin' : ''}`} />
                <span>{refreshingGps ? 'Getting Location...' : 'Get Current Location'}</span>
              </button>
            </div>
          </div>

          {/* Fingerprint Punch Section - Super Simple & Clear */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col items-center justify-center space-y-4">
            
            {/* Status Header Banner */}
            <div className="w-full text-center pb-3 border-b border-slate-100">
              {activeSession ? (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-extrabold animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                  <span>SESSION ACTIVE — YOU ARE PUNCHED IN</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span>READY — PUNCH IN TO START CLASS</span>
                </div>
              )}
            </div>

            {/* Big Fingerprint Button */}
            <button
              onClick={handleFingerprintClick}
              className={`w-44 h-44 sm:w-48 sm:h-48 rounded-full flex flex-col items-center justify-center transition-all transform active:scale-95 shadow-xl relative cursor-pointer ${
                activeSession
                  ? 'bg-gradient-to-tr from-rose-600 via-rose-500 to-pink-500 text-white shadow-rose-500/30 ring-4 ring-rose-200'
                  : 'bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white shadow-emerald-500/30 ring-4 ring-emerald-200 fingerprint-active'
              }`}
            >
              <Fingerprint className="w-20 h-20 sm:w-22 sm:h-22 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider mt-2 bg-black/20 px-3 py-1 rounded-full border border-white/20">
                {activeSession ? 'STOP / PUNCH OUT' : 'START / PUNCH IN'}
              </span>
            </button>

            {/* Simple Instructions / Live Timer */}
            {activeSession ? (
              <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Time Elapsed</p>
                <p className="text-3xl font-black font-mono text-slate-900 tracking-widest">
                  {formatTimer(elapsedSeconds)}
                </p>
                <p className="text-[11px] text-slate-500">Tap red button above when you finish studying to Punch Out.</p>
              </div>
            ) : (
              <div className="w-full bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center space-y-1">
                <p className="text-xs font-extrabold text-slate-800">
                  👉 Press the Fingerprint Icon above to Punch In
                </p>
                <p className="text-[11px] text-slate-500">
                  {mode === 'offline'
                    ? distFromCampus !== null
                      ? `Campus Distance: ${distFromCampus} meters`
                      : 'Make sure your location is fetched'
                    : 'Online Mode Active'}
                </p>
              </div>
            )}

          </div>
        </div>
      )}



      {/* TAB 2: SEPARATE ATTENDANCE DATA & MONTHLY CALENDAR TAB */}
      {(activeTab === 'attendance' || activeTab === 'data') && (() => {
        const studentDaysList = (() => {
          const [y, m] = studentMonth.split('-').map(Number);
          const date = new Date(y, m - 1, 1);
          const days = [];
          while (date.getMonth() === m - 1) {
            const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            days.push({
              dayNumber: date.getDate(),
              dateStr,
              dayOfWeek: date.getDay(),
              dayName: date.toLocaleDateString('en-US', { weekday: 'short' })
            });
            date.setDate(date.getDate() + 1);
          }
          return days;
        })();

        const studentDateMap = records.reduce((acc, rec) => {
          if (!acc[rec.date]) acc[rec.date] = [];
          acc[rec.date].push(rec);
          return acc;
        }, {});

        const monthRecords = records.filter(r => r.date && r.date.startsWith(studentMonth));
        const attendedDaysCount = studentDaysList.filter(d => (studentDateMap[d.dateStr] || []).length > 0).length;
        const totalMonthClasses = monthRecords.length;
        const attPercentage = studentDaysList.length > 0 ? Math.round((attendedDaysCount / studentDaysList.length) * 100) : 0;

        const filteredDisplayRecords = selectedStudentDate
          ? records.filter(r => r.date === selectedStudentDate)
          : monthRecords;

        const itemsPerPage = 8;
        const totalPages = Math.ceil(filteredDisplayRecords.length / itemsPerPage) || 1;
        const paginatedRecords = filteredDisplayRecords.slice((studentPage - 1) * itemsPerPage, studentPage * itemsPerPage);

        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm text-left space-y-4">
            
            {/* Header with Month Selector & Refresh Button */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>🗓️</span>
                  <span>My Attendance Calendar</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Month-wise class attendance & session details</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={studentMonth}
                  onChange={(e) => {
                    setStudentMonth(e.target.value);
                    setSelectedStudentDate(null);
                    setStudentPage(1);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={fetchRecords}
                  disabled={refreshingLogs}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-emerald-600 ${refreshingLogs ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {/* Sub-Tab Switcher: 🗓️ Calendar View vs 📋 Attendance Logs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 w-full sm:w-fit">
              <button
                onClick={() => setAttendanceSubTab('calendar')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  attendanceSubTab === 'calendar'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🗓️ Calendar View</span>
              </button>

              <button
                onClick={() => setAttendanceSubTab('logs')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  attendanceSubTab === 'logs'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📋 Attendance Logs ({filteredDisplayRecords.length})</span>
              </button>
            </div>

            {/* TAB CONTENT 1: CALENDAR VIEW */}
            {attendanceSubTab === 'calendar' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Month-wise Total Class Attendance Stats Bar */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-emerald-50 p-2.5 sm:p-3 rounded-2xl border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Attended Days</span>
                    <span className="text-base sm:text-lg font-black text-emerald-950">
                      {attendedDaysCount} / {studentDaysList.length}
                    </span>
                  </div>

                  <div className="bg-indigo-50 p-2.5 sm:p-3 rounded-2xl border border-indigo-200">
                    <span className="text-[10px] uppercase font-bold text-indigo-700 block">Total Classes</span>
                    <span className="text-base sm:text-lg font-black text-indigo-950">
                      {totalMonthClasses} Sessions
                    </span>
                  </div>

                  <div className="bg-teal-50 p-2.5 sm:p-3 rounded-2xl border border-teal-200">
                    <span className="text-[10px] uppercase font-bold text-teal-700 block">Attendance Rate</span>
                    <span className="text-base sm:text-lg font-black text-teal-950">
                      {attPercentage}%
                    </span>
                  </div>
                </div>

                {/* Calendar Grid Header (Days of Week) */}
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold text-slate-600 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/80">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="py-0.5">{d}</div>
                  ))}
                </div>

                {/* Full Month Calendar Grid (Same as Admin View) */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {/* Blank Offset Cells before Day 1 */}
                  {Array.from({ length: studentDaysList[0]?.dayOfWeek || 0 }).map((_, i) => (
                    <div key={`blank-${i}`} className="p-1 rounded-xl bg-slate-50/20 border border-slate-100/40 h-16 sm:h-20 pointer-events-none hidden sm:block opacity-40" />
                  ))}

                  {/* Days of Month */}
                  {studentDaysList.map((day) => {
                    const dayLogs = studentDateMap[day.dateStr] || [];
                    const hasClass = dayLogs.length > 0;
                    const isToday = day.dateStr === new Date().toISOString().substring(0, 10);
                    const isSelected = selectedStudentDate === day.dateStr;

                    return (
                      <button
                        key={day.dateStr}
                        onClick={() => {
                          setSelectedStudentDate(day.dateStr);
                          setStudentPage(1);
                          setSelectedDayDetailModal({
                            dateStr: day.dateStr,
                            dayNumber: day.dayNumber,
                            dayName: day.dayName,
                            logs: dayLogs
                          });
                        }}
                        className={`p-1 sm:p-2 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[54px] sm:min-h-[72px] cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-indigo-600 bg-indigo-50 border-indigo-400 shadow-md'
                            : isToday
                            ? 'ring-2 ring-emerald-500 bg-emerald-50/80 border-emerald-400 shadow-sm'
                            : hasClass
                            ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50'
                            : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`text-[11px] sm:text-xs font-black ${isToday ? 'text-emerald-900 bg-emerald-200 px-1 rounded-md' : 'text-slate-800'}`}>
                            {day.dayNumber}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase font-mono hidden sm:inline">{day.dayName}</span>
                        </div>

                        {hasClass ? (
                          <span className="text-[8px] sm:text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-200 px-1 sm:px-1.5 py-0.5 rounded-lg w-fit block truncate max-w-full">
                            🟢 {dayLogs.length} Class
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 hidden sm:inline">No class</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: ATTENDANCE LOGS LIST */}
            {attendanceSubTab === 'logs' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                {/* Selected Date Filter Header / Clear Filter */}
                {selectedStudentDate && (
                  <div className="flex items-center justify-between bg-indigo-50 p-2.5 rounded-2xl border border-indigo-200 text-xs">
                    <span className="font-bold text-indigo-900">
                      Showing sessions for: {selectedStudentDate} ({filteredDisplayRecords.length} Session{filteredDisplayRecords.length > 1 ? 's' : ''})
                    </span>
                    <button
                      onClick={() => {
                        setSelectedStudentDate(null);
                        setStudentPage(1);
                      }}
                      className="text-[11px] font-bold text-indigo-700 underline hover:text-indigo-900 cursor-pointer"
                    >
                      Show All Month
                    </button>
                  </div>
                )}

                {/* Attendance Logs List for Selected Month/Date */}
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    {selectedStudentDate ? `Logs for ${selectedStudentDate}` : `All Attendance Logs for ${new Date(studentMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
                  </h4>

                  {filteredDisplayRecords.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-6 text-center">No attendance records found for this period.</p>
                  ) : (
                    <div className="space-y-2">
                      {paginatedRecords.map((rec) => (
                        <div key={rec.id || rec._id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 shadow-2xs hover:border-slate-300 transition-all">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900">{rec.date}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              rec.mode === 'location' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                            }`}>
                              {rec.mode === 'location' ? '🟢 Offline GPS' : '🔵 Online'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-600 font-mono bg-white p-2 rounded-xl border border-slate-200/60">
                            <span>In: <strong className="text-slate-900">{new Date(rec.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                            <span>Out: <strong className="text-slate-900">{rec.punchOutTime ? new Date(rec.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}</strong></span>
                          </div>

                          {rec.notes && (
                            <div className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/60 space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Study Notes:</span>
                              <p className="text-xs text-slate-800 leading-relaxed">📖 {rec.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Clean Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                          <button
                            disabled={studentPage === 1}
                            onClick={() => setStudentPage((p) => Math.max(p - 1, 1))}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-200 cursor-pointer"
                          >
                            ← Previous
                          </button>

                          <span className="font-bold text-slate-500 font-mono">
                            Page {studentPage} of {totalPages}
                          </span>

                          <button
                            disabled={studentPage === totalPages}
                            onClick={() => setStudentPage((p) => Math.min(p + 1, totalPages))}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-200 cursor-pointer"
                          >
                            Next →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        );
      })()}

      {/* Mode Switch Confirmation Sleek Center Popup Modal */}
      {pendingModeSwitch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-center animate-in fade-in zoom-in-95 duration-200">
            
            <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-2xl shadow-sm ${
              pendingModeSwitch === 'online' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {pendingModeSwitch === 'online' ? '🌐' : '📍'}
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Switch to {pendingModeSwitch === 'online' ? 'Online' : 'Offline GPS'} Mode?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {pendingModeSwitch === 'online'
                  ? 'Online mode set karne par campus location verification bypass ho jayega.'
                  : 'Offline GPS mode set karne par office distance & campus location verify hoga.'}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingModeSwitch(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode(pendingModeSwitch);
                  if (pendingModeSwitch === 'offline') checkLocation();
                  setPendingModeSwitch(null);
                }}
                className={`flex-1 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all cursor-pointer ${
                  pendingModeSwitch === 'online'
                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                }`}
              >
                Confirm Switch
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Confirmation Punch-In Modal with Office Distance */}
      {showPunchInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-left animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="SSSAM Logo" className="w-8 h-8 object-contain rounded-xl" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Confirm Punch In</h3>
                  <p className="text-[11px] text-slate-500">SSSAM ACADEMY Attendance</p>
                </div>
              </div>
              <button
                onClick={() => setShowPunchInModal(false)}
                disabled={submitting}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Student Name:</span>
                <span className="font-bold text-slate-900">{currentUser?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Student ID:</span>
                <span className="font-mono font-bold text-emerald-700">{currentUser?.studentId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Office Distance:</span>
                <span className="font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                  {distFromCampus !== null ? `📍 ${distFromCampus} meters` : 'Location Verified'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Punch In Time:</span>
                <span className="font-bold text-slate-900">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPunchInModal(false)}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPunchIn}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-600/20 hover:bg-emerald-500 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? 'Punching In...' : 'Confirm Punch In'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Mandatory Punch-Out Notes Modal with Office Distance */}
      {showPunchOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-left animate-in fade-in zoom-in-95 duration-200">
            
            <div>
              <h3 className="text-base font-bold text-slate-900">Punch Out — Study Notes</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                What topics did you study today? <strong className="text-rose-600">Min 30 chars required</strong>.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-500 font-medium">Office Distance:</span>
              <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                {distFromCampus !== null ? `📍 ${distFromCampus} meters` : 'Location Verified'}
              </span>
            </div>

            <form onSubmit={handleConfirmPunchOut} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Topic Notes *</label>

                <textarea
                  rows={4}
                  required
                  value={studyNotes}
                  onChange={(e) => setStudyNotes(e.target.value)}
                  placeholder="Today I studied MongoDB schema design, indexing strategies, and Next.js API routes..."
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />

                <div className="flex items-center justify-between text-xs mt-1">
                  <span className={`font-bold ${studyNotes.trim().length >= 30 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {studyNotes.trim().length >= 30 ? '✓ Ready' : 'Min 30 chars'}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {studyNotes.trim().length} / 30
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPunchOutModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={studyNotes.trim().length < 30 || submitting}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-600/20 hover:bg-rose-500 disabled:opacity-40"
                >
                  {submitting ? 'Saving...' : 'Confirm Punch Out'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Daily Photo Upload Notice Modal (Auto-Pops when Photo Missing) */}
      {showPhotoNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-center animate-in fade-in zoom-in-95 duration-200">
            
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center text-2xl shadow-sm">
              📸
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900">Upload Profile Photo</h3>
              <p className="text-xs text-slate-500 mt-1">
                Please upload your profile photo & mobile number to complete your student profile.
              </p>
            </div>

            {profileError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <div className="space-y-4 text-left pt-1">
              {/* Photo Selector */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                {tempProfileImage ? (
                  <img src={tempProfileImage} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 mb-2 shadow-sm" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xl mb-2">
                    📷
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => profileFileInputRef.current?.click()}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm hover:bg-emerald-700"
                >
                  {tempProfileImage ? 'Change Photo' : 'Choose Photo'}
                </button>
                <input
                  type="file"
                  ref={profileFileInputRef}
                  onChange={handleProfilePhotoSelect}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile / WhatsApp Number (10 Digits)</label>
                <input
                  type="tel"
                  maxLength={11}
                  value={profilePhone}
                  onChange={(e) => handlePhoneInputChange(e.target.value)}
                  placeholder="91021 30956"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 tracking-wider"
                />
                <p className="text-[10px] text-slate-400 mt-1">Format: 5 digits, space, 5 digits (e.g. 91021 30956)</p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPhotoNoticeModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-emerald-700"
                >
                  {submitting ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Full My Profile Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-left animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="SSSAM Logo" className="w-8 h-8 object-contain rounded-xl" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">My Profile</h3>
                  <p className="text-[11px] text-slate-500">Update photo and mobile number</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Photo Selector */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
                {tempProfileImage ? (
                  <img src={tempProfileImage} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500 mb-2 shadow-sm" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-2xl mb-2">
                    📷
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => profileFileInputRef.current?.click()}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm hover:bg-emerald-700"
                >
                  {tempProfileImage ? 'Change Profile Photo' : 'Upload Profile Photo'}
                </button>
                <input
                  type="file"
                  ref={profileFileInputRef}
                  onChange={handleProfilePhotoSelect}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student Name</label>
                <input
                  type="text"
                  disabled
                  value={currentUser?.name || ''}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student ID</label>
                <input
                  type="text"
                  disabled
                  value={currentUser?.studentId || ''}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile / WhatsApp Number (10 Digits)</label>
                <input
                  type="tel"
                  maxLength={11}
                  value={profilePhone}
                  onChange={(e) => handlePhoneInputChange(e.target.value)}
                  placeholder="91021 30956"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 tracking-wider"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-emerald-500"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Day Details Sleek Center Popup Modal */}
      {selectedDayDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-left animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-bold shadow-xs">
                  🗓️
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                    Attendance Details
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedDayDetailModal.dateStr} ({selectedDayDetailModal.dayName})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDayDetailModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content List of Sessions on that Day */}
            {selectedDayDetailModal.logs.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-xl">
                  🚫
                </div>
                <p className="text-xs font-bold text-slate-600">No Attendance Recorded</p>
                <p className="text-[11px] text-slate-400">Iss din koi attendance punch-in nahi paya gaya.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-emerald-50 p-2.5 rounded-2xl border border-emerald-200 text-xs">
                  <span className="font-extrabold text-emerald-900">
                    Total Sessions Attended: {selectedDayDetailModal.logs.length}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[10px]">
                    PRESENT
                  </span>
                </div>

                {selectedDayDetailModal.logs.map((rec, index) => {
                  const inTime = new Date(rec.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const outTime = rec.punchOutTime ? new Date(rec.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active Session';
                  
                  // Calculate duration if punched out
                  let durationStr = 'In Progress';
                  if (rec.punchOutTime) {
                    const diffMs = new Date(rec.punchOutTime) - new Date(rec.punchInTime);
                    const diffMins = Math.floor(diffMs / (1000 * 60));
                    const hrs = Math.floor(diffMins / 60);
                    const mins = diffMins % 60;
                    durationStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} mins`;
                  }

                  return (
                    <div key={rec.id || rec._id || index} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 shadow-2xs hover:border-slate-300 transition-all">
                      
                      {/* Session Header: Mode & Duration */}
                      <div className="flex items-center justify-between text-xs border-b border-slate-200/60 pb-2">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>Session #{index + 1}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500 font-mono">{durationStr}</span>
                        </span>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          rec.mode === 'location' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                        }`}>
                          {rec.mode === 'location' ? '🟢 Offline GPS' : '🔵 Online Mode'}
                        </span>
                      </div>

                      {/* Distance Details (GPS / Office Distance) */}
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-xs flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Office Distance:</span>
                        <span className="font-bold text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {rec.mode === 'location'
                            ? rec.location?.latitude && officeLat && officeLng
                              ? `📍 ${calcDist(rec.location.latitude, rec.location.longitude, officeLat, officeLng)} meters`
                              : '📍 Verified Campus GPS'
                            : '🌐 Online Class'}
                        </span>
                      </div>

                      {/* Punch In / Punch Out Time Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                          <span className="text-[10px] text-slate-400 font-sans block font-bold">Punch In Time</span>
                          <strong className="text-emerald-700 text-xs">{inTime}</strong>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                          <span className="text-[10px] text-slate-400 font-sans block font-bold">Punch Out Time</span>
                          <strong className="text-slate-800 text-xs">{outTime}</strong>
                        </div>
                      </div>

                      {/* Study Notes */}
                      {rec.notes && (
                        <div className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">📖 Study Notes:</span>
                          <p className="text-xs text-slate-800 leading-relaxed italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                            "{rec.notes}"
                          </p>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedDayDetailModal(null)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Help & Support Input Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-left animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="SSSAM Logo" className="w-8 h-8 object-contain rounded-xl" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Help & Support</h3>
                  <p className="text-[11px] text-slate-500">Fill details to open WhatsApp support</p>
                </div>
              </div>
              <button
                onClick={() => setShowSupportModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOpenWhatsAppSupport} className="space-y-3">
              {supportError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{supportError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  value={supportName}
                  onChange={(e) => setSupportName(e.target.value)}
                  placeholder="Rahul Sharma"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile / WhatsApp Number *</label>
                <input
                  type="tel"
                  required
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  placeholder="Enter your contact number"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">How can we help you? *</label>
                <textarea
                  rows={3}
                  required
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder="Mujhe help chahiye (e.g. Attendance issue)..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => handleOpenWhatsAppSupport('919217031899')}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-600/20 hover:bg-emerald-500 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>🟢 General Support</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenWhatsAppSupport('919102130956')}
                  className="w-full py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>🚨 Issue Not Solved? Escalation Support</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSupportModal(false)}
                  className="w-full py-2 rounded-xl bg-transparent text-slate-500 font-bold text-xs hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

'use client';
import { useState, useEffect, useRef } from 'react';
import { Fingerprint, MapPin, Globe, Clock, Mic, FileText, CheckCircle2, RotateCw, AlertCircle } from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';

export default function StudentDashboard({ currentUser, onOpenAuth }) {
  const [mode, setMode] = useState('offline');
  const [currentCoords, setCurrentCoords] = useState(null);
  const [distFromCampus, setDistFromCampus] = useState(null);
  const [refreshingGps, setRefreshingGps] = useState(false);
  const [refreshingLogs, setRefreshingLogs] = useState(false);
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);

  // Office location fetched from admin settings
  const [officeLat, setOfficeLat] = useState(28.6139);
  const [officeLng, setOfficeLng] = useState(77.2090);

  const [activeSession, setActiveSession] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // Punch Out Modal
  const [showPunchOutModal, setShowPunchOutModal] = useState(false);
  const [studyNotes, setStudyNotes] = useState('');
  const [audioNote, setAudioNote] = useState(null);
  const [isListeningSpeech, setIsListeningSpeech] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
        let lat = 28.6139, lng = 77.2090;
        if (data.settings) {
          lat = data.settings.campusLat;
          lng = data.settings.campusLng;
          setOfficeLat(lat);
          setOfficeLng(lng);
        }
        // Now trigger GPS check with correct office coords
        checkLocation(lat, lng);
      })
      .catch(() => {
        checkLocation(officeLat, officeLng);
      });
  }, [currentUser]);

  // GPS Check Function — accepts office coords directly to avoid stale state
  const checkLocation = (oLat = officeLat, oLng = officeLng) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setRefreshingGps(true);
    setGpsPermissionDenied(false);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setCurrentCoords(coords);
        const d = calcDist(pos.coords.latitude, pos.coords.longitude, oLat, oLng);
        setDistFromCampus(d);
        setRefreshingGps(false);
        setGpsPermissionDenied(false);
      },
      () => {
        setRefreshingGps(false);
        setGpsPermissionDenied(true);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  };

  function calcDist(lat1, lon1, lat2, lon2) {
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

  // Active Session Timer
  useEffect(() => {
    if (activeSession) {
      const startTime = new Date(activeSession.punchInTime).getTime();
      const update = () => {
        const diff = Math.floor((new Date().getTime() - startTime) / 1000);
        setElapsedSeconds(diff);
      };
      update();
      timerRef.current = setInterval(update, 1000);
      return () => clearInterval(timerRef.current);
    } else {
      setElapsedSeconds(0);
    }
  }, [activeSession]);

  // Handle Fingerprint Click
  const handleFingerprintClick = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (activeSession) {
      setShowPunchOutModal(true);
    } else {
      // Block punch-in if GPS not available yet
      if (mode === 'offline' && !currentCoords) {
        alert('📍 Location nahi mili!\n\nBrowser mein Location Permission allow karo aur phir try karo.\n\nSettings → Site Settings → Location → Allow');
        return;
      }

      // Punch In (sends GPS coords for BOTH offline and online modes)
      try {
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'punch-in',
            studentId: currentUser.studentId,
            studentName: currentUser.name,
            mode: mode === 'offline' ? 'location' : 'online',
            location: currentCoords || null  // send null if GPS unavailable (online mode)
          })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Punch in failed');

        setActiveSession(data.record);
        fetchRecords();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Speech to Text
  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }
    const rec = new SpeechRecognition();
    rec.onstart = () => setIsListeningSpeech(true);
    rec.onend = () => setIsListeningSpeech(false);
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setStudyNotes((prev) => (prev ? `${prev} ${text}` : text));
    };
    rec.start();
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
          notes: studyNotes,
          audioNote
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Punch out failed');

      setShowPunchOutModal(false);
      setStudyNotes('');
      setAudioNote(null);
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
    <div className="max-w-md mx-auto py-6 text-center space-y-6">
      
      {/* GPS Permission Alert Banner if Blocked */}
      {gpsPermissionDenied && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-xs font-semibold flex items-center justify-between">
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

      {/* Top Mode Selector (Offline vs Online) */}
      {!activeSession && (
        <div className="flex flex-col items-center space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Attendance Mode</span>
          <div className="inline-flex bg-slate-100 p-1.5 rounded-full border border-slate-200 shadow-inner">
            <button
              onClick={() => setMode('offline')}
              className={`flex items-center gap-1.5 px-6 py-2 rounded-full text-xs font-bold transition-all ${
                mode === 'offline'
                  ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Offline (Location Default)</span>
            </button>

            <button
              onClick={() => setMode('online')}
              className={`flex items-center gap-1.5 px-6 py-2 rounded-full text-xs font-bold transition-all ${
                mode === 'online'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Online</span>
            </button>
          </div>
        </div>
      )}

      {/* Manual Refresh GPS Button */}
      <div className="flex items-center justify-center">
        <button
          onClick={checkLocation}
          disabled={refreshingGps}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-all"
        >
          <RotateCw className={`w-3.5 h-3.5 text-emerald-600 ${refreshingGps ? 'animate-spin' : ''}`} />
          <span>{refreshingGps ? 'Fetching GPS Permission...' : '🔄 Refresh GPS Location'}</span>
        </button>
      </div>

      {/* Fingerprint Circle Area */}
      <div className="flex flex-col items-center justify-center space-y-4">
        
        <button
          onClick={handleFingerprintClick}
          className={`w-44 h-44 rounded-full flex flex-col items-center justify-center transition-all transform active:scale-95 shadow-2xl relative ${
            activeSession
              ? 'bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-rose-500/30'
              : 'bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 text-white shadow-emerald-500/30 fingerprint-active'
          }`}
        >
          <Fingerprint className="w-20 h-20 animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-wider mt-2">
            {activeSession ? 'TAP TO PUNCH OUT' : 'TAP TO PUNCH IN'}
          </span>
        </button>

        {/* Live Timer / Status */}
        {activeSession ? (
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Punched In ({activeSession.mode})
            </span>
            <p className="text-3xl font-black font-mono text-slate-900 tracking-wider">
              {formatTimer(elapsedSeconds)}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-600">
              {mode === 'offline'
                ? distFromCampus !== null
                  ? `Office Distance: ${distFromCampus} meters`
                  : 'Offline GPS Mode'
                : 'Online Mode Active (GPS Tracked)'}
            </p>
            <p className="text-[11px] text-slate-400">Tap fingerprint to record attendance</p>
          </div>
        )}

      </div>

      {/* Mandatory Punch-Out Notes Modal */}
      {showPunchOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-left">
            
            <div>
              <h3 className="text-base font-bold text-slate-900">Punch Out — Study Notes</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                What topics did you study today? <strong className="text-rose-600">Min 30 chars required</strong>.
              </p>
            </div>

            <form onSubmit={handleConfirmPunchOut} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Topic Notes *</label>
                  <button
                    type="button"
                    onClick={startSpeechRecognition}
                    className={`text-xs font-semibold flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${
                      isListeningSpeech
                        ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>{isListeningSpeech ? 'Listening...' : 'Voice'}</span>
                  </button>
                </div>

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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Voice Note (Optional)</label>
                <VoiceRecorder onAudioRecorded={setAudioNote} label="Record Voice Note" />
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

      {/* Student Personal Attendance Logs Box with Refresh Button */}
      <div className="pt-6 border-t border-slate-200 text-left space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">My Recent Attendance</h4>
          
          <button
            onClick={fetchRecords}
            disabled={refreshingLogs}
            className="flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline"
          >
            <RotateCw className={`w-3 h-3 ${refreshingLogs ? 'animate-spin' : ''}`} />
            <span>{refreshingLogs ? 'Refreshing...' : '🔄 Refresh Logs'}</span>
          </button>
        </div>
        
        {records.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No attendance records yet.</p>
        ) : (
          <div className="space-y-2">
            {records.slice(0, 5).map((rec) => (
              <div key={rec.id || rec._id} className="p-3 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">{rec.date}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                    {rec.mode === 'location' ? '🟢 Offline/Loc' : '🔵 Online'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>In: {new Date(rec.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>Out: {rec.punchOutTime ? new Date(rec.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}</span>
                </div>

                {rec.notes && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-150 line-clamp-2">
                    📖 {rec.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

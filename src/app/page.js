'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import StudentDashboard from '@/components/StudentDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import AuthModal from '@/components/AuthModal';

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activePortalTab, setActivePortalTab] = useState('punchin'); // 'punchin' | 'attendance' | 'admin'
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Restore User Session from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('geo_current_user');
      if (stored) {
        const userObj = JSON.parse(stored);
        setCurrentUser(userObj);
        if (userObj.role === 'admin') {
          setActivePortalTab('admin');
        }
      }
    } catch (e) {
      console.error(e);
    }

    // Log Detailed Guest Visit & Location (unauthenticated or link open security ping)
    const logGuestVisit = async () => {
      try {
        const ua = navigator.userAgent || '';
        let deviceName = 'Desktop PC';
        if (/android/i.test(ua)) deviceName = 'Android Mobile';
        else if (/iphone/i.test(ua)) deviceName = 'iPhone (iOS)';
        else if (/ipad/i.test(ua)) deviceName = 'iPad Tablet';
        else if (/macintosh|mac os x/i.test(ua)) deviceName = 'MacBook / Mac';

        const screenRes = `${window.screen?.width || window.innerWidth}x${window.screen?.height || window.innerHeight}`;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
        const language = navigator.language || 'en-US';
        const platform = navigator.platform || 'Unknown OS';
        const referrer = document.referrer || 'Direct Link / WhatsApp Share';

        // Helper to send guest access log
        const sendLog = async (coords = null) => {
          await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'log-guest-access',
              device: `${deviceName} (${screenRes})`,
              userAgent: ua,
              location: coords,
              details: { platform, timezone, language, referrer, screenRes }
            })
          });
        };

        if (navigator.geolocation) {
          let bestPosition = null;
          let watchId = null;

          // Watch position for up to 10s to get the most accurate reading
          const timeout = setTimeout(() => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            sendLog(bestPosition
              ? { latitude: bestPosition.coords.latitude, longitude: bestPosition.coords.longitude, accuracy: Math.round(bestPosition.coords.accuracy) }
              : null
            );
          }, 10000);

          watchId = navigator.geolocation.watchPosition(
            (pos) => {
              // Keep the position with best (lowest) accuracy
              if (!bestPosition || pos.coords.accuracy < bestPosition.coords.accuracy) {
                bestPosition = pos;
              }
              // If accuracy is within 20 meters — good enough, stop early
              if (pos.coords.accuracy <= 20) {
                clearTimeout(timeout);
                navigator.geolocation.clearWatch(watchId);
                sendLog({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: Math.round(pos.coords.accuracy)
                });
              }
            },
            () => {
              clearTimeout(timeout);
              sendLog(null);
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
          );
        } else {
          sendLog(null);
        }
      } catch (err) {
        console.error(err);
      }
    };

    logGuestVisit();
  }, []);

  const handleLoginSuccess = (userObj) => {
    setCurrentUser(userObj);
    localStorage.setItem('geo_current_user', JSON.stringify(userObj));
    setShowAuthModal(false);
    if (userObj.role === 'admin') {
      setActivePortalTab('admin');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('geo_current_user');
    setActivePortalTab('punchin');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        activeTab={activePortalTab}
        setActiveTab={setActivePortalTab}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        
        {/* If Not Logged In, Show Full Page Auth Modal / Login Screen */}
        {!currentUser ? (
          <AuthModal
            isOpen={true}
            onClose={() => {}}
            onLoginSuccess={handleLoginSuccess}
          />
        ) : (
          <>
            {/* Logged-In Portal Views */}
            {activePortalTab === 'admin' || currentUser.role === 'admin' ? (
              <AdminDashboard currentUser={currentUser} />
            ) : (
              <StudentDashboard
                currentUser={currentUser}
                onOpenAuth={() => setShowAuthModal(true)}
              />
            )}
          </>
        )}

      </main>

      {/* Auth Modal Overlay */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400 font-medium">
        Student Attendance System • GPS Geofence & Location Protection
      </footer>

    </div>
  );
}

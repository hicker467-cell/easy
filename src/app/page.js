'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import StudentDashboard from '@/components/StudentDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import AuthModal from '@/components/AuthModal';

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activePortalTab, setActivePortalTab] = useState('punch'); // 'punch' | 'attendance' | 'admin'
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Restore User Session from localStorage or NextAuth Google OAuth
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

    // Check if returning from Google OAuth redirect (access_token in URL hash)
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        if (accessToken) {
          fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
          })
            .then((r) => r.json())
            .then((googleUser) => {
              if (googleUser?.email) {
                fetch('/api/auth', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'google',
                    email: googleUser.email,
                    name: googleUser.name || googleUser.email.split('@')[0]
                  })
                })
                  .then((r) => r.json())
                  .then((data) => {
                    if (data.success && data.user) {
                      const existingStored = localStorage.getItem('geo_current_user');
                      let storedObj = {};
                      try { storedObj = existingStored ? JSON.parse(existingStored) : {}; } catch (e) {}

                      const mergedUser = {
                        ...storedObj,
                        ...data.user,
                        profileImage: data.user.profileImage || storedObj.profileImage || null,
                        phone: data.user.phone || storedObj.phone || ''
                      };
                      setCurrentUser(mergedUser);
                      localStorage.setItem('geo_current_user', JSON.stringify(mergedUser));
                      if (mergedUser.role === 'admin') setActivePortalTab('admin');
                      window.history.replaceState({}, document.title, window.location.pathname);
                    }
                  })
                  .catch(() => {});
              }
            })
            .catch(() => {});
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Check NextAuth session for Google OAuth return
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((sessionData) => {
        if (sessionData?.user?.email) {
          fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'google',
              email: sessionData.user.email,
              name: sessionData.user.name || sessionData.user.email.split('@')[0]
            })
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.success && data.user) {
                const existingStored = localStorage.getItem('geo_current_user');
                let storedObj = {};
                try { storedObj = existingStored ? JSON.parse(existingStored) : {}; } catch (e) {}

                const mergedUser = {
                  ...storedObj,
                  ...data.user,
                  profileImage: data.user.profileImage || storedObj.profileImage || null,
                  phone: data.user.phone || storedObj.phone || ''
                };
                setCurrentUser(mergedUser);
                localStorage.setItem('geo_current_user', JSON.stringify(mergedUser));
                if (mergedUser.role === 'admin') {
                  setActivePortalTab('admin');
                }
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    // Log Guest Visit with live periodic location pings
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

        // Check if this guest already has a session ID
        let savedGuestId = sessionStorage.getItem('_guest_log_id');

        // Detect private IPs (LAN) via WebRTC
        const getPrivateIPs = () => new Promise((resolve) => {
          const ips = { privateV4: null, privateV6: null, allIPs: [] };
          try {
            const pc = new RTCPeerConnection({ iceServers: [] });
            pc.createDataChannel('');
            pc.createOffer().then(o => pc.setLocalDescription(o)).catch(() => {});
            const timeout = setTimeout(() => { pc.close(); resolve(ips); }, 3000);
            pc.onicecandidate = (e) => {
              if (!e || !e.candidate) { clearTimeout(timeout); pc.close(); resolve(ips); return; }
              const parts = e.candidate.candidate.split(' ');
              const ip = parts[4];
              if (!ip || ips.allIPs.includes(ip)) return;
              ips.allIPs.push(ip);
              if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(ip)) ips.privateV4 = ip;
              else if (ip.includes(':') && !ip.startsWith('::1')) ips.privateV6 = ip;
            };
          } catch { resolve(ips); }
        });

        const sendLocationPing = (coords, guestId = null, ipDetails = null) => {
          fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'log-guest-access',
              guestId,
              device: `${deviceName} (${screenRes})`,
              userAgent: ua,
              location: coords,
              ipDetails,
              details: { platform, timezone, language, screenRes }
            })
          }).then(r => r.json()).then(data => {
            // Save guestId from first log so future pings update same record
            if (!guestId && data.log?.id) {
              sessionStorage.setItem('_guest_log_id', data.log.id);
              savedGuestId = data.log.id;
            }
          }).catch(() => {});
        };

        // Get best GPS position using watchPosition
        const getBestLocation = (onResult) => {
          if (!navigator.geolocation) { onResult(null); return; }
          let best = null;
          let wid = null;
          const t = setTimeout(() => {
            navigator.geolocation.clearWatch(wid);
            onResult(best ? { latitude: best.coords.latitude, longitude: best.coords.longitude, accuracy: Math.round(best.coords.accuracy) } : null);
          }, 10000);
          wid = navigator.geolocation.watchPosition(
            (pos) => {
              if (!best || pos.coords.accuracy < best.coords.accuracy) best = pos;
              if (pos.coords.accuracy <= 20) {
                clearTimeout(t);
                navigator.geolocation.clearWatch(wid);
                onResult({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) });
              }
            },
            () => { clearTimeout(t); onResult(null); },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
          );
        };

        // First ping — get private IPs + GPS then log
        getPrivateIPs().then((ipDetails) => {
          getBestLocation((coords) => {
            sendLocationPing(coords, savedGuestId, ipDetails);
          });
        });

        // Live ping every 30 seconds — just update location (no need to re-fetch IPs)
        const pingInterval = setInterval(() => {
          getBestLocation((coords) => {
            if (coords) {
              const gid = sessionStorage.getItem('_guest_log_id');
              sendLocationPing(coords, gid, null);
            }
          });
        }, 30000);

        // Cleanup on page leave
        window.addEventListener('beforeunload', () => clearInterval(pingInterval));

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
    setActivePortalTab('punch');
  };

  const [triggerProfileModal, setTriggerProfileModal] = useState(false);
  const [triggerSupportModal, setTriggerSupportModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        activeTab={activePortalTab}
        setActiveTab={setActivePortalTab}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        onOpenProfile={() => setTriggerProfileModal(true)}
        onOpenSupport={() => setTriggerSupportModal(true)}
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
                setCurrentUser={setCurrentUser}
                activeTab={activePortalTab}
                setActiveTab={setActivePortalTab}
                onOpenAuth={() => setShowAuthModal(true)}
                triggerProfileModal={triggerProfileModal}
                setTriggerProfileModal={setTriggerProfileModal}
                triggerSupportModal={triggerSupportModal}
                setTriggerSupportModal={setTriggerSupportModal}
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
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 font-medium">
        <div>SSSAM ACADEMY • Student Attendance System</div>
      </footer>

    </div>
  );
}

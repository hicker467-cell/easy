'use client';
import { Fingerprint, Calendar, ShieldCheck, UserCheck, LogOut } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, currentUser, setCurrentUser, onOpenAuth, onLogout }) {
  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm text-slate-800">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Brand / Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-900 leading-none">GeoTrack</h1>
            <p className="text-[11px] text-slate-500">Student Attendance</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        {!isAdmin ? (
          /* Student Tabs */
          <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200">
            <button
              onClick={() => setActiveTab('punch')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === 'punch'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Punch In</span>
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === 'attendance'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>My Attendance</span>
            </button>
          </div>
        ) : (
          /* Admin View Indicator */
          <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Admin Portal (View Only)</span>
          </div>
        )}

        {/* User Account / Auth */}
        {currentUser ? (
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-tight">{currentUser.name}</p>
              <p className="text-[10px] text-emerald-600 font-mono">
                {isAdmin ? 'ROLE: ADMIN' : currentUser.studentId}
              </p>
            </div>
            <button
              onClick={onLogout || (() => setCurrentUser && setCurrentUser(null))}
              title="Sign Out"
              className="p-1.5 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors border border-transparent hover:border-rose-200"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="px-3.5 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all"
          >
            Sign In
          </button>
        )}

      </div>
    </header>
  );
}

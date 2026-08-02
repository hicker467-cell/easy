'use client';
import { useState, useRef } from 'react';
import { Fingerprint, Calendar, ShieldCheck, LogOut, ChevronDown, User, MessageSquare } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, currentUser, setCurrentUser, onOpenAuth, onLogout, onOpenProfile, onOpenSupport }) {
  const isAdmin = currentUser?.role === 'admin';
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm text-slate-800">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Brand / Title */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <img src="/logo.png" alt="SSSAM ACADEMY Logo" className="w-8 sm:w-9 h-8 sm:h-9 object-contain rounded-xl bg-white shadow-sm" />
          <div className="hidden xs:block">
            <h1 className="font-bold text-xs sm:text-base text-slate-900 leading-none tracking-tight">SSSAM ACADEMY</h1>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Student Attendance</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        {!isAdmin ? (
          /* Student Tabs */
          <div className="flex bg-slate-100 p-0.5 sm:p-1 rounded-full border border-slate-200">
            <button
              onClick={() => setActiveTab('punch')}
              className={`flex items-center gap-1 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all ${
                activeTab === 'punch'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Punch In</span>
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex items-center gap-1 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all ${
                activeTab === 'attendance'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">My Attendance</span>
              <span className="sm:hidden">Attendance</span>
            </button>
          </div>
        ) : (
          /* Admin View Indicator */
          <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Admin Portal (View Only)</span>
          </div>
        )}

        {/* Unified User Account Menu (Profile, Support, Sign Out) */}
        {currentUser ? (
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 p-1 rounded-2xl hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200 cursor-pointer"
            >
              {currentUser.profileImage ? (
                <img
                  src={currentUser.profileImage}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'S'}
                </div>
              )}
              
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1">
                  <span>{currentUser.name}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </p>
                <p className="text-[10px] text-emerald-600 font-mono">
                  {isAdmin ? 'ROLE: ADMIN' : currentUser.studentId}
                </p>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">{currentUser.email || currentUser.studentId}</p>
                </div>

                {!isAdmin && (
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenProfile && onOpenProfile();
                    }}
                    className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>👤 My Profile</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    onOpenSupport && onOpenSupport();
                  }}
                  className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-teal-600" />
                  <span>💬 Help & Support</span>
                </button>

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    onLogout && onLogout();
                  }}
                  className="w-full px-3.5 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>🚪 Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="px-4 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-600/20"
          >
            Sign In
          </button>
        )}

      </div>
    </header>
  );
}

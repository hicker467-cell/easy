'use client';
import { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, ShieldAlert, ArrowRight, CheckCircle2, User, KeyRound, Send, Check, RotateCw } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Form Inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 3-Step Verification States
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  // Resend OTP Countdown Timer
  const [resendCountdown, setResendCountdown] = useState(30);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Resend OTP Timer Effect
  useEffect(() => {
    let timer;
    if (otpSent && !otpVerified && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpSent, otpVerified, resendCountdown]);

  if (!isOpen) return null;

  const resetFormState = () => {
    setOtp('');
    setOtpSent(false);
    setOtpVerified(false);
    setResendCountdown(30);
    setPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Step 1: Send OTP via Brevo API
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (isRegister && !name.trim()) { setErrorMsg('Full Name is required.'); return; }
    if (!email.trim()) { setErrorMsg('Email address is required.'); return; }

    setLoading(true);

    try {
      const action = isRegister ? 'send-otp' : 'forgot-password';
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, email })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to send OTP to email');

      setOtpSent(true);
      setResendCountdown(30);
      setSuccessMsg(`6-digit OTP sent to ${email} via Brevo Email!`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-Digit OTP Code
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!otp.trim() || otp.trim().length < 6) {
      setErrorMsg('Please enter valid 6-digit OTP code.');
      return;
    }

    setOtpVerified(true);
    setSuccessMsg('OTP Verified! Please enter and confirm your password below.');
  };

  // Step 3: Complete Registration or Reset Password with Password & Re-enter Password
  const handleSubmitFinal = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!password.trim() || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter carefully.');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'register',
            name,
            email,
            password,
            otp: otp.trim()
          })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Registration failed');

        if (data.success && data.user) {
          onLoginSuccess(data.user);
        }
      } else if (showForgotPassword) {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reset-password',
            email,
            otp: otp.trim(),
            newPassword: password
          })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Password reset failed');

        setSuccessMsg('Password reset successful! Please sign in with your new password.');
        setTimeout(() => {
          setShowForgotPassword(false);
          resetFormState();
        }, 1500);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Standard Login (Email & Password)
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim()) { setErrorMsg('Email address is required.'); return; }
    if (!password.trim()) { setErrorMsg('Password is required.'); return; }

    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Invalid credentials');

      if (data.success && data.user) {
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '497495591959-3ul54sp5nkivus4jgpdnl5pco13db0o2.apps.googleusercontent.com';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initGsi = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse,
          auto_select: false
        });
      }
    };

    if (!document.getElementById('google-gsi-script')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGsi;
      document.body.appendChild(script);
    } else {
      initGsi();
    }
  }, []);

  const handleGoogleCredentialResponse = async (response) => {
    if (!response?.credential) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'google',
          credential: response.credential
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Google login failed');
      if (data.success && data.user) {
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setLoading(true);
    setErrorMsg('');

    const clientId = GOOGLE_CLIENT_ID;

    if (window.google?.accounts?.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'email profile',
          callback: async (tokenResponse) => {
            if (tokenResponse?.access_token) {
              try {
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const googleUser = await userInfoRes.json();
                if (googleUser?.email) {
                  const res = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'google',
                      email: googleUser.email,
                      name: googleUser.name || googleUser.email.split('@')[0]
                    })
                  });
                  const data = await res.json();
                  if (data.success && data.user) {
                    onLoginSuccess(data.user);
                  } else {
                    throw new Error(data.error || 'Google login failed');
                  }
                }
              } catch (e) {
                setErrorMsg('Could not fetch Google profile: ' + e.message);
              } finally {
                setLoading(false);
              }
            } else {
              setLoading(false);
            }
          }
        });
        client.requestAccessToken({ prompt: 'consent select_account' });
        return;
      } catch (err) {
        console.error(err);
      }
    }

    const redirectUri = window.location.origin;
    const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=email%20profile&prompt=consent%20select_account`;
    window.location.href = googleOAuthUrl;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-1">
          <img src="/logo.png" alt="SSSAM ACADEMY Logo" className="w-16 h-16 object-contain mx-auto mb-2 drop-shadow-md" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-600 block">SSSAM ACADEMY</span>
          <h2 className="text-xl font-bold text-slate-900">
            {showForgotPassword
              ? 'Reset Password'
              : isRegister
              ? 'Create Student Account'
              : 'Sign In'}
          </h2>
          <p className="text-xs text-slate-500">
            {showForgotPassword
              ? '3-Step Email OTP & Password Reset'
              : isRegister
              ? '3-Step Email OTP Verification'
              : 'Sign in with your email and password'}
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 3-STEP REGISTER & FORGOT PASSWORD FLOW */}
        {isRegister || showForgotPassword ? (
          <div className="space-y-4">
            
            {/* STEP 1: Enter Email (and Name for Register) -> Get OTP */}
            {!otpSent && (
              <form onSubmit={handleSendOtp} className="space-y-3">
                {isRegister && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Rahul Sharma"
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@school.edu"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Sending OTP...' : 'Get Email Verification OTP'}</span>
                </button>
              </form>
            )}

            {/* STEP 2: Enter 6-Digit OTP Code & Resend OTP Timer */}
            {otpSent && !otpVerified && (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">6-Digit Email OTP Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono tracking-widest text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Resend OTP Button with 30s Countdown Timer */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={resendCountdown > 0 || loading}
                    onClick={handleSendOtp}
                    className="text-xs font-semibold text-emerald-600 hover:underline disabled:text-slate-400 disabled:no-underline flex items-center gap-1"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>
                      {resendCountdown > 0
                        ? `Resend OTP in ${resendCountdown}s`
                        : 'Resend OTP via Email'}
                    </span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Verify OTP Code</span>
                </button>
              </form>
            )}

            {/* STEP 3: Enter Password & Re-enter Password (AFTER OTP VERIFIED) */}
            {otpSent && otpVerified && (
              <form onSubmit={handleSubmitFinal} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {showForgotPassword ? 'New Password' : 'Create Password'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Re-enter Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                >
                  <span>
                    {loading
                      ? 'Processing...'
                      : showForgotPassword
                      ? 'Update Password'
                      : 'Complete Registration'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setShowForgotPassword(false);
                  resetFormState();
                }}
                className="text-xs text-slate-500 font-semibold hover:text-slate-900"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : (
          /* STANDARD SIGN IN FORM (EMAIL & PASSWORD) */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@school.edu"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setIsRegister(false);
                    resetFormState();
                  }}
                  className="text-[11px] font-bold text-emerald-600 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
                
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* OR Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase">OR</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* 1-Click Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Toggle Login vs Register */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setShowForgotPassword(false);
                  resetFormState();
                }}
                className="text-xs text-slate-500 font-semibold hover:text-slate-900"
              >
                Don't have an account? Register with Email OTP
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}

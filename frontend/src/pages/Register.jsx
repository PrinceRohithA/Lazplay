import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth as authApi } from '../api';
import { useTheme } from '../components/ThemeContext';

export default function UserRegistrationCyberEdition() {
  const { isStandard } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [otpMessage, setOtpMessage] = useState(null);

  const handleSendOTP = async () => {
    if (!form.email) {
      setError("Email is required to generate OTP.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      setError("Invalid email format.");
      return;
    }

    setError(null);
    setOtpSending(true);
    setOtpMessage(null);
    try {
      await authApi.sendOtp(form.email, 'VERIFY_EMAIL');
      setOtpSent(true);
      setOtpMessage("Verification code sent to your email.");
    } catch (err) {
      setError(err.message || 'Failed to send OTP code');
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Frontend Validation
    if (!form.username || !form.email || !form.password || !form.displayName) {
      setError("All fields are required.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!otpSent) {
      setError("Email verification OTP must be sent first.");
      return;
    }

    if (!verificationCode || verificationCode.length !== 6) {
      setError("Verification code must be exactly 6 digits.");
      return;
    }

    setError(null); 
    setLoading(true);
    try {
      await authApi.register({ 
        username: form.username, 
        email: form.email, 
        password: form.password,
        displayName: form.displayName,
        code: verificationCode
      });
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const handleChange = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <>
      {!isStandard && <div className="fixed inset-0 scanlines opacity-30"></div>}
      <header className="flex justify-between items-center px-gutter py-4 w-full z-50 docked full-width top-0 border-b border-outline-variant bg-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link to="/" className={`font-bold ${isStandard ? 'text-primary text-headline-sm font-sans font-extrabold tracking-tight' : 'font-headline-md text-headline-md text-primary-container drop-shadow-[0_0_8px_rgba(57,255,20,0.6)] uppercase tracking-[0.2em]'}`}>
            LAZPLAY
          </Link>
        </div>
        <div className="flex items-center gap-6">
          {!isStandard && (
            <div className="hidden md:flex gap-4 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
              <span className="text-primary-fixed px-2 py-1">V_1.0.4</span>
              <span className="text-primary-fixed px-2 py-1">STATUS: ONLINE</span>
            </div>
          )}
        </div>
      </header>
      <main className={`flex-grow flex items-center justify-center p-gutter relative overflow-hidden min-h-screen pt-24 pb-12 ${isStandard ? 'bg-background' : 'grid-glow-bg'}`}>
        <div className="relative z-10 w-full max-w-lg">
          <div className={`bg-surface border p-1 rounded-lg ${isStandard ? 'border-outline-variant shadow-md' : 'border-primary-container shadow-[0_0_20px_rgba(0,240,255,0.2)]'}`}>
            {!isStandard && (
              <div className="bg-surface-container-high px-4 py-2 flex justify-between items-center mb-6 rounded-t-md">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary-container" style={{fontVariationSettings: "'FILL' 1"}}>account_circle</span>
                  <h1 className="font-label-caps text-on-surface">LAZPLAY // CREATE_ACCOUNT</h1>
                </div>
              </div>
            )}
            <div className="px-6 pb-8 pt-6">
              <div className="mb-8 text-center">
                <h2 className={`font-bold mb-2 ${isStandard ? 'text-headline-lg text-on-surface font-sans' : 'font-headline-lg text-primary-container glow-text-primary uppercase tracking-tight'}`}>Create Account</h2>
                <p className={`text-xs ${isStandard ? 'text-on-surface-variant' : 'font-label-caps text-[10px] text-on-surface-variant opacity-70'}`}>Sign up to get started</p>
              </div>

              {error && (
                <div className={`mb-6 p-4 border text-error ${isStandard ? 'bg-error/5 border-error/30 text-sm rounded' : 'bg-error/10 border-error font-label-mono text-xs uppercase animate-pulse'}`}>
                  {isStandard ? error : `> ERROR: ${error}`}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/*  Username Input  */}
                <div className="group">
                  <label className={`block mb-1.5 flex items-center gap-2 ${isStandard ? 'text-sm font-medium text-on-surface-variant' : 'font-label-caps text-primary-fixed-dim text-[10px]'}`} htmlFor="username">
                    <span className="material-symbols-outlined text-[14px]">person</span>
                    Username
                  </label>
                  <div className={`relative ${isStandard ? 'rounded' : ''}`}>
                    {!isStandard && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container font-label-caps opacity-60">&gt;</span>}
                    <input 
                      className={`w-full bg-surface-container-low border border-outline-variant text-on-surface outline-none transition-colors placeholder:text-outline-variant/50 ${isStandard ? 'font-sans px-3 py-2.5 rounded focus:border-primary' : 'font-body-md pl-10 py-2.5 focus:border-primary-container'}`} 
                      id="username" 
                      name="username" 
                      placeholder="e.g. cyberninja" 
                      type="text"
                      value={form.username}
                      onChange={handleChange('username')}
                      required
                    />
                  </div>
                </div>

                {/*  Display Name Input  */}
                <div className="group">
                  <label className={`block mb-1.5 flex items-center gap-2 ${isStandard ? 'text-sm font-medium text-on-surface-variant' : 'font-label-caps text-primary-fixed-dim text-[10px]'}`} htmlFor="displayName">
                    <span className="material-symbols-outlined text-[14px]">badge</span>
                    Display Name
                  </label>
                  <div className={`relative ${isStandard ? 'rounded' : ''}`}>
                    {!isStandard && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container font-label-caps opacity-60">&gt;</span>}
                    <input 
                      className={`w-full bg-surface-container-low border border-outline-variant text-on-surface outline-none transition-colors placeholder:text-outline-variant/50 ${isStandard ? 'font-sans px-3 py-2.5 rounded focus:border-primary' : 'font-body-md pl-10 py-2.5 focus:border-primary-container'}`} 
                      id="displayName" 
                      name="displayName" 
                      placeholder="e.g. Cyber Ninja" 
                      type="text"
                      value={form.displayName}
                      onChange={handleChange('displayName')}
                      required
                    />
                  </div>
                </div>

                {/*  Email Address Input  */}
                <div className="group">
                  <label className={`block mb-1.5 flex items-center gap-2 ${isStandard ? 'text-sm font-medium text-on-surface-variant' : 'font-label-caps text-primary-fixed-dim text-[10px]'}`} htmlFor="email">
                    <span className="material-symbols-outlined text-[14px]">alternate_email</span>
                    Email Address
                  </label>
                  <div className="flex gap-2">
                    <div className={`relative flex-grow ${isStandard ? 'rounded' : ''}`}>
                      {!isStandard && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container font-label-caps opacity-60">&gt;</span>}
                      <input 
                        className={`w-full bg-surface-container-low border border-outline-variant text-on-surface outline-none transition-colors placeholder:text-outline-variant/50 ${isStandard ? 'font-sans px-3 py-2.5 rounded focus:border-primary' : 'font-body-md pl-10 py-2.5 focus:border-primary-container'}`} 
                        id="email" 
                        name="email" 
                        placeholder="yourname@example.com" 
                        type="email"
                        value={form.email}
                        onChange={handleChange('email')}
                        disabled={otpSent}
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={otpSending || !form.email}
                      className={`px-4 font-label-caps text-[10px] rounded transition-colors disabled:opacity-50 ${isStandard ? 'cyber-btn !py-0 flex items-center justify-center' : 'bg-primary/10 border border-primary text-primary hover:bg-primary hover:text-black'}`}
                    >
                      {otpSending ? 'SENDING...' : otpSent ? 'RESEND OTP' : 'SEND OTP'}
                    </button>
                  </div>
                  {otpMessage && (
                    <p className={`mt-1 text-[9px] uppercase ${isStandard ? 'text-primary font-sans' : 'font-label-mono text-primary animate-pulse'}`}>
                      &gt; {otpMessage}
                    </p>
                  )}
                </div>

                {/*  OTP Code Verification Input (conditionally visible)  */}
                {otpSent && (
                  <div className="group">
                    <label className={`block mb-1.5 flex items-center gap-2 ${isStandard ? 'text-sm font-medium text-on-surface-variant' : 'font-label-caps text-primary-fixed-dim text-[10px]'}`} htmlFor="otp">
                      <span className="material-symbols-outlined text-[14px]">vpn_key</span>
                      Verification OTP Code
                    </label>
                    <div className={`relative ${isStandard ? 'rounded' : ''}`}>
                      {!isStandard && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container font-label-caps opacity-60">&gt;</span>}
                      <input 
                        className={`w-full bg-surface-container-low border text-on-surface text-center py-2.5 outline-none ${isStandard ? 'border-outline-variant rounded font-sans text-sm focus:border-primary' : 'border-primary font-label-mono tracking-[0.5em] text-sm'}`} 
                        id="otp" 
                        name="otp" 
                        maxLength={6}
                        placeholder="------" 
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        required
                      />
                    </div>
                  </div>
                )}

                {/*  Password Input  */}
                <div className="group">
                  <label className={`block mb-1.5 flex items-center gap-2 ${isStandard ? 'text-sm font-medium text-on-surface-variant' : 'font-label-caps text-primary-fixed-dim text-[10px]'}`} htmlFor="password">
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                    Password
                  </label>
                  <div className={`relative ${isStandard ? 'rounded' : ''}`}>
                    {!isStandard && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container font-label-caps opacity-60">&gt;</span>}
                    <input 
                      className={`w-full bg-surface-container-low border border-outline-variant text-on-surface outline-none transition-colors placeholder:text-outline-variant/50 ${isStandard ? 'font-sans px-3 py-2.5 rounded focus:border-primary' : 'font-body-md pl-10 py-2.5 focus:border-primary-container'}`} 
                      id="password" 
                      name="password" 
                      placeholder="Enter a secure password" 
                      type="password"
                      value={form.password}
                      onChange={handleChange('password')}
                      required
                    />
                  </div>
                </div>

                {/*  Register Button  */}
                <div className="pt-4">
                  <button 
                    className={`w-full py-3.5 uppercase font-bold tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 transition-colors ${isStandard ? 'cyber-btn' : 'bg-primary-container/20 border border-primary text-primary hover:bg-primary-container hover:text-black pixel-border'}`} 
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </button>
                </div>
              </form>
              <div className="mt-6 text-center">
                <Link className={`transition-colors underline underline-offset-4 ${isStandard ? 'text-sm text-primary hover:text-primary-fixed' : 'font-label-caps text-[10px] text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center gap-1'}`} to="/login">
                  Already have an account? Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

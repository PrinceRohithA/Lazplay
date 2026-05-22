import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth as authApi } from '../api';

export default function UserRegistrationCyberEdition() {
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
      setError("EMAIL IS REQUIRED TO GENERATE OTP");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      setError("INVALID EMAIL FORMAT");
      return;
    }

    setError(null);
    setOtpSending(true);
    setOtpMessage(null);
    try {
      await authApi.sendOtp(form.email, 'VERIFY_EMAIL');
      setOtpSent(true);
      setOtpMessage("VERIFICATION CODE TRANSMITTED TO YOUR EMAIL");
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
      setError("ALL FIELDS ARE REQUIRED [01-04]");
      return;
    }

    if (form.password.length < 8) {
      setError("SECURITY_PHRASE MUST BE AT LEAST 8 CHARACTERS");
      return;
    }

    if (!otpSent) {
      setError("EMAIL VERIFICATION OTP MUST BE SENT AND GENERATED");
      return;
    }

    if (!verificationCode || verificationCode.length !== 6) {
      setError("VERIFICATION CODE MUST BE EXACTLY 6 DIGITS");
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
      <div className="fixed inset-0 scanlines opacity-30"></div>
      <header className="flex justify-between items-center px-gutter py-4 w-full z-50 docked full-width top-0 border-b border-outline-variant bg-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-headline-md text-headline-md font-bold text-primary-container drop-shadow-[0_0_8px_rgba(57,255,20,0.6)] uppercase tracking-[0.2em]">
            LAZPLAY
          </Link>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-4 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
            <span className="text-primary-fixed px-2 py-1">V_1.0.4</span>
            <span className="text-primary-fixed px-2 py-1">STATUS: ONLINE</span>
          </div>
        </div>
      </header>
      <main className="flex-grow flex items-center justify-center p-gutter relative overflow-hidden grid-glow-bg min-h-screen pt-24 pb-12">
        <div className="relative z-10 w-full max-w-lg">
          <div className="bg-surface-container border border-primary-container p-1 shadow-[0_0_20px_rgba(0,240,255,0.2)] rounded-lg">
            <div className="bg-surface-container-high px-4 py-2 flex justify-between items-center mb-6 rounded-t-md">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary-container" style={{fontVariationSettings: "'FILL' 1"}}>account_circle</span>
                <h1 className="font-label-caps text-on-surface">LAZPLAY // CREATE_ACCOUNT</h1>
              </div>
            </div>
            <div className="px-6 pb-8">
              <div className="mb-8 text-center">
                <h2 className="font-headline-lg text-primary-container mb-2 glow-text-primary uppercase tracking-tight">Create Account</h2>
                <p className="font-label-caps text-[10px] text-on-surface-variant opacity-70">Sign up to get started</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-error/10 border border-error text-error font-label-mono text-xs uppercase animate-pulse">
                  &gt; ERROR: {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/*  Username Input  */}
                <div className="group">
                  <label className="block font-label-caps text-primary-fixed-dim text-[10px] mb-1.5 flex items-center gap-2" htmlFor="username">
                    <span className="material-symbols-outlined text-[14px]">person</span>
                    Username
                  </label>
                  <div className="relative rounded">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container font-label-caps opacity-60">&gt;</span>
                    <input 
                      className="w-full bg-surface-container-low border border-outline-variant focus:border-primary-container text-on-surface font-body-md pl-10 py-2.5 outline-none transition-colors placeholder:text-outline-variant rounded" 
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
                  <label className="block font-label-caps text-primary-fixed-dim text-[10px] mb-1.5 flex items-center gap-2" htmlFor="displayName">
                    <span className="material-symbols-outlined text-[14px]">badge</span>
                    Display Name
                  </label>
                  <div className="relative rounded">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container font-label-caps opacity-60">&gt;</span>
                    <input 
                      className="w-full bg-surface-container-low border border-outline-variant focus:border-primary-container text-on-surface font-body-md pl-10 py-2.5 outline-none transition-colors placeholder:text-outline-variant rounded" 
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
                  <label className="block font-label-caps text-primary-fixed-dim text-[10px] mb-1.5 flex items-center gap-2" htmlFor="email">
                    <span className="material-symbols-outlined text-[14px]">alternate_email</span>
                    Email Address
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-grow rounded">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container font-label-caps opacity-60">&gt;</span>
                      <input 
                        className="w-full bg-surface-container-low border border-outline-variant focus:border-primary-container text-on-surface font-body-md pl-10 py-2.5 outline-none transition-colors placeholder:text-outline-variant rounded" 
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
                      className="bg-primary/10 border border-primary text-primary px-4 font-label-caps text-[10px] rounded hover:bg-primary hover:text-black transition-colors disabled:opacity-50"
                    >
                      {otpSending ? 'SENDING...' : otpSent ? 'RESEND OTP' : 'SEND OTP'}
                    </button>
                  </div>
                  {otpMessage && (
                    <p className="mt-1 text-[9px] font-label-mono text-primary animate-pulse uppercase">
                      &gt; {otpMessage}
                    </p>
                  )}
                </div>

                {/*  OTP Code Verification Input (conditionally visible)  */}
                {otpSent && (
                  <div className="group">
                    <label className="block font-label-caps text-primary-fixed-dim text-[10px] mb-1.5 flex items-center gap-2" htmlFor="otp">
                      <span className="material-symbols-outlined text-[14px]">vpn_key</span>
                      Verification OTP Code
                    </label>
                    <div className="relative rounded">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container font-label-caps opacity-60">&gt;</span>
                      <input 
                        className="w-full bg-surface-container-low border border-primary focus:border-primary text-on-surface font-label-mono tracking-[0.5em] text-center text-sm py-2.5 outline-none placeholder:text-outline-variant rounded" 
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
                  <label className="block font-label-caps text-primary-fixed-dim text-[10px] mb-1.5 flex items-center gap-2" htmlFor="password">
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                    Password
                  </label>
                  <div className="relative rounded">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container font-label-caps opacity-60">&gt;</span>
                    <input 
                      className="w-full bg-surface-container-low border border-outline-variant focus:border-primary-container text-on-surface font-body-md pl-10 py-2.5 outline-none transition-colors placeholder:text-outline-variant rounded" 
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
                    className="w-full bg-primary-container/20 border border-primary text-primary hover:bg-primary-container hover:text-black py-3.5 pixel-border uppercase font-bold tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 transition-colors" 
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </button>
                </div>
              </form>
              <div className="mt-6 text-center">
                <Link className="font-label-caps text-[10px] text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center gap-1 underline underline-offset-4" to="/login">
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

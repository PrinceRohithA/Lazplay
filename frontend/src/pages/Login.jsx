import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth as authApi } from '../api';
import { useTheme } from '../components/ThemeContext';

export default function SystemLoginCyberEdition() {
  const { isStandard } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Email and password are required.");
      return;
    }

    setError(null); 
    setLoading(true);
    try {
      await authApi.login({ identifier: form.email, password: form.password });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
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
      <main className={`flex-grow flex flex-col items-center justify-center p-margin relative z-10 min-h-screen pt-24 pb-12 ${isStandard ? 'bg-background' : 'grid-glow-bg'}`}>
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center">
            <h1 className={`font-bold text-center ${isStandard ? 'text-headline-lg text-on-surface font-sans' : 'font-headline-lg text-headline-lg text-primary-container tracking-tighter uppercase glow-text-primary'}`}>
              Login to LazPlay
            </h1>
            {!isStandard && <div className="h-0.5 w-24 bg-primary-container mt-2 neon-glow-primary"></div>}
          </div>
          <div className={`bg-surface border border-outline-variant p-gutter relative overflow-hidden ${isStandard ? 'rounded-lg shadow-md' : 'bg-surface-container-low/95 pixel-border'}`}>
            {!isStandard && (
              <>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-container via-primary-fixed to-primary-container"></div>
                <div className="mt-2 mb-6 flex items-center justify-between">
                  <span className="font-label-caps text-[9px] text-outline uppercase tracking-[0.25em]">SIGN_IN_CREDENTIALS</span>
                </div>
              </>
            )}

            {error && (
              <div className={`mb-6 p-3 border text-error ${isStandard ? 'bg-error/5 border-error/20 text-sm rounded' : 'bg-error/10 border-error font-label-mono text-[10px] uppercase'}`}>
                {isStandard ? error : `> ${error}`}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label className={`block ${isStandard ? 'text-sm font-medium text-on-surface-variant' : 'font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider'}`}>Email Address</label>
                <div className={`relative flex items-center bg-surface-container-lowest border border-outline-variant focus-within:border-primary transition-all group ${isStandard ? 'rounded' : ''}`}>
                  {!isStandard && <span className="pl-3 text-primary font-medium">&gt;</span>}
                  <input 
                    className={`bg-transparent border-none focus:ring-0 w-full py-2.5 placeholder:text-on-surface-variant/40 placeholder:text-xs ${isStandard ? 'text-on-surface px-3 font-sans' : 'text-primary font-mono'}`} 
                    placeholder="Enter your email" 
                    type="email"
                    value={form.email}
                    onChange={handleChange('email')}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className={`block ${isStandard ? 'text-sm font-medium text-on-surface-variant' : 'font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider'}`}>Password</label>
                <div className={`relative flex items-center bg-surface-container-lowest border border-outline-variant focus-within:border-primary transition-all group ${isStandard ? 'rounded' : ''}`}>
                  {!isStandard && <span className="pl-3 text-primary font-medium">&gt;</span>}
                  <input 
                    className={`bg-transparent border-none focus:ring-0 w-full py-2.5 placeholder:text-on-surface-variant/40 placeholder:text-xs ${isStandard ? 'text-on-surface px-3 font-sans' : 'text-primary font-mono'}`} 
                    placeholder="Enter your password" 
                    type="password"
                    value={form.password}
                    onChange={handleChange('password')}
                    required
                  />
                </div>
              </div>
              <button 
                className={`w-full py-3.5 uppercase font-bold tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 transition-colors ${isStandard ? 'cyber-btn' : 'bg-primary-container/20 border border-primary text-primary hover:bg-primary-container hover:text-black pixel-border'}`} 
                type="submit"
                disabled={loading}
              >
                {loading ? 'Logging In...' : 'Sign In'}
              </button>
            </form>
            <div className="mt-8 pt-6 border-t border-outline-variant/30 flex flex-col gap-3 items-center">
              <Link to="/signup" className={`transition-colors underline underline-offset-4 ${isStandard ? 'text-sm text-primary hover:text-primary-fixed' : 'font-label-caps text-[10px] text-on-surface-variant hover:text-primary-container uppercase tracking-widest'}`}>
                Create a new account
              </Link>
              <a className={`transition-colors ${isStandard ? 'text-xs text-on-surface-variant hover:text-primary' : 'font-label-caps text-[9px] text-outline hover:text-secondary-fixed uppercase tracking-widest'}`} href="#">
                Forgot Password?
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

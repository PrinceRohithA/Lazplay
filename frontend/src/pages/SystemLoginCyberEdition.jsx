import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth as authApi } from '../api';

export default function SystemLoginCyberEdition() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("EMAIL AND ACCESS_KEY REQUIRED");
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
      <main className="flex-grow flex flex-col items-center justify-center p-margin relative z-10 grid-glow-bg min-h-screen pt-24 pb-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center">
            <h1 className="font-headline-lg text-headline-lg text-primary-container tracking-tighter uppercase font-bold text-center glow-text-primary">
              Login to LazPlay
            </h1>
            <div className="h-0.5 w-24 bg-primary-container mt-2 neon-glow-primary"></div>
          </div>
          <div className="bg-surface-container-low/95 border border-outline-variant p-gutter pixel-border relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-container via-primary-fixed to-primary-container"></div>
            <div className="mt-2 mb-6 flex items-center justify-between">
              <span className="font-label-caps text-[9px] text-outline uppercase tracking-[0.25em]">SIGN_IN_CREDENTIALS</span>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-error/10 border border-error text-error font-label-mono text-[10px] uppercase">
                &gt; {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label className="font-label-caps text-[10px] text-on-surface-variant block uppercase tracking-wider">Email Address</label>
                <div className="relative flex items-center bg-surface-container-lowest border border-outline-variant focus-within:border-primary-container transition-all group">
                  <span className="pl-3 text-primary-container font-medium">&gt;</span>
                  <input 
                    className="bg-transparent border-none focus:ring-0 w-full text-primary-container font-mono py-2.5 placeholder:text-outline/40 placeholder:text-xs" 
                    placeholder="Enter your email" 
                    type="email"
                    value={form.email}
                    onChange={handleChange('email')}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-label-caps text-[10px] text-on-surface-variant block uppercase tracking-wider">Password</label>
                <div className="relative flex items-center bg-surface-container-lowest border border-outline-variant focus-within:border-primary-container transition-all group">
                  <span className="pl-3 text-primary-container font-medium">&gt;</span>
                  <input 
                    className="bg-transparent border-none focus:ring-0 w-full text-primary-container font-mono py-2.5 placeholder:text-outline/40 placeholder:text-xs" 
                    placeholder="Enter your password" 
                    type="password"
                    value={form.password}
                    onChange={handleChange('password')}
                    required
                  />
                </div>
              </div>
              <button 
                className="w-full bg-primary-container/20 border border-primary text-primary hover:bg-primary-container hover:text-black py-3.5 pixel-border uppercase font-bold tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 transition-colors" 
                type="submit"
                disabled={loading}
              >
                {loading ? 'Logging In...' : 'Sign In'}
              </button>
            </form>
            <div className="mt-8 pt-6 border-t border-outline-variant/30 flex flex-col gap-3 items-center">
              <Link to="/signup" className="font-label-caps text-[10px] text-on-surface-variant hover:text-primary-container transition-colors uppercase tracking-widest underline underline-offset-4">
                Create a new account
              </Link>
              <a className="font-label-caps text-[9px] text-outline hover:text-secondary-fixed transition-colors uppercase tracking-widest" href="#">
                Forgot Password?
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

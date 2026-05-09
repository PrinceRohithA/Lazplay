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
      <div className="fixed inset-0 scanlines"></div>
      <header className="flex justify-between items-center px-gutter py-4 w-full z-50 docked full-width top-0 border-b border-outline-variant bg-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-headline-md text-headline-md font-bold text-primary-container drop-shadow-[0_0_8px_rgba(57,255,20,0.6)] uppercase tracking-[0.2em]">
            LAZPLAY
          </Link>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-4 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
            <span className="hover:text-primary-fixed hover:bg-surface-container-high transition-colors cursor-pointer px-2 py-1">V_1.0.4</span>
            <span className="hover:text-primary-fixed hover:bg-surface-container-high transition-colors cursor-pointer px-2 py-1">STATUS: ONLINE</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary-container cursor-pointer hover:text-primary-fixed transition-colors">notifications</span>
            <span className="material-symbols-outlined text-primary-container cursor-pointer hover:text-primary-fixed transition-colors">account_circle</span>
          </div>
        </div>
      </header>
      <main className="flex-grow flex flex-col items-center justify-center p-margin relative z-10">
        <div className="absolute inset-0 -z-10 opacity-5">
          <img className="w-full h-full object-cover grayscale" alt="Cybernetic circuit board" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCPalAwPKqEL-Ly_Rh7yE6ozPaAKgX4VSCN5qTP3N5WXysaAaZg0K0lpuUQRUigkO6ANaq0WJBv1kEPmrRY2wMF_sieOyhC6J4qChCYMaVEp6Ifl9QAKoDWTNQirkdpkVB3O6_rJsagm_F8YdALa67osno1PNZQjgM8yiH2O3Nwh5CnqIgIA7dGvZTm9tAjpSMqDujHuHcMvZ-Nf25xc3eDsnkRMaq4fD6ZVNafuWz1PyaP4HOZDeiVkhJ6c2OcXUaQHZIS0nJ1S1oV"/>
        </div>
        <div className="w-full max-w-md">
          <div className="mb-10 flex flex-col items-center">
            <h1 className="font-headline-lg text-headline-lg text-primary-container tracking-tighter uppercase font-bold text-center">
              SYSTEM_AUTH // LOGIN
            </h1>
            <div className="h-0.5 w-32 bg-primary-container mt-3 neon-glow-primary"></div>
          </div>
          <div className="bg-surface-container-low/90 backdrop-blur-sm border border-outline-variant p-gutter pixel-border relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-container via-primary-fixed to-primary-container"></div>
            <div className="mt-4 mb-8 flex items-center justify-between">
              <span className="font-label-caps text-[10px] text-outline uppercase tracking-[0.2em]">AUTHENTICATION_GATEWAY_V1</span>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-secondary-container animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-primary-container"></div>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-error/10 border border-error text-error font-label-mono text-[10px] uppercase animate-pulse">
                &gt; {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="font-label-caps text-[11px] text-on-surface-variant block uppercase tracking-wider">USER_ID (EMAIL)</label>
                <div className="relative flex items-center bg-surface-container-lowest border border-outline-variant focus-within:border-primary-container transition-all group">
                  <span className="pl-3 text-primary-container font-medium">&gt;</span>
                  <input 
                    className="bg-transparent border-none focus:ring-0 w-full text-primary-container font-mono py-3 placeholder:text-outline/50 placeholder:text-xs" 
                    placeholder="ENTER_IDENTIFIER" 
                    type="email"
                    value={form.email}
                    onChange={handleChange('email')}
                    required
                  />
                  <span className="w-1.5 h-5 bg-primary-container mr-3 cursor-blink"></span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="font-label-caps text-[11px] text-on-surface-variant block uppercase tracking-wider">ACCESS_KEY (PASSWORD)</label>
                <div className="relative flex items-center bg-surface-container-lowest border border-outline-variant focus-within:border-primary-container transition-all group">
                  <span className="pl-3 text-primary-container font-medium">&gt;</span>
                  <input 
                    className="bg-transparent border-none focus:ring-0 w-full text-primary-container font-mono tracking-[0.5em] py-3 placeholder:tracking-normal placeholder:text-outline/50 placeholder:text-xs" 
                    placeholder="••••••••" 
                    type="password"
                    value={form.password}
                    onChange={handleChange('password')}
                    required
                  />
                </div>
              </div>
              <button 
                className="w-full bg-primary-container text-on-primary-container font-headline-md py-4 font-bold uppercase tracking-[0.2em] hover:bg-primary-fixed-dim active:scale-[0.98] transition-all neon-glow-primary relative overflow-hidden group mt-4 disabled:opacity-50" 
                type="submit"
                disabled={loading}
              >
                <span className="relative z-10">{loading ? 'BOOTING...' : 'BOOT_SEQUENCE'}</span>
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
              </button>
            </form>
            <div className="mt-8 pt-6 border-t border-outline-variant/30 flex flex-col gap-4 items-center">
              <Link to="/signup" className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary-container transition-colors uppercase tracking-widest">
                INITIALIZE_NEW_ACCOUNT
              </Link>
              <a className="font-label-caps text-[10px] text-outline hover:text-secondary-fixed transition-colors uppercase tracking-widest" href="#">
                FORGOT_ENCRYPTION_KEY?
              </a>
            </div>
          </div>
          <div className="mt-8 font-label-caps text-[10px] text-outline/60 space-y-1.5 px-2">
            <p className="flex items-center gap-2"><span className="text-primary-container">[SYSTEM]</span> ATTEMPTING HANDSHAKE WITH AUTH_SERVER_04...</p>
            <p className="flex items-center gap-2"><span className="text-secondary-container">[SECURE]</span> ENCRYPTION LAYER: AES-256-BIT ENABLED</p>
            <p className="flex items-center gap-2"><span className="text-primary-container">[STATUS]</span> {loading ? 'EXECUTING_HANDSHAKE...' : 'WAITING FOR USER INPUT_'}</p>
          </div>
        </div>
      </main>
      <footer className="w-full py-6 px-margin flex flex-col md:flex-row justify-between items-center gap-4 mt-auto border-t border-outline-variant bg-surface-container-lowest/80 backdrop-blur-md font-label-caps text-[10px] uppercase text-on-surface-variant tracking-widest">
        <div className="flex items-center gap-4">
          <span className="font-bold text-primary-fixed opacity-80">© 198X NEON_LABS_INC // ALL RIGHTS RESERVED</span>
        </div>
        <div className="flex gap-8">
          <a className="hover:text-primary-container transition-colors hover:underline decoration-dotted" href="#">TERMINAL_DOCS</a>
          <a className="hover:text-primary-container transition-colors hover:underline decoration-dotted" href="#">DISCORD_RELAY</a>
          <a className="hover:text-primary-container transition-colors hover:underline decoration-dotted" href="#">GITHUB_REPOS</a>
        </div>
      </footer>
    </>
  );
}

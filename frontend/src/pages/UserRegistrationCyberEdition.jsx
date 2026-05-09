import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth as authApi } from '../api';

export default function UserRegistrationCyberEdition() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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

    setError(null); 
    setLoading(true);
    try {
      await authApi.register({ 
        username: form.username, 
        email: form.email, 
        password: form.password,
        displayName: form.displayName 
      });
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const handleChange = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <>
      <div className="scanline-overlay"></div>
      <main className="flex-grow flex items-center justify-center p-gutter relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute top-10 left-10 font-label-caps text-primary text-[10px]">SYSTEM_LOAD: 14.2%<br/>UPTIME: 42:12:09</div>
          <div className="absolute bottom-10 right-10 font-label-caps text-secondary text-[10px] text-right">ENCRYPTION: AES_256_ACTIVE<br/>NODE_ID: CH_8832_X</div>
        </div>
        <div className="relative z-10 w-full max-w-lg">
          <div className="bg-surface-container border-2 border-primary-container p-1 shadow-[0_0_20px_rgba(0,240,255,0.2)] rounded-lg">
            <div className="bg-surface-container-high px-4 py-2 flex justify-between items-center mb-6 rounded-t-md">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary-container" style={{fontVariationSettings: "'FILL' 1"}}>terminal</span>
                <h1 className="font-label-caps text-on-surface">LAZPLAY // SECURE_ENTRY</h1>
              </div>
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-error rounded-full"></div>
                <div className="w-3 h-3 bg-secondary-container rounded-full"></div>
                <div className="w-3 h-3 bg-primary-container rounded-full"></div>
              </div>
            </div>
            <div className="px-6 pb-8">
              <div className="mb-10 text-center">
                <h2 className="font-headline-lg text-primary-container mb-2 drop-shadow-[0_0_5px_rgba(0,240,255,0.5)] uppercase tracking-tight">USER_REGISTRATION // PROTOCOL</h2>
                <p className="font-label-caps text-on-surface-variant opacity-70">ESTABLISHING NEW IDENTITY IN THE GRID...</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-error/10 border border-error text-error font-label-mono text-xs uppercase animate-pulse">
                  &gt; ERROR: {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/*  CODENAME Input (username)  */}
                <div className="group">
                  <label className="block font-label-caps text-primary-fixed-dim mb-2 flex items-center gap-2" htmlFor="username">
                    <span className="material-symbols-outlined text-[14px]">person</span>
                    [01] CODENAME (USERNAME)
                  </label>
                  <div className="relative neon-glow-primary transition-all rounded">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container font-label-caps opacity-60">&gt;</span>
                    <input 
                      className="w-full bg-surface-container-low border border-outline-variant focus:border-primary-container text-on-surface font-body-md pl-10 py-3 outline-none transition-colors placeholder:text-outline-variant rounded" 
                      id="username" 
                      name="username" 
                      placeholder="ENTER_ALIAS" 
                      type="text"
                      value={form.username}
                      onChange={handleChange('username')}
                      required
                    />
                  </div>
                </div>

                {/*  DISPLAY_NAME Input  */}
                <div className="group">
                  <label className="block font-label-caps text-primary-fixed-dim mb-2 flex items-center gap-2" htmlFor="displayName">
                    <span className="material-symbols-outlined text-[14px]">badge</span>
                    [02] PUBLIC_HANDLE (DISPLAY_NAME)
                  </label>
                  <div className="relative neon-glow-primary transition-all rounded">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container font-label-caps opacity-60">&gt;</span>
                    <input 
                      className="w-full bg-surface-container-low border border-outline-variant focus:border-primary-container text-on-surface font-body-md pl-10 py-3 outline-none transition-colors placeholder:text-outline-variant rounded" 
                      id="displayName" 
                      name="displayName" 
                      placeholder="ENTER_DISPLAY_NAME" 
                      type="text"
                      value={form.displayName}
                      onChange={handleChange('displayName')}
                      required
                    />
                  </div>
                </div>

                {/*  NET_ADDRESS Input (email)  */}
                <div className="group">
                  <label className="block font-label-caps text-primary-fixed-dim mb-2 flex items-center gap-2" htmlFor="email">
                    <span className="material-symbols-outlined text-[14px]">alternate_email</span>
                    [03] NET_ADDRESS (EMAIL)
                  </label>
                  <div className="relative neon-glow-primary transition-all rounded">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container font-label-caps opacity-60">&gt;</span>
                    <input 
                      className="w-full bg-surface-container-low border border-outline-variant focus:border-primary-container text-on-surface font-body-md pl-10 py-3 outline-none transition-colors placeholder:text-outline-variant rounded" 
                      id="email" 
                      name="email" 
                      placeholder="IDENTITY@NETWORK.SYS" 
                      type="email"
                      value={form.email}
                      onChange={handleChange('email')}
                      required
                    />
                  </div>
                </div>

                {/*  SECURITY_PHRASE Input (password)  */}
                <div className="group">
                  <label className="block font-label-caps text-primary-fixed-dim mb-2 flex items-center gap-2" htmlFor="password">
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                    [04] SECURITY_PHRASE (PASSWORD)
                  </label>
                  <div className="relative neon-glow-primary transition-all rounded">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container font-label-caps opacity-60">&gt;</span>
                    <input 
                      className="w-full bg-surface-container-low border border-outline-variant focus:border-primary-container text-on-surface font-body-md pl-10 py-3 outline-none transition-colors placeholder:text-outline-variant rounded" 
                      id="password" 
                      name="password" 
                      placeholder="********" 
                      type="password"
                      value={form.password}
                      onChange={handleChange('password')}
                      required
                    />
                  </div>
                </div>

                {/*  EXECUTE Button  */}
                <div className="pt-4">
                  <button 
                    className="w-full bg-primary-container text-on-primary-container font-headline-md py-4 rounded hover:bg-primary-fixed-dim active:scale-[0.98] transition-all flex items-center justify-center gap-3 group shadow-[0_0_15px_rgba(0,240,255,0.4)] disabled:opacity-50" 
                    type="submit"
                    disabled={loading}
                  >
                    <span className={`material-symbols-outlined ${loading ? 'animate-spin' : 'group-hover:animate-pulse'}`}>
                      {loading ? 'sync' : 'bolt'}
                    </span>
                    {loading ? 'EXECUTING_PROTOCOL...' : 'EXECUTE_REGISTRATION'}
                  </button>
                </div>
              </form>
              <div className="mt-8 text-center">
                <Link className="font-label-caps text-[10px] text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center gap-1" to="/login">
                  ALREADY_MEMBER? [ ACCESS_TERMINAL ]
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="w-full py-4 px-gutter flex flex-col md:flex-row justify-between items-center gap-4 mt-auto bg-surface-container-lowest border-t border-outline-variant">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <Link to="/" className="font-display-xl text-primary opacity-20 select-none tracking-tighter">LAZPLAY</Link>
          <p className="font-label-caps text-[10px] text-on-surface-variant">© 198X NEON_LABS_INC // ALL RIGHTS RESERVED</p>
        </div>
        <div className="flex gap-4">
          <a className="font-label-caps text-[10px] text-on-surface-variant hover:text-primary-container transition-colors" href="#">TERMINAL_DOCS</a>
          <a className="font-label-caps text-[10px] text-on-surface-variant hover:text-primary-container transition-colors" href="#">DISCORD_RELAY</a>
          <a className="font-label-caps text-[10px] text-on-surface-variant hover:text-primary-container transition-colors" href="#">GITHUB_REPOS</a>
        </div>
      </footer>
      {/*  Aesthetic Image Mosaic (Background)  */}
      <div className="fixed inset-0 -z-10 opacity-10 pointer-events-none grayscale">
        <img className="w-full h-full object-cover" alt="Cybernetic circuit board background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBqaBJBC8csXu20mK7Q2_6_vfW_ZdEGr0-Au4yAK6t9ZsIHfPeneH5OtCaAvd5mAaXGMTMFXrQ3R7Mbx76tJvouQJgy6yfnBRt6e5Enr6Rtlas171WiFpwzryozEUqx3ht19jENgow4nuyjVou_mizE-o8CNsXR9mkwtkCYTJ1QAB9WPa15oj-O5W3ONC4Zq6VVAT9pzyKYyqYQIHFk4WQgq9oMO6U0XASjZIWREbW2ZBsaBqdQhF_yw2VQM6YREKJubmIZ5HhxRsjb"/>
      </div>
    </>
  );
}

import React, { useState } from "react";
import { useLauncherStore } from "../store/useLauncherStore";
import { Gamepad2, Mail, Lock, AlertTriangle, Loader2 } from "lucide-react";

export default function Login() {
  const { login } = useLauncherStore();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError("Please fill in all authorization fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(identifier.trim(), password);
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your system authorization keys.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-screen bg-background grid-glow-bg flex items-center justify-center overflow-hidden">
      {/* Decorative Cyber Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[140px] pointer-events-none animate-pulse duration-[10s]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[6s]"></div>

      <div className="relative z-10 w-full max-w-[440px] px-6">
        {/* Logo and Brand Header */}
        <div className="flex flex-col items-center mb-8 select-none">
          <div className="w-16 h-16 bg-[#0D1410]/40 border border-brand-500/20 rounded-2xl flex items-center justify-center relative shadow-[0_0_20px_rgba(57,255,136,0.06)]">
            <Gamepad2 size={30} className="text-primary drop-shadow-[0_0_8px_var(--primary)]" />
          </div>
          <h1 className="mt-5 text-3xl font-headline-xl text-on-surface uppercase tracking-wider font-bold glow-text-primary">
            LAZPLAY <span className="text-primary">OS</span>
          </h1>
          <p className="mt-1 text-slate-400 text-[10px] font-label-mono uppercase tracking-[0.3em]">
            System Authorization Access
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0D1410]/30 pixel-border p-8 relative">
          {/* Subtle neon glowing accent bar */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-label-mono font-bold text-slate-400 mb-2 uppercase tracking-widest">
                Uplink ID or Email
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                  <Mail size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Enter your identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loading}
                  className="w-full bg-[#0B120D] border border-brand-500/12 focus:border-brand-500/60 rounded-lg py-3.5 pl-11 pr-4 text-sm text-slate-200 transition-all outline-none focus:shadow-[0_0_12px_rgba(57,255,136,0.12)] font-sans"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-label-mono font-bold text-slate-400 mb-2 uppercase tracking-widest">
                Security Password
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full bg-[#0B120D] border border-brand-500/12 focus:border-brand-500/60 rounded-lg py-3.5 pl-11 pr-4 text-sm text-slate-200 transition-all outline-none focus:shadow-[0_0_12px_rgba(57,255,136,0.12)] font-sans"
                  required
                />
              </div>
            </div>

            {/* Error Alert Box */}
            {error && (
              <div className="bg-error-container/10 border border-error/20 rounded-lg p-4 text-error text-[10px] font-label-mono uppercase flex items-start gap-3">
                <AlertTriangle size={16} className="shrink-0" />
                <span className="leading-relaxed font-bold">[SYS_ERROR]: {error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full py-3.5 px-4 bg-brand-500 text-slate-950 hover:bg-brand-500/80 active:scale-[0.98] rounded-lg font-sans font-bold text-sm tracking-wide shadow-[0_0_15px_rgba(57,255,136,0.12)] transition-all flex items-center justify-center gap-2 select-none"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Initialize Link</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

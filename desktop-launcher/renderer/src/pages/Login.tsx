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
    <div className="relative min-h-screen w-screen bg-transparent flex items-center justify-center overflow-hidden font-sans">
      {/* Decorative Cyber Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[10s]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse duration-[6s]"></div>

      <div className="relative z-10 w-full max-w-[440px] px-6">
        {/* Logo and Brand Header */}
        <div className="flex flex-col items-center mb-8 select-none">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-blue-400 p-[1.5px] shadow-[0_0_30px_rgba(59,130,246,0.3)] animate-bounce duration-[3s]">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <Gamepad2 size={32} className="text-brand-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            </div>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white uppercase">
            LAZPLAY <span className="text-brand-500">OS</span>
          </h1>
          <p className="mt-1 text-slate-500 text-xs font-bold uppercase tracking-wider">
            System Authorization Access
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(59,130,246,0.1)] relative">
          {/* Subtle neon glowing accent bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent rounded-t-2xl"></div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 px-1">
                SYSTEM_IDENTIFIER
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-500 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="text"
                  placeholder="USERNAME OR EMAIL"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-950/80 border border-slate-800/80 focus:border-brand-500/80 rounded-xl py-3 pl-11 pr-4 text-sm font-medium text-white transition-all outline-none focus:ring-1 focus:ring-brand-500/30"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 px-1">
                ACCESS_DECRYPT_KEY
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  placeholder="PASSWORD"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-950/80 border border-slate-800/80 focus:border-brand-500/80 rounded-xl py-3 pl-11 pr-4 text-sm font-medium text-white transition-all outline-none focus:ring-1 focus:ring-brand-500/30"
                  required
                />
              </div>
            </div>

            {/* Error Alert Box */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span className="leading-normal font-medium">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full py-3.5 px-4 bg-brand-500 hover:bg-brand-400 disabled:bg-brand-500/50 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-500/10 hover:shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 select-none"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>AUTHORIZING_SESSION...</span>
                </>
              ) : (
                <span>INITIATE_OS_ACCESS</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer Security Note */}
        <div className="mt-8 text-center text-[10px] text-slate-600 font-bold uppercase tracking-wider select-none">
          SECURE ENCRYPTED CHANNEL // VER 1.0.0
        </div>
      </div>
    </div>
  );
}

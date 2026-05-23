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
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(identifier.trim(), password);
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your username and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-screen bg-background flex items-center justify-center overflow-hidden">
      <div className="relative z-10 w-full max-w-[440px] px-6">
        {/* Logo and Brand Header */}
        <div className="flex flex-col items-center mb-8 select-none">
          <div className="w-16 h-16 bg-surface-container/40 border border-outline-variant rounded-2xl flex items-center justify-center relative">
            <Gamepad2 size={30} className="text-primary" />
          </div>
          <h1 className="mt-5 text-3xl font-headline-xl text-on-surface uppercase tracking-wider font-bold">
            LAZPLAY <span className="text-primary">OS</span>
          </h1>
          <p className="mt-1 text-on-surface-variant text-xs font-label-mono uppercase tracking-[0.1em]">
            Log In
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-surface-container/30 pixel-border p-8 relative">

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-label-mono font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
                Username or Email
              </label>
              <div className="input-wrapper group pl-3.5">
                <Mail size={16} className="text-on-surface-variant group-focus-within:text-primary transition-colors shrink-0" />
                <input
                  type="text"
                  placeholder="Enter your username or email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loading}
                  className="launcher-input pl-2.5"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-label-mono font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
                Password
              </label>
              <div className="input-wrapper group pl-3.5">
                <Lock size={16} className="text-on-surface-variant group-focus-within:text-primary transition-colors shrink-0" />
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="launcher-input pl-2.5"
                  required
                />
              </div>
            </div>

            {/* Error Alert Box */}
            {error && (
              <div className="bg-error-container/10 border border-error/20 rounded-lg p-4 text-error text-[10px] font-label-mono uppercase flex items-start gap-3">
                <AlertTriangle size={16} className="shrink-0" />
                <span className="leading-relaxed font-bold">Error: {error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full btn btn-primary py-3.5 flex items-center justify-center gap-2 select-none"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Logging In...</span>
                </>
              ) : (
                <span>Log In</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

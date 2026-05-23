import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function DownloadLauncher() {
  const [detectedOS, setDetectedOS] = useState('Windows');

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes('win')) {
      setDetectedOS('Windows');
    } else if (userAgent.includes('mac')) {
      setDetectedOS('macOS');
    } else if (userAgent.includes('linux')) {
      setDetectedOS('Linux');
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-[#e5e5e7] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Radial glow background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(163,230,53,0.07),transparent_50%)] pointer-events-none" />
      
      {/* Fine grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#a3e635 1px, transparent 1px), linear-gradient(90deg, #a3e635 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }}
      />

      <div className="max-w-3xl w-full z-10 space-y-12">
        {/* Navigation / Header */}
        <div className="flex justify-between items-center border-b border-[#1f1f1f] pb-6">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#a3e635] animate-ping" />
            <span className="font-mono text-xs uppercase tracking-widest text-[#a3e635]">SYS.LAUNCHER_DISTRIBUTION</span>
          </div>
          <span className="font-mono text-xs text-[#71717a]">V1.0.0-RELEASE</span>
        </div>

        {/* Main Card */}
        <div className="bg-[#0b0b0b] border border-[#1f1f1f] hover:border-[#a3e635]/30 p-8 md:p-12 transition-all duration-500 relative rounded-lg group shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          {/* Subtle top lime indicator line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#a3e635] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1a2e05] border border-[#3f6212]/30 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a3e635]" />
                <span className="font-mono text-[10px] tracking-wider text-[#bef264] uppercase">Detected OS: {detectedOS}</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white font-sans">
                LAZPLAY <span className="text-[#a3e635] drop-shadow-[0_0_15px_rgba(163,230,53,0.3)]">DESKTOP</span>
              </h1>
              
              <p className="text-sm md:text-base text-[#a1a1aa] leading-relaxed max-w-xl font-sans">
                Experience high-performance native execution. The LazPlay Desktop Launcher unlocks direct hardware access, low-latency rendering, and cloud saves for your library.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <a
                href="https://media.lazplay.tech/launcher_builds/windows_launcher_v1.0.0/LazPlay-Windows-1.0.0-Setup.zip"
                className="bg-[#a3e635] hover:bg-[#bef264] text-black font-semibold px-8 py-4 rounded transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(163,230,53,0.15)] hover:shadow-[0_0_25px_rgba(163,230,53,0.35)] hover:-translate-y-0.5 active:translate-y-0 font-sans"
              >
                <span className="material-symbols-outlined font-bold">download</span>
                Download for Windows
              </a>
              <a
                href="https://media.lazplay.tech/launcher_builds/windows_launcher_v1.0.0/LazPlay-Linux-1.0.0-Setup.zip"
                className="border border-[#27272a] hover:border-[#a3e635] bg-transparent text-white hover:text-black hover:bg-[#a3e635] font-semibold px-8 py-4 rounded transition-all duration-300 flex items-center justify-center gap-3 hover:-translate-y-0.5 active:translate-y-0 font-sans"
              >
                <span className="material-symbols-outlined">terminal</span>
                Download for Linux
              </a>
            </div>

            {/* Verification hashes / stats */}
            <div className="pt-6 border-t border-[#1f1f1f] flex flex-wrap gap-x-8 gap-y-3 text-[11px] font-mono text-[#71717a]">
              <div>
                FILE SIZE: <span className="text-[#e5e5e7]">~48 MB</span>
              </div>
              <div>
                SHA256: <span className="text-[#e5e5e7]">4f7c...8a1e</span>
              </div>
              <div>
                STATUS: <span className="text-[#a3e635]">VERIFIED SECURE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0b0b0b] border border-[#1f1f1f] p-6 rounded-lg space-y-3 hover:border-[#a3e635]/20 transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-[#141414] border border-[#27272a] flex items-center justify-center text-[#a3e635]">
              <span className="material-symbols-outlined">bolt</span>
            </div>
            <h3 className="text-sm font-semibold text-white font-sans">MAX PERFORMANCE</h3>
            <p className="text-xs text-[#71717a] leading-relaxed font-sans">Direct GPU utilization and optimized resource management for raw execution speed.</p>
          </div>

          <div className="bg-[#0b0b0b] border border-[#1f1f1f] p-6 rounded-lg space-y-3 hover:border-[#a3e635]/20 transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-[#141414] border border-[#27272a] flex items-center justify-center text-[#a3e635]">
              <span className="material-symbols-outlined">sync</span>
            </div>
            <h3 className="text-sm font-semibold text-white font-sans">AUTO UPDATES</h3>
            <p className="text-xs text-[#71717a] leading-relaxed font-sans">Background update service ensures you always have the latest launcher patches.</p>
          </div>

          <div className="bg-[#0b0b0b] border border-[#1f1f1f] p-6 rounded-lg space-y-3 hover:border-[#a3e635]/20 transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-[#141414] border border-[#27272a] flex items-center justify-center text-[#a3e635]">
              <span className="material-symbols-outlined">shield</span>
            </div>
            <h3 className="text-sm font-semibold text-white font-sans">SECURE LAUNCH</h3>
            <p className="text-xs text-[#71717a] leading-relaxed font-sans">Session verification protocols protect your account credentials and downloads.</p>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center pt-4">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-xs font-mono text-[#71717a] hover:text-[#a3e635] transition-colors uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Return to the Web Grid
          </Link>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';

export default function LauncherDownloadPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-gutter relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-container/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary-container/10 rounded-full blur-[120px] animate-pulse delay-700"></div>

      <div className="max-w-4xl w-full z-10">
        <div className="bg-surface-container border-2 border-outline-variant p-8 md:p-12 shadow-[20px_20px_0_0_rgba(var(--primary-container-rgb),0.2)] relative">
          <div className="absolute top-0 right-0 p-4 font-label-mono text-[10px] text-outline-variant opacity-50 tracking-widest uppercase">
            PROTOCOL: LAUNCHER_ACQUISITION_MODE
          </div>

          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 text-center md:text-left">
              <h1 className="font-headline-xl text-headline-xl text-primary-container uppercase mb-4 drop-shadow-[0_0_15px_rgba(var(--primary-container-rgb),0.5)]">
                LAZPLAY_DESKTOP
              </h1>
              <p className="font-body-lg text-on-surface-variant mb-8 leading-relaxed">
                Experience the Grid at its full potential. The LazPlay Desktop Launcher is required for high-fidelity native titles on Windows and Linux systems.
                Enjoy faster downloads, cloud saves, and direct hardware access for a seamless gaming experience.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <a
                  href="https://media.lazplay.tech/launcher_builds/windows_launcher_v1.0.0/LazPlay-Windows-1.0.0-Setup.zip"
                  className="bg-primary-container text-on-primary-fixed-variant px-8 py-4 font-label-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-3 shadow-[8px_8px_0_0_rgba(0,0,0,0.5)] active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  <span className="material-symbols-outlined">download</span>
                  DOWNLOAD_WINDOWS
                </a>
                <a
                  href="https://media.lazplay.tech/launcher_builds/windows_launcher_v1.0.0/LazPlay-Linux-1.0.0-Setup.zip"
                  className="bg-surface border-2 border-primary-container text-primary-container px-8 py-4 font-label-mono font-bold uppercase tracking-widest hover:bg-primary-container/10 transition-all flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined">terminal</span>
                  DOWNLOAD_LINUX
                </a>
              </div>

              <p className="mt-8 font-label-mono text-[10px] text-outline-variant uppercase">
                VERSION: 1.0.0-STABLE // BUILD: GRID_STABLE
              </p>
            </div>

            <div className="w-full md:w-64 aspect-square bg-surface border-2 border-outline-variant relative overflow-hidden group flex items-center justify-center">
              <div className="absolute inset-0 bg-primary-container/5 animate-pulse"></div>
              <span className="material-symbols-outlined text-[120px] text-primary-container/30 group-hover:scale-110 transition-transform duration-700">rocket_launch</span>
              <div className="absolute bottom-4 left-0 right-0 text-center font-label-mono text-[10px] text-primary-container/50 tracking-tighter">
                READY_FOR_ORBIT
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container/50 border border-outline-variant p-6 hover:border-primary-container/50 transition-colors">
            <span className="material-symbols-outlined text-primary-container mb-2">speed</span>
            <h4 className="font-label-mono text-label-mono text-on-surface uppercase mb-2">MAX_PERFORMANCE</h4>
            <p className="font-label-mono text-[10px] text-on-surface-variant">Optimized for low-latency native execution and GPU utilization.</p>
          </div>
          <div className="bg-surface-container/50 border border-outline-variant p-6 hover:border-primary-container/50 transition-colors">
            <span className="material-symbols-outlined text-primary-container mb-2">sync</span>
            <h4 className="font-label-mono text-label-mono text-on-surface uppercase mb-2">AUTO_UPDATER</h4>
            <p className="font-label-mono text-[10px] text-on-surface-variant">Stay updated with the latest patches and build versioning automatically.</p>
          </div>
          <div className="bg-surface-container/50 border border-outline-variant p-6 hover:border-primary-container/50 transition-colors">
            <span className="material-symbols-outlined text-primary-container mb-2">security</span>
            <h4 className="font-label-mono text-label-mono text-on-surface uppercase mb-2">SECURE_GRID</h4>
            <p className="font-label-mono text-[10px] text-on-surface-variant">Encrypted session handling and secure credential synchronization.</p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link to="/" className="font-label-mono text-label-mono text-primary-container hover:underline uppercase tracking-widest flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            RETURN_TO_THE_GRID
          </Link>
        </div>
      </div>
    </div>
  );
}

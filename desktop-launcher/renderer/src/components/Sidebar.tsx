import { useState } from "react";
import { useLauncherStore } from "../store/useLauncherStore";
import {
  Gamepad2,
  Settings,
  Download,
  LayoutGrid,
  Library,
  Play,
  Pause,
  LogOut,
  Terminal,
} from "lucide-react";

export default function Sidebar() {
  const { games, activePage, setActivePage, logout } = useLauncherStore();
  const [showDownloads, setShowDownloads] = useState(false);
  const gameList = Object.values(games);

  const activeDownloads = gameList.filter(
    (g) => g.status === "downloading" || g.status === "paused",
  );

  const handlePauseResume = (id: string, isPaused: boolean) => {
    if (window.lazplayAPI) {
      if (isPaused) window.lazplayAPI.resumeDownload(id);
      else window.lazplayAPI.pauseDownload(id);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] flex items-center bg-slate-950/90 backdrop-blur-md px-6 py-2.5 border border-slate-800/80 rounded-full shadow-[0_15px_30px_-5px_rgba(0,0,0,0.8),0_0_20px_rgba(var(--brand-rgb),0.05)] gap-6 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Brand Logo & Header */}
      <div className="flex items-center gap-2 pr-4 border-r border-slate-800/80">
        <Gamepad2
          size={22}
          className="text-brand-500 drop-shadow-[0_0_8px_rgba(var(--brand-rgb),0.6)] animate-pulse"
        />
        <span className="text-brand-500 font-black text-sm tracking-widest font-mono">LAZPLAY_OS</span>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setActivePage("library")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 ${
            activePage === "library"
              ? "bg-brand-500/10 text-brand-500 border border-brand-500/30"
              : "border border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/40"
          }`}
        >
          <Library size={14} />
          <span>Library</span>
        </button>

        <button
          onClick={() => setActivePage("store")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 ${
            activePage === "store"
              ? "bg-brand-500/10 text-brand-500 border border-brand-500/30"
              : "border border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/40"
          }`}
        >
          <LayoutGrid size={14} />
          <span>Store</span>
        </button>

        <button
          onClick={() => setActivePage("developer")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 ${
            activePage === "developer"
              ? "bg-brand-500/10 text-brand-500 border border-brand-500/30"
              : "border border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/40"
          }`}
        >
          <Terminal size={14} />
          <span>Dev_Console</span>
        </button>

        <button
          onClick={() => setActivePage("settings")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 ${
            activePage === "settings"
              ? "bg-brand-500/10 text-brand-500 border border-brand-500/30"
              : "border border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/40"
          }`}
        >
          <Settings size={14} />
          <span>Settings</span>
        </button>
      </div>

      {/* Extra Utilities (Downloads Panel Toggle & Logout) */}
      <div className="flex items-center gap-2 pl-4 border-l border-slate-800/80 relative">
        
        {/* Active Downloads Toggle Button */}
        {activeDownloads.length > 0 && (
          <button
            onClick={() => setShowDownloads(!showDownloads)}
            className={`relative p-2 rounded-full border transition-all ${
              showDownloads
                ? "bg-brand-500/10 border-brand-500 text-brand-500"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Download size={14} className={activeDownloads.some(d => d.status === "downloading") ? "animate-bounce" : ""} />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-500 text-slate-950 font-black text-[9px] flex items-center justify-center animate-pulse">
              {activeDownloads.length}
            </span>
          </button>
        )}

        {/* Downloads Floating Popover Panel */}
        {showDownloads && activeDownloads.length > 0 && (
          <div className="absolute bottom-14 right-0 w-80 bg-slate-950/95 border border-slate-800/80 rounded-xl p-4 shadow-2xl space-y-3 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200 backdrop-blur">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 pb-1 border-b border-slate-800/80">
              <Download size={12} />
              _ACTIVE_DOWNLOADS_QUEUE
            </h3>
            <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
              {activeDownloads.map((game) => (
                <div
                  key={game.id}
                  className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800/80"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold text-slate-300 truncate pr-2">
                      {game.title}
                    </span>
                    <button
                      onClick={() =>
                        handlePauseResume(game.id, game.status === "paused")
                      }
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {game.status === "paused" ? (
                        <Play size={12} />
                      ) : (
                        <Pause size={12} />
                      )}
                    </button>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mb-1 overflow-hidden">
                    <div
                      className="bg-brand-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${game.progress || 0}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-slate-500">
                    <span>
                      {game.status === "paused" ? "PAUSED" : "DOWNLOADING"}
                    </span>
                    <span>{Math.round(game.progress || 0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logout Trigger */}
        <button
          onClick={logout}
          title="Logout of LazPlay OS"
          className="p-2 bg-red-950/20 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 text-red-400 hover:text-white rounded-full transition-all duration-200 active:scale-90"
        >
          <LogOut size={14} />
        </button>
      </div>

    </div>
  );
}

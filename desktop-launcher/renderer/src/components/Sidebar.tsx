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
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[999] flex items-center bg-slate-950/80 backdrop-blur-md px-3 py-1.5 border border-slate-800/80 rounded-full shadow-[0_12px_24px_-6px_rgba(0,0,0,0.9),0_0_20px_rgba(var(--brand-rgb),0.02)] gap-2.5 select-none animate-in fade-in slide-in-from-bottom-5 duration-300">
      
      {/* Brand Icon */}
      <div className="flex items-center justify-center pr-2 border-r border-slate-850">
        <Gamepad2
          size={15}
          className="text-brand-500 drop-shadow-[0_0_6px_rgba(var(--brand-rgb),0.4)] animate-pulse"
        />
      </div>

      {/* Navigation Tabs (Sleek Ultra-Compact Icons with Tooltips) */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            setActivePage("library");
            setShowDownloads(false);
          }}
          title="Library"
          className={`p-1.5 rounded-full transition-all duration-200 active:scale-90 hover:scale-110 ${
            activePage === "library"
              ? "bg-brand-500/10 text-brand-500 border border-brand-500/30 shadow-[0_0_10px_rgba(var(--brand-rgb),0.2)]"
              : "border border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/40"
          }`}
        >
          <Library size={15} />
        </button>

        <button
          onClick={() => {
            setActivePage("store");
            setShowDownloads(false);
          }}
          title="Storefront"
          className={`p-1.5 rounded-full transition-all duration-200 active:scale-90 hover:scale-110 ${
            activePage === "store"
              ? "bg-brand-500/10 text-brand-500 border border-brand-500/30 shadow-[0_0_10px_rgba(var(--brand-rgb),0.2)]"
              : "border border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/40"
          }`}
        >
          <LayoutGrid size={15} />
        </button>

        <button
          onClick={() => {
            setActivePage("developer");
            setShowDownloads(false);
          }}
          title="Developer Console"
          className={`p-1.5 rounded-full transition-all duration-200 active:scale-90 hover:scale-110 ${
            activePage === "developer"
              ? "bg-brand-500/10 text-brand-500 border border-brand-500/30 shadow-[0_0_10px_rgba(var(--brand-rgb),0.2)]"
              : "border border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/40"
          }`}
        >
          <Terminal size={15} />
        </button>

        <button
          onClick={() => {
            setActivePage("settings");
            setShowDownloads(false);
          }}
          title="Settings"
          className={`p-1.5 rounded-full transition-all duration-200 active:scale-90 hover:scale-110 ${
            activePage === "settings"
              ? "bg-brand-500/10 text-brand-500 border border-brand-500/30 shadow-[0_0_10px_rgba(var(--brand-rgb),0.2)]"
              : "border border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/40"
          }`}
        >
          <Settings size={15} />
        </button>
      </div>

      {/* Extra Utilities */}
      <div className="flex items-center gap-2 pl-2 border-l border-slate-850 relative">
        
        {/* Active Downloads Toggle Button */}
        {activeDownloads.length > 0 && (
          <button
            onClick={() => setShowDownloads(!showDownloads)}
            title="Download Queue"
            className={`relative p-1.5 rounded-full border transition-all hover:scale-110 active:scale-90 ${
              showDownloads
                ? "bg-brand-500/10 border-brand-500 text-brand-500"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Download size={14} className={activeDownloads.some(d => d.status === "downloading") ? "animate-bounce" : ""} />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-brand-500 text-slate-950 font-black text-[8px] flex items-center justify-center animate-pulse">
              {activeDownloads.length}
            </span>
          </button>
        )}

        {/* Downloads Floating Popover Panel */}
        {showDownloads && activeDownloads.length > 0 && (
          <div className="absolute bottom-12 right-0 w-80 bg-slate-950/95 border border-slate-800/80 rounded-xl p-4 shadow-2xl space-y-3 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200 backdrop-blur">
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
          title="Logout"
          className="p-1.5 bg-red-950/20 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 text-red-400 hover:text-white rounded-full transition-all duration-200 active:scale-90 hover:scale-110"
        >
          <LogOut size={14} />
        </button>
      </div>

    </div>
  );
}

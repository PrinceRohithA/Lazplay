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

export default function tobbar() {
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
    <div className="fixed top-0 left-0 right-0 w-full h-16 z-[999] flex items-center justify-between bg-surface/90 backdrop-blur-md px-6 border-b border-outline-variant shadow-[0_4px_20px_rgba(0,0,0,0.15)] select-none animate-in fade-in slide-in-from-top duration-300">
      
      {/* Left Section: Brand Logo + Navigation Tabs */}
      <div className="flex items-center gap-6">
        {/* Brand Icon */}
        <div className="flex items-center justify-center pr-5 border-r border-outline-variant h-8">
          <Gamepad2
            size={18}
            className="text-primary"
          />
          <span className="ml-2.5 text-xs font-black tracking-widest text-on-surface">
            LAZPLAY OS
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActivePage("library");
              setShowDownloads(false);
            }}
            className={`px-3 py-1.5 rounded-md text-[10px] font-black tracking-widest uppercase transition-all duration-200 flex items-center gap-2 ${
              activePage === "library"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "border border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/40"
            }`}
          >
            <Library size={13} />
            LIBRARY
          </button>

          <button
            onClick={() => {
              setActivePage("store");
              setShowDownloads(false);
            }}
            className={`px-3 py-1.5 rounded-md text-[10px] font-black tracking-widest uppercase transition-all duration-200 flex items-center gap-2 ${
              activePage === "store"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "border border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/40"
            }`}
          >
            <LayoutGrid size={13} />
            STOREFRONT
          </button>

          <button
            onClick={() => {
              setActivePage("developer");
              setShowDownloads(false);
            }}
            className={`px-3 py-1.5 rounded-md text-[10px] font-black tracking-widest uppercase transition-all duration-200 flex items-center gap-2 ${
              activePage === "developer"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "border border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/40"
            }`}
          >
            <Terminal size={13} />
            CREATOR
          </button>

          <button
            onClick={() => {
              setActivePage("settings");
              setShowDownloads(false);
            }}
            className={`px-3 py-1.5 rounded-md text-[10px] font-black tracking-widest uppercase transition-all duration-200 flex items-center gap-2 ${
              activePage === "settings"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "border border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/40"
            }`}
          >
            <Settings size={13} />
            SETTINGS
          </button>
        </div>
      </div>

      {/* Right Section: Downloads Queue & Profile Actions */}
      <div className="flex items-center gap-3 relative">
        
        {/* Active Downloads Toggle Button */}
        {activeDownloads.length > 0 && (
          <button
            onClick={() => setShowDownloads(!showDownloads)}
            title="Download Queue"
            className={`relative px-3 py-1.5 rounded-md border text-[10px] font-black tracking-widest transition-all flex items-center gap-2 hover:scale-105 active:scale-95 ${
              showDownloads
                ? "bg-primary/10 border-primary text-primary"
                : "bg-surface-container border-outline-variant text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Download size={13} className={activeDownloads.some(d => d.status === "downloading") ? "animate-bounce" : ""} />
            DOWNLOADING
            <span className="w-3.5 h-3.5 rounded bg-primary text-white font-bold text-[9px] flex items-center justify-center animate-pulse">
              {activeDownloads.length}
            </span>
          </button>
        )}

        {/* Downloads Floating Popover Panel */}
        {showDownloads && activeDownloads.length > 0 && (
          <div className="absolute top-12 right-0 w-80 bg-surface-container border border-outline-variant rounded-xl p-4 shadow-2xl space-y-3 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur">
            <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2 pb-1 border-b border-outline-variant">
              <Download size={12} />
              Active Downloads Queue
            </h3>
            <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
              {activeDownloads.map((game) => (
                <div
                  key={game.id}
                  className="bg-surface/60 rounded-lg p-2.5 border border-outline-variant"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold text-on-surface truncate pr-2">
                      {game.title}
                    </span>
                    <button
                      onClick={() =>
                        handlePauseResume(game.id, game.status === "paused")
                      }
                      className="text-on-surface-variant hover:text-on-surface transition-colors"
                    >
                      {game.status === "paused" ? (
                        <Play size={12} />
                      ) : (
                        <Pause size={12} />
                      )}
                    </button>
                  </div>
                  <div className="w-full bg-surface-container-high rounded-full h-1.5 mb-1 overflow-hidden">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${game.progress || 0}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-on-surface-variant/70">
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
          className="p-1.5 bg-red-950/20 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 text-red-400 hover:text-white rounded-md transition-all duration-200 active:scale-95 hover:scale-105 flex items-center gap-1.5 text-[9px] font-black tracking-widest"
        >
          <LogOut size={13} />
          LOGOUT
        </button>
      </div>

    </div>
  );
}

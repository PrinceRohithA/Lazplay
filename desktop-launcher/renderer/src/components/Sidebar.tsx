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
    <div className="flex flex-col h-full bg-slate-950 text-slate-300">
      {/* Brand Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3 text-brand-500 font-bold text-xl tracking-wide select-none">
          <Gamepad2
            size={28}
            className="drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]"
          />
          <span>LAZPLAY</span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="px-4 py-2 space-y-1">
        <button
          onClick={() => setActivePage("library")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
            activePage === "library"
              ? "bg-brand-500/10 text-brand-500"
              : "hover:bg-slate-800/50 hover:text-slate-100 text-slate-400"
          }`}
        >
          <Library size={20} />
          <span>Library</span>
        </button>
        <button
          onClick={() => setActivePage("store")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
            activePage === "store"
              ? "bg-brand-500/10 text-brand-500"
              : "hover:bg-slate-800/50 hover:text-slate-100 text-slate-400"
          }`}
        >
          <LayoutGrid size={20} />
          <span>Store</span>
        </button>
        <button
          onClick={() => setActivePage("developer")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
            activePage === "developer"
              ? "bg-brand-500/10 text-brand-500"
              : "hover:bg-slate-800/50 hover:text-slate-100 text-slate-400"
          }`}
        >
          <Terminal size={20} />
          <span>Developer Console</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Active Downloads */}
        {activeDownloads.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2 flex items-center gap-2">
              <Download size={14} />
              Downloads
            </h3>
            <div className="space-y-2">
              {activeDownloads.map((game) => (
                <div
                  key={game.id}
                  className="bg-slate-900 rounded-lg p-3 border border-slate-800"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-300 truncate pr-2">
                      {game.title}
                    </span>
                    <button
                      onClick={() =>
                        handlePauseResume(game.id, game.status === "paused")
                      }
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {game.status === "paused" ? (
                        <Play size={14} />
                      ) : (
                        <Pause size={14} />
                      )}
                    </button>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mb-1 overflow-hidden">
                    <div
                      className="bg-brand-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${game.progress || 0}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>
                      {game.status === "paused" ? "Paused" : "Downloading"}
                    </span>
                    <span>{Math.round(game.progress || 0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Settings & Logout */}
      <div className="p-4 border-t border-slate-800/50 space-y-1">
        <button
          onClick={() => setActivePage("settings")}
          className={`flex items-center gap-3 px-2.5 py-2 rounded-lg w-full text-sm font-medium transition-all ${
            activePage === "settings"
              ? "bg-brand-500/10 text-brand-500 font-bold"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
        <button 
          onClick={logout}
          className="flex items-center gap-3 text-red-400 hover:text-white hover:bg-red-500/10 active:scale-[0.98] transition-all px-2.5 py-2 rounded-lg w-full text-sm font-bold uppercase tracking-wider"
        >
          <LogOut size={18} />
          <span>LOGOUT_OS</span>
        </button>
      </div>
    </div>
  );
}

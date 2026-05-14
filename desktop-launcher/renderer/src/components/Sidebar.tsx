import { useLauncherStore } from "../store/useLauncherStore";
import {
  Gamepad2,
  Settings,
  Download,
  LayoutGrid,
  Library,
  Play,
  Pause,
  Trash2,
  FolderOpen,
} from "lucide-react";

export default function Sidebar() {
  const { games } = useLauncherStore();
  const gameList = Object.values(games);

  const installedGames = gameList.filter(
    (g) => g.status === "installed" || g.status === "uninstalled",
  );
  const activeDownloads = gameList.filter(
    (g) => g.status === "downloading" || g.status === "paused",
  );

  const handleLaunch = (id: string) => {
    if (window.lazplayAPI) window.lazplayAPI.launchGame(id);
  };

  const handlePauseResume = (id: string, isPaused: boolean) => {
    if (window.lazplayAPI) {
      if (isPaused) window.lazplayAPI.resumeDownload(id);
      else window.lazplayAPI.pauseDownload(id);
    }
  };

  const handleUninstall = (id: string) => {
    if (window.lazplayAPI) window.lazplayAPI.uninstallGame(id);
  };

  const handleOpenFolder = (id: string) => {
    if (window.lazplayAPI) window.lazplayAPI.openInstallFolder(id);
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
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-brand-500/10 text-brand-500 font-medium transition-colors">
          <Library size={20} />
          <span>Library</span>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/50 hover:text-slate-100 transition-colors">
          <LayoutGrid size={20} />
          <span>Store</span>
        </button>
      </div>

      {/* Installed Games List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
            Installed
          </h3>
          <div className="space-y-1">
            {installedGames.map((game) => (
              <div
                key={game.id}
                className="group relative flex flex-col p-2 rounded-lg hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-700/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <Gamepad2 size={16} className="text-slate-400" />
                  </div>
                  <div className="flex-1 truncate">
                    <div className="text-sm font-medium text-slate-200 truncate">
                      {game.title}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {game.isRunning ? (
                        <span className="text-emerald-500">Running</span>
                      ) : (
                        "Installed"
                      )}
                    </div>
                  </div>
                </div>

                {/* Hover Actions */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleLaunch(game.id)}
                    className="p-1.5 bg-brand-500 text-white rounded-md hover:bg-brand-400 shadow-lg"
                    title="Launch Game"
                  >
                    <Play size={14} fill="currentColor" />
                  </button>
                  <button
                    onClick={() => handleOpenFolder(game.id)}
                    className="p-1.5 bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600 shadow-lg"
                    title="Open Install Folder"
                  >
                    <FolderOpen size={14} />
                  </button>
                  <button
                    onClick={() => handleUninstall(game.id)}
                    className="p-1.5 bg-red-500/20 text-red-400 rounded-md hover:bg-red-500 hover:text-white shadow-lg transition-colors"
                    title="Uninstall"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {installedGames.length === 0 && (
              <div className="text-sm text-slate-600 px-2 py-1">
                No games installed
              </div>
            )}
          </div>
        </div>

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

      {/* Footer / Settings */}
      <div className="p-4 border-t border-slate-800/50">
        <button className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors px-2 py-1 rounded w-full hover:bg-slate-800/50">
          <Settings size={18} />
          <span className="text-sm font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
}

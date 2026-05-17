import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Library from "./pages/Library";
import Login from "./pages/Login";
import DeveloperConsole from "./pages/DeveloperConsole";
import Settings, { applyThemeColor } from "./pages/Settings";
import { useLauncherStore } from "./store/useLauncherStore";

function App() {
  const {
    activePage,
    loadInstalledGames,
    syncRemoteLibrary,
    updateDownloadProgress,
    setRunningState,
    isAuthenticated,
    authChecked,
    checkAuth,
  } = useLauncherStore();

  const [setupPrompt, setSetupPrompt] = useState<{
    gameId: string;
    title: string;
    options: string[];
  } | null>(null);

  useEffect(() => {
    // Apply saved colors or default storefront NEON_GREEN on startup
    const savedPrimary = localStorage.getItem("lazplay-launcher-color") || "#39ff14";
    const savedSecondary = localStorage.getItem("lazplay-launcher-secondary") || "#ffabf3";
    applyThemeColor(savedPrimary, savedSecondary);
  }, []);

  useEffect(() => {
    // Initial Load - first verify user session
    checkAuth();
    loadInstalledGames();

    if (window.lazplayAPI) {
      window.lazplayAPI.onDownloadProgress((data: any) => {
        updateDownloadProgress(data);
      });

      window.lazplayAPI.onGameStateChange((data: any) => {
        setRunningState(data.gameId, data.state === "running");
      });

      window.lazplayAPI.onRequestEntrypoint((data: any) => {
        setSetupPrompt({
          gameId: data.gameId,
          title: data.title,
          options: data.potentialEntrypoints,
        });
      });

      window.lazplayAPI.onSessionUpdated(() => {
        console.log("Session updated, syncing library...");
        syncRemoteLibrary();
      });

      window.lazplayAPI.onDeepLink((url: string) => {
        console.log("Deep link received:", url);
      });
    }
  }, [checkAuth, loadInstalledGames, updateDownloadProgress, setRunningState, syncRemoteLibrary]);

  const handleSelectEntrypoint = async (entrypoint: string) => {
    if (setupPrompt && window.lazplayAPI) {
      await window.lazplayAPI.setGameEntrypoint(setupPrompt.gameId, entrypoint);
      setSetupPrompt(null);
      loadInstalledGames(); // Refresh
    }
  };

  if (!authChecked) {
    return (
      <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center font-sans select-none">
        <div className="flex flex-col items-center opacity-75 scale-110">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <span className="text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">
            LOADING LAZPLAY OS...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-900 text-slate-100">
      
      {/* Main Content - Full width and padded for floating bottom nav */}
      <div className="w-full h-full relative overflow-hidden bg-slate-900 pb-24">
        {activePage === "library" ? (
          <Library />
        ) : activePage === "developer" ? (
          <DeveloperConsole />
        ) : activePage === "settings" ? (
          <Settings />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center opacity-30">
              <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <span className="text-slate-400 font-medium animate-pulse">
                Loading Storefront...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Navigation Bar */}
      <Sidebar />

      {/* Entrypoint Selection Modal */}
      {setupPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">Setup Required</h3>
              <p className="text-slate-400 text-sm mb-6">
                We couldn't automatically identify the executable for{" "}
                <span className="text-white font-medium">{setupPrompt.title}</span>.
                Please select the correct file to launch the game:
              </p>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {setupPrompt.options.length > 0 ? (
                  setupPrompt.options.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleSelectEntrypoint(option)}
                      className="w-full text-left p-3 rounded-lg bg-slate-800 hover:bg-brand-600/20 hover:border-brand-500 border border-transparent transition-all group flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-xs font-mono text-slate-400 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                        EXE
                      </div>
                      <span className="truncate font-medium">{option}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    No executable files detected in the game folder. You may need to select the file manually from the installation folder.
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setSetupPrompt(null)}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => window.lazplayAPI.openInstallFolder(setupPrompt.gameId)}
                className="px-4 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Browse Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

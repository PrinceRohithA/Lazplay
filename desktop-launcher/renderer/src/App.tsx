import { useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Library from "./pages/Library";
import { useLauncherStore } from "./store/useLauncherStore";

function App() {
  const {
    activePage,
    loadInstalledGames,
    syncRemoteLibrary,
    updateDownloadProgress,
    setRunningState,
  } = useLauncherStore();

  useEffect(() => {
    // Initial Load
    loadInstalledGames();
    syncRemoteLibrary();

    if (window.lazplayAPI) {
      window.lazplayAPI.onDownloadProgress((data: any) => {
        updateDownloadProgress(data);
      });

      window.lazplayAPI.onGameStateChange((data: any) => {
        setRunningState(data.gameId, data.state === "running");
      });

      window.lazplayAPI.onDeepLink((url: string) => {
        console.log("Deep link received:", url);
        // Handle deep link logic
      });
    }
  }, [loadInstalledGames, updateDownloadProgress, setRunningState]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900">
      {/* Sidebar for Native Launcher UI */}
      <div className="w-[250px] h-full flex-shrink-0 bg-slate-950 border-r border-slate-800/50 shadow-2xl relative z-10">
        <Sidebar />
      </div>

      {/* The remaining area is either the Native Library UI or covered by the Electron WebContentsView (Store) */}
      <div className="flex-1 h-full relative overflow-hidden bg-slate-900">
        {activePage === "library" ? (
          <Library />
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
    </div>
  );
}

export default App;

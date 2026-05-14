import { useEffect } from "react";
import Sidebar from "./components/Sidebar.ts";
import { useLauncherStore } from "./store/useLauncherStore";

function App() {
  const { loadInstalledGames, updateDownloadProgress, setRunningState } =
    useLauncherStore();

  useEffect(() => {
    // Initial Load
    loadInstalledGames();

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

      {/* The remaining area is physically covered by the Electron WebContentsView */}
      {/* We can provide a placeholder or loading state here */}
      <div className="flex-1 h-full flex items-center justify-center bg-slate-900 relative">
        <div className="flex flex-col items-center opacity-30">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <span className="text-slate-400 font-medium animate-pulse">
            Loading Storefront...
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;

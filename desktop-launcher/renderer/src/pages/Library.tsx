import { useLauncherStore } from "../store/useLauncherStore";
import { Play, Download, Search, LayoutGrid, List, Info, Clock, HardDrive, Gamepad2, RefreshCw, LogIn, Trash2, FolderOpen } from "lucide-react";
import { useState } from "react";

export default function Library() {
  const { games, claimGame, syncRemoteLibrary, selectedGameId, setSelectedGame } = useLauncherStore();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [libraryFilter, setLibraryFilter] = useState<"all" | "installed">("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const WEB_ONLY = new Set(["WEB", "BROWSER", "HTML5"]);
  
  const gameList = Object.values(games).filter(g => {
    if (!g.isOwned) return false;
    const { platforms } = g;
    if (!platforms || platforms.length === 0) return true;
    return platforms.some(p => !WEB_ONLY.has(p.toUpperCase()));
  });

  const filteredGames = gameList.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = libraryFilter === "all" || game.status === "installed";
    return matchesSearch && matchesFilter;
  });

  // Select a hero game: either the explicitly selected one, or the first in the list
  const heroGame = (selectedGameId && games[selectedGameId]) || filteredGames[0];

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      await syncRemoteLibrary();
    } catch (e: any) {
      setSyncError(e.message || "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAction = async (game: any) => {
    if (!window.lazplayAPI) return;
    
    if (!game.isOwned) {
      await claimGame(game.id);
      return;
    }

    if (game.status === "installed") {
      window.lazplayAPI.launchGame(game.id);
    } else if (game.status === "uninstalled" || !game.status) {
      window.lazplayAPI.installGame(game.id, {
        title: game.title,
        downloadUrl: game.downloadUrl,
        entrypoint: game.entrypoint
      });
    }
  };

  const isEmpty = gameList.length === 0;

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden">
      {/* Hero Banner Section */}
      {!isEmpty && heroGame && (
        <div className="relative w-full h-[350px] shrink-0 overflow-hidden group/hero">
          {/* Background Banner */}
          <div className="absolute inset-0">
            {heroGame.bannerUrl ? (
              <img 
                src={heroGame.bannerUrl} 
                alt={heroGame.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover/hero:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
                <Gamepad2 size={80} className="text-slate-700/50" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-transparent to-transparent"></div>
          </div>

          {/* Hero Content */}
          <div className="absolute bottom-0 left-0 p-12 w-full flex items-end justify-between">
            <div className="flex gap-8 items-end max-w-2xl">
              {/* Game Cover in Hero */}
              <div className="w-40 aspect-[3/4] bg-slate-800 rounded-lg shadow-2xl overflow-hidden border border-slate-700 hidden md:block shrink-0">
                {heroGame.coverUrl ? (
                   <img src={heroGame.coverUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Gamepad2 size={32} className="text-slate-600" /></div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <h2 className="text-5xl font-black tracking-tighter uppercase drop-shadow-lg">{heroGame.title}</h2>
                <div className="flex items-center gap-6 text-sm text-slate-300 font-medium bg-slate-900/40 backdrop-blur-md px-4 py-2 rounded-full w-fit">
                  <span className="flex items-center gap-2">
                    <Clock size={16} className="text-brand-500" />
                    {heroGame.playtime ? Math.round(heroGame.playtime / 3600) + " HOURS PLAYED" : "NEVER PLAYED"}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                  <span className="flex items-center gap-2">
                    <HardDrive size={16} className="text-brand-500" />
                    {heroGame.size ? (heroGame.size / (1024**3)).toFixed(1) + " GB" : "READY TO DOWNLOAD"}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 mt-2">
                  <button 
                    onClick={() => handleAction(heroGame)}
                    className={`px-12 py-4 rounded-xl font-black text-lg flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${
                      heroGame.isRunning
                        ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20"
                        : heroGame.status === "installed"
                          ? "bg-brand-500 hover:bg-brand-400 text-white shadow-brand-500/20"
                          : "bg-white hover:bg-slate-200 text-slate-950 shadow-white/10"
                    }`}
                  >
                    {heroGame.isRunning ? (
                      <><RefreshCw size={24} className="animate-spin" /> RUNNING</>
                    ) : heroGame.status === "installed" ? (
                      <><Play size={24} fill="currentColor" /> START GAME</>
                    ) : (
                      <><Download size={24} /> INSTALL NOW</>
                    )}
                  </button>
                  
                  {heroGame.status === "installed" && !heroGame.isRunning && (
                    <>
                      <button 
                        onClick={() => window.lazplayAPI.openInstallFolder(heroGame.id)}
                        className="p-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white transition-colors border border-slate-700 backdrop-blur-md"
                        title="Open Folder"
                      >
                        <FolderOpen size={24} />
                      </button>
                      <button 
                        onClick={() => window.lazplayAPI.uninstallGame(heroGame.id)}
                        className="p-4 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-colors border border-red-500/20 backdrop-blur-md"
                        title="Uninstall"
                      >
                        <Trash2 size={24} />
                      </button>
                    </>
                  )}
                  
                  <button className="p-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white transition-colors border border-slate-700 backdrop-blur-md">
                    <Info size={24} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Library Controls */}
      <div className="px-8 py-4 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold tracking-tight text-slate-400">Library Database</h1>
            <div className="flex gap-6 text-sm font-bold">
              <button 
                onClick={() => setLibraryFilter("all")}
                className={`pb-1 border-b-2 transition-colors ${libraryFilter === "all" ? "border-brand-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}
              >
                ALL_GAMES ({gameList.length})
              </button>
              <button 
                onClick={() => setLibraryFilter("installed")}
                className={`pb-1 border-b-2 transition-colors ${libraryFilter === "installed" ? "border-brand-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}
              >
                INSTALLED
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text" 
                placeholder="SEARCH_MANIFEST..."
                className="bg-slate-800/50 border border-slate-700/50 rounded-lg py-2 pl-10 pr-4 w-64 text-xs focus:ring-1 focus:ring-brand-500 transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-50 border border-slate-700/50"
            >
              <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
            </button>
            <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
              <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded ${viewMode === "grid" ? "bg-slate-700 text-white" : "text-slate-500"}`}><LayoutGrid size={16} /></button>
              <button onClick={() => setViewMode("list")} className={`p-1.5 rounded ${viewMode === "list" ? "bg-slate-700 text-white" : "text-slate-500"}`}><List size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar">
        {syncError && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-3">
            <Info size={16} />
            {syncError}. Please ensure the storefront session is active.
          </div>
        )}

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-6">
            <div className="p-8 rounded-full bg-slate-800/30 border border-slate-700/30">
              <LogIn size={64} className="opacity-20" />
            </div>
            <div className="text-center max-w-sm">
              <h3 className="text-xl font-bold text-slate-200 mb-2">No data detected</h3>
              <p className="text-sm leading-relaxed">Initialize a session via the Store tab and synchronize your encrypted library records.</p>
            </div>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-8 py-3 bg-brand-500 hover:bg-brand-400 text-white rounded-xl text-sm font-black transition-all flex items-center gap-3 shadow-lg shadow-brand-500/20"
            >
              <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
              {isSyncing ? "INITIALIZING_SYNC..." : "INITIATE_LIBRARY_SYNC"}
            </button>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Gamepad2 size={48} className="mb-4 opacity-10" />
            <p className="text-sm font-medium">No records found matching search parameters.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-12">
            {filteredGames.map(game => (
              <GameCard 
                key={game.id} 
                game={game} 
                isSelected={heroGame?.id === game.id}
                onSelect={() => setSelectedGame(game.id)}
                onAction={() => handleAction(game)} 
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2 pb-12">
            {filteredGames.map(game => (
              <GameListRow 
                key={game.id} 
                game={game} 
                isSelected={heroGame?.id === game.id}
                onSelect={() => setSelectedGame(game.id)}
                onAction={() => handleAction(game)} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GameCard({ game, isSelected, onSelect, onAction }: { game: any, isSelected: boolean, onSelect: () => void, onAction: () => void }) {
  return (
    <div 
      onClick={onSelect}
      className={`group relative flex flex-col bg-slate-800/30 rounded-xl overflow-hidden border transition-all cursor-pointer ${
        isSelected ? "border-brand-500 ring-1 ring-brand-500" : "border-slate-700/50 hover:border-slate-500"
      }`}
    >
      <div className="aspect-[3/4] bg-slate-800 relative overflow-hidden">
        {game.coverUrl ? (
          <img src={game.coverUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Gamepad2 size={40} className="text-slate-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-60"></div>
        
        {/* Status Badge */}
        {game.isRunning && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-emerald-500 text-[8px] font-black rounded uppercase tracking-tighter shadow-lg animate-pulse">
            Running
          </div>
        )}

        {/* Play Overlay */}
        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4 text-center backdrop-blur-sm">
          <button 
            onClick={(e) => { e.stopPropagation(); onAction(); }}
            className={`w-full py-2.5 rounded-lg font-black text-xs flex items-center justify-center gap-2 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform ${
              !game.isOwned 
                ? "bg-amber-500 text-white" 
                : game.isRunning
                  ? "bg-emerald-500 text-white"
                  : "bg-brand-500 text-white"
            }`}
          >
            {!game.isOwned ? <Gamepad2 size={16} /> : game.status === "installed" ? <Play size={16} fill="currentColor" /> : <Download size={16} />}
            {!game.isOwned ? "Claim" : game.isRunning ? "Running" : game.status === "installed" ? "Launch" : "Install"}
          </button>

          {game.status === "installed" && !game.isRunning && (
            <div className="flex w-full gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform delay-[50ms]">
               <button 
                 onClick={(e) => { e.stopPropagation(); window.lazplayAPI.openInstallFolder(game.id); }}
                 className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1"
               >
                 <FolderOpen size={12} /> FOLDER
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); window.lazplayAPI.uninstallGame(game.id); }}
                 className="flex-1 py-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
               >
                 <Trash2 size={12} /> DELETE
               </button>
            </div>
          )}
        </div>
      </div>
      <div className="p-3">
        <h3 className={`font-bold text-xs truncate mb-1 ${isSelected ? "text-brand-400" : "text-slate-200"}`}>{game.title}</h3>
        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
          <span className="flex items-center gap-1"><Clock size={10} />{game.playtime ? Math.round(game.playtime / 3600) + "h" : "0h"}</span>
          <span className="flex items-center gap-1"><HardDrive size={10} />{game.size ? (game.size / (1024**3)).toFixed(1) + " GB" : "--"}</span>
        </div>
      </div>
    </div>
  );
}

function GameListRow({ game, isSelected, onSelect, onAction }: { game: any, isSelected: boolean, onSelect: () => void, onAction: () => void }) {
  return (
    <div 
      onClick={onSelect}
      className={`flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer group ${
        isSelected ? "bg-brand-500/10 border-brand-500/50" : "bg-slate-800/20 border-transparent hover:bg-slate-800/40"
      }`}
    >
      <div className="w-10 h-14 bg-slate-800 rounded-lg overflow-hidden shrink-0 border border-slate-700">
        {game.coverUrl ? <img src={game.coverUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center"><Gamepad2 size={16} className="text-slate-600" /></div>}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`font-bold text-sm truncate ${isSelected ? "text-brand-400" : "text-slate-100"}`}>{game.title}</h3>
        <div className="flex items-center gap-4 mt-1">
           <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Status: <span className={game.isRunning ? "text-emerald-400" : "text-slate-400"}>{game.isRunning ? "Running" : game.status || "Ready"}</span></p>
           <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Last played: {game.lastPlayed ? new Date(game.lastPlayed).toLocaleDateString() : "Never"}</p>
        </div>
      </div>
      <div className="hidden lg:flex items-center gap-6 px-4">
        <div className="text-[10px] text-slate-500 w-24">
          <div className="flex items-center gap-1.5 mb-1"><Clock size={12} /><span>Playtime</span></div>
          <span className="text-slate-300 font-medium">{game.playtime ? Math.round(game.playtime / 3600) + " hours" : "0 hours"}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {game.status === "installed" && !game.isRunning && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); window.lazplayAPI.openInstallFolder(game.id); }}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
              title="Open Folder"
            >
              <FolderOpen size={16} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); window.lazplayAPI.uninstallGame(game.id); }}
              className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
        <button 
          onClick={(e) => { e.stopPropagation(); onAction(); }}
          className={`px-6 py-2 rounded-lg text-[10px] font-black transition-all uppercase tracking-widest ${
            game.isRunning 
              ? "bg-emerald-600 text-white"
              : !game.isOwned 
                ? "bg-amber-600 text-white" 
                : "bg-slate-700 group-hover:bg-brand-500 text-white"
          }`}
        >
          {game.isRunning ? "Running" : !game.isOwned ? "Claim" : game.status === "installed" ? "Launch" : "Install"}
        </button>
      </div>
    </div>
  );
}

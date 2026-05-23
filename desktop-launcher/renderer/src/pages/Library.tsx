import { useLauncherStore } from "../store/useLauncherStore";
import { Play, Pause, Download, Search, LayoutGrid, List, Clock, HardDrive, Gamepad2, RefreshCw, LogIn, Trash2, FolderOpen, Monitor, Smartphone, Globe, Terminal, Terminal as TerminalIcon, AlertTriangle } from "lucide-react";
import { useState } from "react";

export default function Library() {
  const { games, claimGame, syncRemoteLibrary, selectedGameId, setSelectedGame, uninstallGame } = useLauncherStore();
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
    } else if (game.status === "downloading") {
      window.lazplayAPI.pauseDownload(game.id);
    } else if (game.status === "paused") {
      window.lazplayAPI.resumeDownload(game.id);
    } else if (game.status === "uninstalled" || !game.status) {
      window.lazplayAPI.installGame(game.id, {
        title: game.title,
        downloadUrl: game.downloadUrl,
        entrypoint: game.entrypoint,
        coverUrl: game.coverUrl,
        bannerUrl: game.bannerUrl,
        usesChunkDistribution: game.usesChunkDistribution,
      });
    }
  };

  const isEmpty = gameList.length === 0;

  return (
    <div className="flex flex-col h-full bg-background text-on-surface overflow-hidden">
      {/* Hero Banner Section */}
      {!isEmpty && heroGame && (
        <div className="relative w-full h-[240px] shrink-0 overflow-hidden group/hero border-b-2 border-outline-variant">
          {/* Background Banner */}
          <div className="absolute inset-0">
            {heroGame.bannerUrl ? (
              <img 
                src={heroGame.bannerUrl} 
                alt={heroGame.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover/hero:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-surface-container flex items-center justify-center">
                <Gamepad2 size={80} className="text-on-surface-variant opacity-50" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-[var(--surface)]/60 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--surface)] via-[var(--surface)]/40 to-transparent"></div>
          </div>
 
          {/* Hero Content */}
          <div className="absolute bottom-0 left-0 p-8 w-full flex items-center justify-between">
            <div className="flex gap-6 items-center max-w-3xl">
              {/* Game Cover in Hero */}
              <div className="w-24 aspect-[3/4] bg-surface-container/40 border border-outline-variant rounded-xl hidden md:block shrink-0 relative overflow-hidden shadow-lg">
                {heroGame.coverUrl ? (
                   <img src={heroGame.coverUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface-container"><Gamepad2 size={24} className="text-on-surface-variant" /></div>
                )}
              </div>
 
              <div className="flex flex-col gap-2">
                <h2 className="font-headline-xl text-3xl text-on-surface uppercase font-bold">{heroGame.title}</h2>
                <div className="flex items-center gap-4 text-xs font-sans text-on-surface-variant bg-surface-variant/20 border border-outline-variant px-3.5 py-1.5 rounded-lg w-fit">
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} className="text-primary" />
                    {heroGame.playtime ? Math.round(heroGame.playtime / 3600) + " Hours" : "Never Played"}
                  </span>
                  <span className="w-1 h-1 bg-primary/20 rounded-full"></span>
                  <span className="flex items-center gap-1.5">
                    <HardDrive size={13} className="text-primary" />
                    {heroGame.size ? (heroGame.size / (1024**3)).toFixed(1) + " GB" : "Ready to Download"}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 mt-2">
                  <button 
                    onClick={() => handleAction(heroGame)}
                    className={`btn ${
                      heroGame.isRunning
                        ? "btn-secondary"
                        : heroGame.status === "installed"
                          ? "btn-primary"
                          : (heroGame.status === "paused" || heroGame.status === "downloading")
                            ? "bg-amber-500 text-slate-950 hover:bg-amber-500/80"
                            : "btn-outline"
                    }`}
                  >
                    {heroGame.isRunning ? (
                      <><RefreshCw size={14} className="animate-spin" /> Running</>
                    ) : heroGame.status === "downloading" ? (
                      <><Pause size={14} /> Pause ({Math.round(heroGame.progress || 0)}%)</>
                    ) : heroGame.status === "paused" ? (
                      <><Play size={14} /> Resume ({Math.round(heroGame.progress || 0)}%)</>
                    ) : heroGame.status === "installed" ? (
                      <><Play size={14} fill="currentColor" /> Play Now</>
                    ) : (
                      <><Download size={14} /> Install Game</>
                    )}
                  </button>
                  
                  {heroGame.status === "installed" && !heroGame.isRunning && (
                    <>
                      <button 
                        onClick={() => window.lazplayAPI.openInstallFolder(heroGame.id)}
                        className="p-2 bg-surface-container/45 border border-outline-variant rounded-lg hover:border-primary/40 text-on-surface-variant hover:text-primary transition-all"
                        title="Open Directory"
                      >
                        <FolderOpen size={16} />
                      </button>
                      <button 
                        onClick={() => uninstallGame(heroGame.id)}
                        className="p-2 bg-error-container/10 border border-error/20 rounded-lg hover:bg-error-container/20 hover:border-error text-error transition-all"
                        title="Uninstall"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Library Controls */}
      <div className="px-6 py-3 border-b border-outline-variant bg-surface/40 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="font-label-mono text-xs font-bold text-primary flex items-center gap-2 uppercase tracking-wide">
              <TerminalIcon size={14} /> My Library
            </h1>
            <div className="flex gap-5 font-sans text-xs font-medium">
              <button 
                onClick={() => setLibraryFilter("all")}
                className={`pb-1 border-b-2 transition-colors ${libraryFilter === "all" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`}
              >
                All Games ({gameList.length})
              </button>
              <button 
                onClick={() => setLibraryFilter("installed")}
                className={`pb-1 border-b-2 transition-colors ${libraryFilter === "installed" ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`}
              >
                Installed
              </button>
            </div>
          </div>
  
          <div className="flex items-center gap-3">
            <div className="input-wrapper group pl-3">
              <Search size={13} className="text-on-surface-variant group-focus-within:text-primary transition-colors shrink-0" />
              <input 
                type="text" 
                placeholder="Search library..."
                className="launcher-input pl-2 pr-4 w-44 !py-1.5"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="p-2 bg-surface-container-lowest border border-outline-variant rounded-lg hover:border-primary/40 text-on-surface-variant hover:text-primary transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
            </button>
            <div className="flex bg-surface-container-lowest border border-outline-variant rounded-lg p-0.5">
              <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md ${viewMode === "grid" ? "bg-surface-container text-primary" : "text-on-surface-variant hover:text-on-surface"}`}><LayoutGrid size={14} /></button>
              <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md ${viewMode === "list" ? "bg-surface-container text-primary" : "text-on-surface-variant hover:text-on-surface"}`}><List size={14} /></button>
            </div>
          </div>
        </div>
      </div>
 
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 pt-6 custom-scrollbar relative">
        {syncError && (
          <div className="mb-4 p-3 bg-red-950/10 border border-red-500/20 rounded-lg text-red-400 font-label-mono text-[10px] uppercase flex items-center gap-3">
            <AlertTriangle size={14} />
            Error: {syncError}. Verify network connection.
          </div>
        )}
 
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-on-surface-variant gap-6 relative z-10">
            <div className="p-6 bg-zinc-900/30 pixel-border rounded-2xl">
              <LogIn size={40} className="text-primary opacity-50" />
            </div>
            <div className="text-center max-w-sm">
              <h3 className="font-headline-md text-xl text-on-surface mb-2 uppercase">Empty Library</h3>
              <p className="font-sans text-xs text-slate-400">Initialize a session via the Storefront tab and synchronize your library records.</p>
            </div>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="btn btn-primary px-6 py-3"
            >
              <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
              {isSyncing ? "Syncing..." : "Sync Library"}
            </button>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant font-label-mono uppercase text-[10px]">
            <Search size={32} className="mb-3 opacity-20 text-primary" />
            <p>0 records matched search parameters.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-12 relative z-10">
            {filteredGames.map(game => (
              <GameCard 
                key={game.id} 
                game={game} 
                isSelected={heroGame?.id === game.id}
                onSelect={() => setSelectedGame(game.id)}
                onAction={() => handleAction(game)} 
                onUninstall={() => uninstallGame(game.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3 pb-12 relative z-10">
            {filteredGames.map(game => (
              <GameListRow 
                key={game.id} 
                game={game} 
                isSelected={heroGame?.id === game.id}
                onSelect={() => setSelectedGame(game.id)}
                onAction={() => handleAction(game)} 
                onUninstall={() => uninstallGame(game.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GameCard({ game, isSelected, onSelect, onAction, onUninstall }: { game: any, isSelected: boolean, onSelect: () => void, onAction: () => void, onUninstall: () => void }) {
  return (
    <div 
      onClick={onSelect}
      className={`group relative flex flex-col bg-zinc-900/30 pixel-border overflow-hidden transition-all duration-300 cursor-pointer rounded-2xl hover:scale-[1.02] shadow-md ${
        isSelected ? "border-brand-500 shadow-none" : "border-brand-500/10 hover:border-brand-500/35"
      }`}
    >
      <div className="aspect-[3/4] bg-black relative overflow-hidden">
        {game.coverUrl ? (
          <img src={game.coverUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Gamepad2 size={40} className="text-slate-600 opacity-50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-80"></div>
        
        {/* Status Badge */}
        {game.isRunning && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded bg-secondary text-slate-950 text-[8px] font-sans font-bold uppercase tracking-wide shadow-lg animate-pulse">
            Running
          </div>
        )}

        {/* Play Overlay */}
        <div className="absolute inset-0 bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3 p-4 text-center backdrop-blur-md">
          <button 
            onClick={(e) => { e.stopPropagation(); onAction(); }}
            className={`w-full btn transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 ${
              !game.isOwned 
                ? "btn-secondary" 
                : (game.isRunning || game.status === "downloading")
                  ? "btn-secondary"
                  : game.status === "paused"
                    ? "bg-amber-500 text-slate-950 hover:bg-amber-500/80"
                    : "btn-primary"
            }`}
          >
            {!game.isOwned ? (
              <Gamepad2 size={14} />
            ) : game.isRunning ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : game.status === "downloading" ? (
              <Pause size={14} />
            ) : game.status === "paused" ? (
              <Play size={14} />
            ) : game.status === "installed" ? (
              <Play size={14} fill="currentColor" />
            ) : (
              <Download size={14} />
            )}
            {!game.isOwned
              ? "Claim Access"
              : game.isRunning
                ? "Active"
                : game.status === "downloading"
                  ? `Pause (${Math.round(game.progress || 0)}%)`
                  : game.status === "paused"
                    ? `Resume (${Math.round(game.progress || 0)}%)`
                    : game.status === "installed"
                      ? "Play Now"
                      : "Install Game"}
          </button>

          {game.status === "installed" && !game.isRunning && (
            <div className="flex w-full gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-[50ms]">
               <button 
                 onClick={(e) => { e.stopPropagation(); window.lazplayAPI.openInstallFolder(game.id); }}
                 className="flex-1 py-2 bg-zinc-900/60 hover:bg-zinc-900 border border-brand-500/10 hover:border-brand-500/30 text-slate-300 rounded-lg font-sans text-[10px] font-medium flex items-center justify-center gap-1 transition-colors"
                 title="Open Directory"
               >
                 <FolderOpen size={12} /> Folder
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); onUninstall(); }}
                 className="flex-1 py-2 bg-error-container/10 hover:bg-error-container/20 border border-error/20 hover:border-error text-error rounded-lg font-sans text-[10px] font-medium flex items-center justify-center gap-1 transition-colors"
                 title="Uninstall"
               >
                 <Trash2 size={12} /> Uninstall
               </button>
            </div>
          )}
        </div>
      </div>
      <div className="p-3.5 bg-zinc-900/10 border-t border-zinc-800/40">
        <h3 className={`font-sans font-bold text-xs truncate mb-2 uppercase tracking-wide transition-colors ${isSelected ? "text-brand-500" : "text-slate-200 group-hover:text-brand-500"}`}>{game.title}</h3>
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Clock size={10} />{game.playtime ? Math.round(game.playtime / 3600) + "H" : "0H"}</span>
            <span className="flex items-center gap-1"><HardDrive size={10} />{game.size ? (game.size / (1024**3)).toFixed(1) + " GB" : "--"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-primary opacity-80">
            {(game.platforms || ["WINDOWS"]).map((p: string) => {
              const name = p.toUpperCase();
              if (name === "WEB" || name === "BROWSER") return <span key={p} title={name} className="hover:text-secondary transition-colors"><Globe size={11} /></span>;
              if (name === "LINUX") return <span key={p} title={name} className="hover:text-secondary transition-colors"><Terminal size={11} /></span>;
              if (name === "ANDROID") return <span key={p} title={name} className="hover:text-secondary transition-colors"><Smartphone size={11} /></span>;
              return <span key={p} title={name} className="hover:text-secondary transition-colors"><Monitor size={11} /></span>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function GameListRow({ game, isSelected, onSelect, onAction, onUninstall }: { game: any, isSelected: boolean, onSelect: () => void, onAction: () => void, onUninstall: () => void }) {
  return (
    <div 
      onClick={onSelect}
      className={`flex items-center gap-4 p-3.5 pixel-border border transition-all cursor-pointer rounded-xl group ${
        isSelected ? "bg-zinc-900/50 border-brand-500 shadow-[0_0_15px_rgba(var(--primary-rgb),0.06)]" : "bg-zinc-900/25 border-brand-500/10 hover:border-brand-500/30"
      }`}
    >
      <div className="w-12 h-16 bg-black overflow-hidden shrink-0 border border-brand-500/10 rounded-lg relative">
        {game.coverUrl ? <img src={game.coverUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center bg-surface-container"><Gamepad2 size={16} className="text-slate-500 opacity-50" /></div>}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`font-sans font-bold text-sm truncate uppercase tracking-wide transition-colors ${isSelected ? "text-brand-500" : "text-slate-200 group-hover:text-brand-500"}`}>{game.title}</h3>
        <div className="flex items-center gap-4 mt-1.5 font-sans text-[10px] text-slate-400">
           <p>Status: <span className={game.isRunning ? "text-secondary font-semibold" : "text-brand-500"}>{game.isRunning ? "Running" : game.status || "Standby"}</span></p>
           <span className="w-1 h-1 bg-brand-500/20 rounded-full"></span>
           <p>Last Played: {game.lastPlayed ? new Date(game.lastPlayed).toLocaleDateString() : "Never"}</p>
        </div>
      </div>
      <div className="hidden lg:flex items-center gap-8 px-6 border-l border-brand-500/10 font-sans">
        <div className="text-[10px] text-slate-400 w-24">
          <div className="flex items-center gap-1.5 mb-1"><Clock size={12} className="text-brand-500" /><span>Play Time</span></div>
          <span className="text-slate-200 font-bold">{game.playtime ? Math.round(game.playtime / 3600) + " Hours" : "0 Hours"}</span>
        </div>
        <div className="text-[10px] text-slate-400 w-24">
          <div className="flex items-center gap-1.5 mb-1"><Monitor size={12} className="text-brand-500" /><span>Platforms</span></div>
          <div className="flex items-center gap-1.5 text-slate-200">
            {(game.platforms || ["WINDOWS"]).map((p: string) => {
              const name = p.toUpperCase();
              if (name === "WEB" || name === "BROWSER") return <span key={p} title={name}><Globe size={12} /></span>;
              if (name === "LINUX") return <span key={p} title={name}><Terminal size={12} /></span>;
              if (name === "ANDROID") return <span key={p} title={name}><Smartphone size={12} /></span>;
              return <span key={p} title={name}><Monitor size={12} /></span>;
            })}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 pl-4">
        {game.status === "installed" && !game.isRunning && (
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); window.lazplayAPI.openInstallFolder(game.id); }}
              className="p-2 bg-zinc-900/50 hover:bg-zinc-900 border border-brand-500/10 hover:border-brand-500/40 text-slate-400 hover:text-brand-500 rounded-lg transition-colors"
              title="Open Directory"
            >
              <FolderOpen size={16} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onUninstall(); }}
              className="p-2 bg-error-container/10 hover:bg-error-container/20 border border-error/20 hover:border-error text-error rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
        <button 
          onClick={(e) => { e.stopPropagation(); onAction(); }}
          className={`btn ${
            game.isRunning 
              ? "btn-secondary"
              : !game.isOwned 
                ? "btn-secondary" 
                : game.status === "paused"
                  ? "bg-amber-500 text-slate-950 hover:bg-amber-500/80"
                  : "btn-primary"
          }`}
        >
          {game.isRunning
            ? "Running"
            : !game.isOwned
              ? "Claim"
              : game.status === "downloading"
                ? `Pause (${Math.round(game.progress || 0)}%)`
                : game.status === "paused"
                  ? `Resume (${Math.round(game.progress || 0)}%)`
                  : game.status === "installed"
                    ? "Play"
                    : "Install"}
        </button>
      </div>
    </div>
  );
}

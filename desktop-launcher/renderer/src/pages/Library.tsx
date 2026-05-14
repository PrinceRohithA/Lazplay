import { useLauncherStore } from "../store/useLauncherStore";
import { Play, Download, Search, LayoutGrid, List, Info, Clock, HardDrive, Gamepad2 } from "lucide-react";
import { useState } from "react";

export default function Library() {
  const { games, claimGame } = useLauncherStore();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [libraryFilter, setLibraryFilter] = useState<"all" | "installed">("all");

  const gameList = Object.values(games);
  const filteredGames = gameList.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = libraryFilter === "all" || game.status === "installed";
    return matchesSearch && matchesFilter;
  });

  const handleAction = async (game: any) => {
    if (!window.lazplayAPI) return;
    
    if (!game.isOwned) {
      await claimGame(game.id);
      return;
    }

    if (game.status === "installed") {
      window.lazplayAPI.launchGame(game.id);
    } else if (game.status === "uninstalled" || !game.status) {
      window.lazplayAPI.installGame(game.id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden">
      {/* Library Header */}
      <div className="p-8 pb-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-tight">My Library</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Search games..."
                className="bg-slate-800 border-none rounded-full py-2 pl-10 pr-4 w-64 text-sm focus:ring-2 focus:ring-brand-500 transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex bg-slate-800 rounded-lg p-1">
              <button 
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded ${viewMode === "grid" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded ${viewMode === "list" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Filters/Tabs */}
        <div className="flex gap-8 border-b border-slate-800 text-sm font-medium text-slate-400">
          <button 
            onClick={() => setLibraryFilter("all")}
            className={`pb-3 border-b-2 transition-colors ${libraryFilter === "all" ? "border-brand-500 text-white" : "border-transparent hover:text-slate-200"}`}
          >
            All Games
          </button>
          <button 
            onClick={() => setLibraryFilter("installed")}
            className={`pb-3 border-b-2 transition-colors ${libraryFilter === "installed" ? "border-brand-500 text-white" : "border-transparent hover:text-slate-200"}`}
          >
            Installed
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar">
        {filteredGames.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Gamepad2 size={48} className="mb-4 opacity-20" />
            <p>No games found in your library.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredGames.map(game => (
              <GameCard key={game.id} game={game} onAction={() => handleAction(game)} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredGames.map(game => (
              <GameListRow key={game.id} game={game} onAction={() => handleAction(game)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GameCard({ game, onAction }: { game: any, onAction: () => void }) {
  return (
    <div className="group relative flex flex-col bg-slate-800/40 rounded-xl overflow-hidden border border-slate-700/50 hover:border-brand-500/50 transition-all hover:shadow-2xl hover:shadow-brand-500/10">
      <div className="aspect-[3/4] bg-slate-800 relative overflow-hidden">
        {/* Mock Image / Placeholder */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-60"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Gamepad2 size={40} className="text-slate-700 group-hover:scale-110 transition-transform duration-500" />
        </div>
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4 p-4 text-center backdrop-blur-sm">
          <button 
            onClick={onAction}
            className={`w-full py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform ${
              !game.isOwned 
                ? "bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/20" 
                : "bg-brand-500 hover:bg-brand-400 text-white shadow-brand-500/20"
            }`}
          >
            {!game.isOwned ? <Gamepad2 size={18} /> : game.status === "installed" ? <Play size={18} fill="currentColor" /> : <Download size={18} />}
            {!game.isOwned ? "Claim Game" : game.status === "installed" ? "Launch" : "Install"}
          </button>
          <button className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
            <Info size={14} />
            Game Details
          </button>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-sm truncate mb-1">{game.title}</h3>
        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {game.playtime ? Math.round(game.playtime / 3600) + "h" : "0h"}
          </span>
          <span className="flex items-center gap-1">
            <HardDrive size={10} />
            {game.size ? (game.size / (1024**3)).toFixed(1) + " GB" : "0 GB"}
          </span>
        </div>
      </div>
    </div>
  );
}

function GameListRow({ game, onAction }: { game: any, onAction: () => void }) {
  return (
    <div className="flex items-center gap-4 p-3 bg-slate-800/20 hover:bg-slate-800/50 rounded-xl border border-transparent hover:border-slate-700 transition-all group">
      <div className="w-12 h-16 bg-slate-800 rounded-lg flex items-center justify-center">
        <Gamepad2 size={20} className="text-slate-600" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-sm truncate">{game.title}</h3>
        <p className="text-[10px] text-slate-500">Last played: {game.lastPlayed ? new Date(game.lastPlayed).toLocaleDateString() : "Never"}</p>
      </div>
      <div className="flex items-center gap-6 px-4">
        <div className="text-[10px] text-slate-500 w-24">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={12} />
            <span>Playtime</span>
          </div>
          <span className="text-slate-300 font-medium">{game.playtime ? Math.round(game.playtime / 3600) + " hours" : "0 hours"}</span>
        </div>
        <div className="text-[10px] text-slate-500 w-24">
          <div className="flex items-center gap-1.5 mb-1">
            <HardDrive size={12} />
            <span>Install Size</span>
          </div>
          <span className="text-slate-300 font-medium">{game.size ? (game.size / (1024**3)).toFixed(1) + " GB" : "0 GB"}</span>
        </div>
      </div>
      <button 
        onClick={onAction}
        className={`px-6 py-2 rounded-lg text-xs font-bold transition-all opacity-0 group-hover:opacity-100 ${
          !game.isOwned 
            ? "bg-amber-600 hover:bg-amber-500 text-white" 
            : "bg-slate-700 hover:bg-brand-500 text-white"
        }`}
      >
        {!game.isOwned ? "Claim" : game.status === "installed" ? "Launch" : "Install"}
      </button>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { library as libraryApi } from '../api';

export default function GameLibraryCyberEdition() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    libraryApi.list({ limit: 50 })
      .then(res => { setItems(res.data || []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const filtered = items.filter(i => !search || (i.title || '').toLowerCase().includes(search.toLowerCase()));

  const toggleFavorite = async (gameId, isFav) => {
    try {
      if (isFav) await libraryApi.removeFavorite(gameId);
      else await libraryApi.addFavorite(gameId);
      setItems(prev => prev.map(i => i.gameId === gameId ? { ...i, favorite: !isFav } : i));
    } catch (e) { console.error(e); }
  };

  const handlePlayNow = (item) => {
    const platforms = (item.platforms || []).map(p => p.toUpperCase());
    
    // If it's a web game, go to the game page with auto-play enabled
    if (platforms.includes('WEB') || platforms.includes('BROWSER')) {
      navigate(`/game?id=${item.gameId}&autoPlay=true`);
    } else {
      // If it's a native game (Windows/Linux/PC), go to the launcher download page
      navigate('/download-launcher');
    }
  };

  const PLACEHOLDER = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPIG0qQx8l_RJS5UlehOclOkyQ5ybC-X_O9lPqcxCGi1cQH3ygjk3WyfAzd65ea8-MHrnAlrZTWqA68rAgWSYuVWfNDw5z1DfbCEDqhAEKGoIp1e-deeNA3cCfsAyF_-NmrsmVEuy9_RfFqCU0vsKL2T4tFRk78sZCAMJVszhDnjKrB-DmeIW2OvgySInBuNwO3t71_xJP3fDTF6cXrwgnEqxLIhDIuR7nE8a8PP0yJqG9ls6TFe-y5P1YvqNVdbGRMnthnAV8FO52';

  return (
    <div className="p-gutter lg:p-margin flex-1 pb-12">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 py-4 border-b-2 border-outline-variant">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-primary-container mb-1 uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(var(--primary-container-rgb),0.4)]">
            USER_ARCHIVE // LIBRARY
          </h1>
          <p className="font-label-mono text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
            <span className={`w-2 h-2 ${loading ? 'bg-primary-container animate-pulse' : 'bg-primary-container'}`}></span>
            {loading ? 'SYNCHRONIZING_GRID_DATA...' : `GRID_STATUS: ${items.length}_TITLES_ACQUIRED`}
          </p>
        </div>
        <div className="relative group">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-container font-label-mono group-focus-within:animate-pulse">&gt;</span>
          <input 
            type="text" 
            className="bg-surface border-2 border-outline-variant text-primary-container font-label-mono pl-8 pr-4 py-2 text-[12px] uppercase placeholder:text-outline/40 focus:border-primary-container outline-none transition-all w-full md:w-64" 
            placeholder="SEARCH_MANIFEST..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
      </div>

      {error && <div className="mb-8 p-4 border-2 border-error/50 bg-error/10 text-error font-label-mono text-[12px] animate-pulse">&gt; SYSTEM_FAILURE: {error}</div>}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[1,2,3,4,5,6,7,8,9,10].map(i => (
            <div key={i} className="aspect-[2/3] bg-surface-container-low border-2 border-outline-variant animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-32 font-label-mono text-on-surface-variant border-2 border-dashed border-outline-variant bg-surface-container/30">
          <span className="material-symbols-outlined text-[48px] mb-4 opacity-20">inventory_2</span>
          <p className="tracking-widest">{search ? 'NO_MATCHING_SIGNALS_FOUND' : 'CORE_LIBRARY_EMPTY'}</p>
          {!search && (
            <Link to="/games" className="text-primary-container hover:text-primary-fixed mt-4 inline-block font-bold group">
              &gt; ACCESS_DISCOVERY_HUB <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filtered.map(item => (
            <div 
              key={item.gameId} 
              className="bg-surface-container-low border-2 border-outline-variant hover:border-primary-container transition-all group flex flex-col relative overflow-hidden"
            >
              {/* Box Header/Badge */}
              <div className="absolute top-0 right-0 z-20">
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(item.gameId, item.favorite); }} 
                  className={`p-2 transition-all ${item.favorite ? 'text-primary-container bg-surface/80' : 'text-on-surface-variant hover:text-primary-container'}`}
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: item.favorite ? "'FILL' 1" : "'FILL' 0" }}>
                    {item.favorite ? 'bookmark' : 'bookmark_add'}
                  </span>
                </button>
              </div>

              {/* Box Image Section */}
              <div className="relative aspect-[2/3] overflow-hidden bg-surface-container-lowest">
                <img 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100" 
                  alt={item.title} 
                  src={item.coverUrl || item.heroImageUrl || item.heroBannerUrl || PLACEHOLDER} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60"></div>
                
                {/* Platform Badges */}
                <div className="absolute bottom-3 left-3 flex gap-1">
                   {(item.platforms || []).slice(0, 2).map(p => (
                     <span key={p} className="text-[8px] font-label-mono px-1.5 py-0.5 bg-black/60 border border-outline-variant/30 text-outline-variant uppercase">
                       {p}
                     </span>
                   ))}
                </div>
              </div>

              {/* Box Content Section */}
              <div className="p-4 flex-1 flex flex-col gap-3 bg-surface border-t-2 border-outline-variant">
                <div className="flex flex-col">
                  <h3 className="font-label-mono text-[14px] font-bold text-on-surface uppercase truncate group-hover:text-primary-container transition-colors">
                    {(item.title||'').replace(/\s/g,'_')}
                  </h3>
                  <div className="flex justify-between items-center mt-1">
                    <span className="font-label-mono text-[9px] text-on-surface-variant">
                      {item.playtimeSeconds ? `${Math.round(item.playtimeSeconds/3600)}H_LOGGED` : 'INITIALIZING_RECORD'}
                    </span>
                    <span className="text-[10px] font-label-mono text-primary-fixed-dim opacity-60">
                      V.{item.version || '1.0.0'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-auto">
                  <button 
                    onClick={() => handlePlayNow(item)}
                    className="w-full bg-primary-container text-on-primary-fixed-variant font-label-mono text-[12px] font-bold py-2.5 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0_0_rgba(var(--primary-container-rgb),0.3)]"
                  >
                    <span className="material-symbols-outlined text-sm">play_arrow</span>
                    PLAY_NOW
                  </button>
                  <Link 
                    to={`/game?id=${item.gameId}`}
                    className="w-full text-center border-2 border-outline-variant text-on-surface-variant font-label-mono text-[10px] py-1.5 hover:bg-surface-container-high transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[14px]">info</span>
                    PROJECT_DETAILS
                  </Link>
                </div>
              </div>

              {/* Decorative scanline on hover */}
              <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] transition-opacity"></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

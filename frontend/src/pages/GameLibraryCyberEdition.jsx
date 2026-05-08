import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { library as libraryApi } from '../api';

export default function GameLibraryCyberEdition() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    libraryApi.list({ limit: 20 })
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

  const PLACEHOLDER = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPIG0qQx8l_RJS5UlehOclOkyQ5ybC-X_O9lPqcxCGi1cQH3ygjk3WyfAzd65ea8-MHrnAlrZTWqA68rAgWSYuVWfNDw5z1DfbCEDqhAEKGoIp1e-deeNA3cCfsAyF_-NmrsmVEuy9_RfFqCU0vsKL2T4tFRk78sZCAMJVszhDnjKrB-DmeIW2OvgySInBuNwO3t71_xJP3fDTF6cXrwgnEqxLIhDIuR7nE8a8PP0yJqG9ls6TFe-y5P1YvqNVdbGRMnthnAV8FO52';

  return (
    <div className="p-gutter lg:p-margin flex-1 pb-12">
      <div className="mb-xl flex flex-col md:flex-row md:items-end justify-between gap-lg py-4">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-primary-container mb-xs uppercase">LIBRARY</h1>
          <p className="font-label-mono text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-primary-container animate-pulse"></span>
            {loading ? 'SCANNING_NODES...' : `Status: ${items.length}_TITLES_OWNED`}
          </p>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-container font-label-mono">&gt;</span>
          <input type="text" className="bg-surface-container-highest border border-outline-variant text-primary-container font-label-mono pl-8 pr-4 py-2 text-[12px] uppercase placeholder:text-outline/50 focus:ring-1 focus:ring-primary-container" placeholder="SEARCH_LIBRARY..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {error && <div className="mb-4 p-3 border border-error text-error font-label-mono text-[12px]">&gt; ERROR: {error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {[1,2,3,4].map(i => <div key={i} className="h-72 bg-surface-container-low border-2 border-outline-variant animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 font-label-mono text-on-surface-variant border-2 border-dashed border-outline-variant">
          <p>{search ? 'NO_MATCHING_TITLES' : 'LIBRARY_IS_EMPTY'}</p>
          {!search && <Link to="/games" className="text-primary-container underline mt-2 block">&gt; BROWSE_CATALOG</Link>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {filtered.slice(0,1).map(item => (
            <div key={item.gameId} className="md:col-span-2 md:row-span-2 bg-surface-container-low pixel-border flex flex-col group cursor-pointer border-l-4 border-l-primary-container overflow-hidden">
              <div className="relative h-64 md:h-full min-h-[400px] overflow-hidden">
                <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.title} src={item.coverUrl || PLACEHOLDER} />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
                <div className="absolute top-4 left-4"><span className="bg-primary-container text-on-primary-container font-label-mono px-3 py-1 uppercase text-xs">{item.updateAvailable ? 'UPDATE_AVAILABLE' : 'READY'}</span></div>
                <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                  <div>
                    <h3 className="font-headline-lg text-headline-lg text-primary-container uppercase">{(item.title||'').replace(/\s/g,'_')}</h3>
                    <p className="font-label-mono text-[10px] text-on-surface-variant mt-1">{item.playtimeSeconds ? `${Math.round(item.playtimeSeconds/3600)}H_PLAYED` : 'NEVER_LAUNCHED'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleFavorite(item.gameId, item.favorite)} className={`p-2 border transition-colors ${item.favorite ? 'border-primary-container text-primary-container' : 'border-outline-variant text-on-surface-variant hover:border-primary-container'}`}>
                      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: item.favorite ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                    </button>
                    <Link to={`/game?id=${item.gameId}`} className="bg-primary-container text-on-primary-container font-label-mono text-[12px] px-4 py-2 hover:brightness-110 transition-all">&gt; LAUNCH</Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.slice(1).map(item => (
            <div key={item.gameId} className="bg-surface-container-low pixel-border group cursor-pointer overflow-hidden flex flex-col">
              <div className="relative h-40 overflow-hidden">
                <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={item.title} src={item.coverUrl || PLACEHOLDER} />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
                {item.updateAvailable && <div className="absolute top-2 right-2 bg-secondary-container text-on-secondary-container font-label-mono text-[10px] px-2 py-0.5">UPDATE</div>}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-label-mono text-[12px] text-on-surface group-hover:text-primary-container transition-colors uppercase mb-1">{(item.title||'').replace(/\s/g,'_')}</h3>
                <p className="font-label-mono text-[10px] text-on-surface-variant">{item.playtimeSeconds ? `${Math.round(item.playtimeSeconds/3600)}H_PLAYED` : 'NEVER_LAUNCHED'}</p>
                <div className="mt-auto pt-3 flex gap-2">
                  <Link to={`/game?id=${item.gameId}`} className="flex-1 text-center bg-primary-container text-on-primary-container font-label-mono text-[10px] py-1.5 hover:brightness-110 transition-all">&gt; LAUNCH</Link>
                  <button onClick={() => toggleFavorite(item.gameId, item.favorite)} className={`p-1.5 border transition-colors ${item.favorite ? 'border-primary-container text-primary-container' : 'border-outline-variant text-outline'}`}>
                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: item.favorite ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

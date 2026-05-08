import React, { useState, useEffect, useCallback } from 'react';
import { games as gamesApi } from '../api';

export default function GamesDiscoveryRetroEdition() {
  const [gamesList, setGamesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });

  const fetchGames = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { page, limit: 9, sort };
      if (search.trim()) params.search = search.trim();
      if (selectedGenres.length) params.genre = selectedGenres[0];
      const res = await gamesApi.list(params);
      setGamesList(res.data || []);
      setPagination(res.pagination || { totalPages: 1 });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, sort, search, selectedGenres]);

  useEffect(() => { fetchGames(); }, [fetchGames]);

  const toggleGenre = (g) => setSelectedGenres(prev =>
    prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
  );

  const priceLabel = (game) => {
    if (!game.price || game.price === 0) return 'FREE_TO_PLAY';
    return `$${(game.price / 100).toFixed(2)}`;
  };

  const priceColor = (game) => (!game.price || game.price === 0) ? 'text-primary-container' : 'text-secondary-fixed';

  return (
    <div className="p-gutter lg:p-margin flex-1 pb-12">
      <section className="mb-12">
        <div className="bg-surface-container-low border-2 border-outline-variant p-4 pixel-border">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container font-label-mono">&gt;</span>
              <input
                className="w-full bg-surface-container-highest border-0 pl-10 text-primary-container font-label-mono focus:ring-1 focus:ring-primary-container placeholder:text-outline/50 uppercase"
                placeholder="SEARCH_DATABASE_FOR_GAMES..."
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-5 bg-primary-container animate-pulse"></span>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <label className="font-label-mono text-on-surface-variant text-[10px] uppercase">SORT_BY:</label>
              <select
                className="bg-surface-container border border-outline-variant text-primary-container font-label-mono text-[12px] px-4 py-2 focus:ring-primary-container appearance-none min-w-[150px]"
                value={sort}
                onChange={e => { setSort(e.target.value); setPage(1); }}
              >
                <option value="featured">FEATURED_HOSTS</option>
                <option value="newest">NEWEST_ENTRIES</option>
                <option value="price_asc">PRICE_LOW_TO_HIGH</option>
                <option value="price_desc">PRICE_HIGH_TO_LOW</option>
                <option value="rating">TOP_RATED</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col xl:flex-row gap-gutter">
        <aside className="xl:w-64 flex-shrink-0">
          <div className="space-y-8">
            <div>
              <h3 className="font-label-mono text-primary-container text-label-mono border-b border-outline-variant pb-2 mb-4 uppercase">GENRE_FILTERS</h3>
              <div className="space-y-3">
                {['Action', 'RPG', 'Strategy', 'Simulation', 'Racing', 'Indie'].map(genre => (
                  <label key={genre} className="flex items-center gap-3 group cursor-pointer">
                    <input
                      className="w-4 h-4 rounded-none bg-surface border-outline-variant text-primary-container focus:ring-primary-container"
                      type="checkbox"
                      checked={selectedGenres.includes(genre)}
                      onChange={() => { toggleGenre(genre); setPage(1); }}
                    />
                    <span className="font-label-mono text-on-surface-variant text-[12px] group-hover:text-primary-container transition-colors uppercase">{genre.toUpperCase()}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          {error && <div className="mb-4 p-3 border border-error text-error font-label-mono text-[12px]">&gt; ERROR: {error}</div>}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-gutter">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-72 bg-surface-container-low border-2 border-outline-variant animate-pulse" />)}
            </div>
          ) : gamesList.length === 0 ? (
            <div className="text-center py-24 font-label-mono text-on-surface-variant border-2 border-dashed border-outline-variant">
              <p className="text-[14px]">NO_RESULTS_FOUND</p>
              <p className="text-[10px] mt-2">TRY_ADJUSTING_YOUR_SEARCH_FILTERS</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-gutter">
              {gamesList.map(game => (
                <div key={game.id} className="bg-surface-container border-2 border-outline-variant group hover:border-primary-container transition-all flex flex-col pixel-border relative overflow-hidden">
                  <div className="h-48 overflow-hidden relative">
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      alt={game.title}
                      src={game.coverUrl || game.heroImageUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCekcLG1R4SPSVFiOQxJ1zoNzQ9hrbKDAiiYqBAeLqrLKCe_hFKR7NQ6QI_WlQHU8mWEsb-PN9p4qJydIeJrkybfFyNewcxuYsq9lrkU4QHMrVXWy7tqEYSjlwaXcvaqjHceNI8yTD15ng1V985MpmirSstKeXb1qNcl-auZLfMscpTK0UIE5icpoufxSRg1IjEHpHvNFFlS_nSBeGkIcSpscgQMmO7KTndk9Hj-yiqimxsjd1VLpKfCRSPY_VMPqKfQq8LxefHchno'}
                    />
                    <div className="absolute top-2 right-2 bg-background/80 border border-primary-container px-2 py-1">
                      <span className="text-primary-container font-label-mono text-[10px]">{game.rating ? `${game.rating.toFixed(1)}_RTG` : 'NEW'}</span>
                    </div>
                    {game.featured && (
                      <div className="absolute top-2 left-2 bg-primary-container text-on-primary-container font-label-mono text-[10px] px-2 py-0.5">FEATURED</div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-headline-md text-primary group-hover:text-primary-container transition-colors uppercase">{game.title}</h4>
                      <span className={`font-label-mono text-[14px] ${priceColor(game)}`}>{priceLabel(game)}</span>
                    </div>
                    <p className="text-on-surface-variant text-body-md mb-4 line-clamp-2 opacity-80">{game.shortDescription}</p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {(game.genres || []).slice(0,2).map(genre => (
                        <span key={genre} className="bg-surface-variant text-[10px] font-label-mono px-2 py-1 border border-outline uppercase">{genre}</span>
                      ))}
                    </div>
                    <div className="mt-auto grid grid-cols-2 gap-2">
                      <button className="bg-primary-container text-on-primary-container font-label-mono py-2 text-[12px] font-bold hover:brightness-110 active:translate-y-0.5 transition-all">HOST_NOW</button>
                      <button className="border border-outline-variant text-on-surface-variant font-label-mono py-2 text-[12px] hover:bg-surface-bright transition-all uppercase">DETAILS</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && pagination.totalPages > 1 && (
            <div className="mt-12 flex justify-center items-center gap-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="w-10 h-10 border border-outline-variant flex items-center justify-center text-on-surface-variant hover:border-primary-container hover:text-primary-container transition-all disabled:opacity-40"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <div className="flex gap-2">
                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-10 h-10 font-label-mono flex items-center justify-center border transition-all ${p === page ? 'bg-primary-container text-on-primary-container border-primary-container' : 'border-outline-variant text-on-surface-variant hover:border-primary-container hover:text-primary-container'}`}
                  >{String(p).padStart(2,'0')}</button>
                ))}
              </div>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="w-10 h-10 border border-outline-variant flex items-center justify-center text-on-surface-variant hover:border-primary-container hover:text-primary-container transition-all disabled:opacity-40"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

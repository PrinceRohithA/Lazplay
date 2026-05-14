import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { games as gamesApi } from '../api';

export default function GamesDiscoveryRetroEdition() {
  const [gamesList, setGamesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  
  const [genreOpen, setGenreOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);

  const fetchGames = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { page, limit: 12, sort };
      if (search.trim()) params.search = search.trim();
      if (selectedGenres.length) params.genre = selectedGenres;
      if (selectedTags.length) params.tags = selectedTags;
      const res = await gamesApi.list(params);
      setGamesList(res.data || []);
      setPagination(res.pagination || { totalPages: 1 });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, sort, search, selectedGenres, selectedTags]);

  useEffect(() => { fetchGames(); }, [fetchGames]);

  const toggleFilter = (list, setList, item) => {
    setList(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
    setPage(1);
  };

  const genres = ['Action', 'RPG', 'Strategy', 'Simulation', 'Racing', 'Indie', 'Adventure', 'Casual'];
  const tags = ['2D', '3D', 'Multiplayer', 'Singleplayer', 'Retro', 'Sci-Fi', 'Fantasy', 'Horror'];

  const FilterDropdown = ({ label, items, selected, onToggle, isOpen, setIsOpen }) => (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-surface-container border border-outline-variant text-primary-container font-label-mono text-[11px] px-4 py-2 hover:bg-surface-container-high transition-colors flex items-center gap-2 min-w-[140px] uppercase"
      >
        <span>{selected.length > 0 ? `${label} (${selected.length})` : label}</span>
        <span className="material-symbols-outlined text-[16px]">{isOpen ? 'expand_less' : 'expand_more'}</span>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-56 bg-surface-container-highest border-2 border-outline-variant z-20 pixel-border p-2 max-h-64 overflow-y-auto">
            {items.map(item => (
              <label key={item} className="flex items-center gap-3 p-2 hover:bg-surface-container transition-colors cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 border-outline-variant text-primary-container focus:ring-primary-container rounded-none"
                  checked={selected.includes(item)}
                  onChange={() => onToggle(item)}
                />
                <span className="font-label-mono text-[10px] text-on-surface-variant group-hover:text-primary-container uppercase">{item}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="p-gutter lg:p-margin flex-1 pb-12">
      <section className="mb-8">
        <div className="bg-surface-container-low border-2 border-outline-variant p-4 pixel-border">
          <div className="flex flex-col gap-4">
            <div className="relative w-full">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container font-label-mono">&gt;</span>
              <input
                className="w-full bg-surface-container-highest border-0 pl-10 text-primary-container font-label-mono focus:ring-1 focus:ring-primary-container focus:outline-none placeholder:text-outline/50 uppercase"
                style={{ outline: 'none', boxShadow: 'none' }}
                placeholder="SEARCH_DATABASE_FOR_GAMES..."
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-5 bg-primary-container animate-pulse"></span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 border-t border-outline-variant pt-4">
              <div className="flex items-center gap-2">
                <label className="font-label-mono text-on-surface-variant text-[10px] uppercase">SORT:</label>
                <select
                  className="bg-surface-container border border-outline-variant text-primary-container font-label-mono text-[11px] px-4 py-2 focus:outline-none appearance-none min-w-[140px] uppercase cursor-pointer"
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

              <FilterDropdown 
                label="GENRES" 
                items={genres} 
                selected={selectedGenres} 
                onToggle={(item) => toggleFilter(selectedGenres, setSelectedGenres, item)}
                isOpen={genreOpen}
                setIsOpen={setGenreOpen}
              />

              <FilterDropdown 
                label="TAGS" 
                items={tags} 
                selected={selectedTags} 
                onToggle={(item) => toggleFilter(selectedTags, setSelectedTags, item)}
                isOpen={tagOpen}
                setIsOpen={setTagOpen}
              />

              {(selectedGenres.length > 0 || selectedTags.length > 0) && (
                <button 
                  onClick={() => { setSelectedGenres([]); setSelectedTags([]); setPage(1); }}
                  className="font-label-mono text-[10px] text-error hover:underline uppercase px-2"
                >
                  CLEAR_ALL_FILTERS
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-gutter">
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
                      src={game.heroBannerUrl || game.coverUrl || game.heroImageUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCekcLG1R4SPSVFiOQxJ1zoNzQ9hrbKDAiiYqBAeLqrLKCe_hFKR7NQ6QI_WlQHU8mWEsb-PN9p4qJydIeJrkybfFyNewcxuYsq9lrkU4QHMrVXWy7tqEYSjlwaXcvaqjHceNI8yTD15ng1V985MpmirSstKeXb1qNcl-auZLfMscpTK0UIE5icpoufxSRg1IjEHpHvNFFlS_nSBeGkIcSpscgQMmO7KTndk9Hj-yiqimxsjd1VLpKfCRSPY_VMPqKfQq8LxefHchno'}
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
                    <p className="text-on-surface-variant text-body-md mb-4 line-clamp-2 opacity-80">
                      {game.tagline || toPlainText(game.description)}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {(game.genres || []).slice(0,2).map(genre => (
                        <span key={genre} className="bg-surface-variant text-[10px] font-label-mono px-2 py-1 border border-outline uppercase">{genre}</span>
                      ))}
                    </div>
                    <div className="mt-auto grid grid-cols-2 gap-2">
                      <Link to={`/game?id=${game.id}`} className="bg-primary-container text-on-primary-container font-label-mono py-2 text-[12px] font-bold hover:brightness-110 active:translate-y-0.5 transition-all text-center">HOST_NOW</Link>
                      <Link to={`/game?id=${game.id}`} className="border border-outline-variant text-on-surface-variant font-label-mono py-2 text-[12px] hover:bg-surface-bright transition-all uppercase text-center">DETAILS</Link>
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

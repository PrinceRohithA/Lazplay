import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { games as gamesApi, library as libraryApi } from '../api';

export default function PlayerDiscoveryHub() {
  const [featured, setFeatured] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      gamesApi.featured({ limit: 12 }).then(r => r.data).catch(() => []),
      libraryApi.list({ limit: 6 }).then(r => r.data).catch(() => []),
    ]).then(([feat, lib]) => { setFeatured(feat); setRecentGames(lib); setLoading(false); });
  }, []);

  const hero = featured[heroIdx];

  return (
    <div className="flex flex-col gap-6 md:gap-margin p-4 md:p-margin grid-glow-bg">
      <section className="w-full relative border-2 border-outline-variant bg-surface-container-low retro-border min-h-[300px] md:h-[400px] flex flex-col mb-4 md:mb-gutter">
        <div className="bg-surface-container-highest border-b-2 border-outline-variant px-4 py-1 flex justify-between items-center">
          <span className="font-label-mono text-[10px] md:text-label-mono text-on-primary-container">&gt; FEATURED_PROTOCOL.EXE</span>
          <div className="flex gap-2">
            {(featured.length ? featured : [0,1,2]).map((_, i) => (
              <button key={i} onClick={() => setHeroIdx(i)} className={`w-2 h-2 md:w-3 md:h-3 border transition-colors ${i === heroIdx ? 'bg-primary-container border-primary-container' : 'bg-surface border-on-surface'}`} />
            ))}
          </div>
        </div>
        <div className="flex-1 relative w-full h-full min-h-[250px] md:min-h-0">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-label-mono text-on-primary-container animate-pulse">LOADING_FEATURED_PROTOCOL...</span>
            </div>
          ) : hero ? (
            <div className="absolute inset-0 flex flex-col">
              <img alt={hero.title} className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-luminosity grayscale hover:grayscale-0 transition-all duration-500" src={hero.heroBannerUrl || hero.heroImageUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDB5l8_2ZRmLC1n16I24FMMADDCZxwS6JscWsm2D8MvdCzka-NjfuHvd_KjhYScjv_b19ngm1WWqsgwoUxV4ygzPoKB-a8BB4QszlDn6v285IQFQqlgCmVmBrCvYMd4enHnsKJWmOBHBQTNNstZKFFrQLEjCFaeTf-5Hw_KaShDa_2doPNvpvBWjSo47gwaC_Yw5euMOvcnouvcTudO3NwNYXoFnIs8lRnQl2AVpI1AFXFovc9u5MvAocO1uqKXKlaGsiOXoQKVaOi'} />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent flex flex-col md:flex-row justify-end md:justify-between items-start md:items-end p-4 md:p-8 gap-4">
                <div className="max-w-2xl">
                  <h1 className="font-headline-lg md:font-headline-xl text-headline-md md:text-headline-xl text-on-primary-container font-bold glow-text-primary mb-2 uppercase tracking-tight truncate w-full">{hero.title?.replace(/\s/g,'_')}</h1>
                  <p className="hidden sm:block font-body-md md:font-body-lg text-on-surface-variant bg-surface-container-highest/80 p-2 border border-outline-variant">{hero.tagline || 'HIGH-SPEED SYNTHWAVE RACING PROTOCOL. ENGAGE HYPER-DRIVE.'}</p>
                </div>
                <Link 
                  to={`/game?id=${hero.id}`} 
                  className={`w-full md:w-auto text-center font-label-mono text-label-mono px-6 py-3 border-2 transition-colors cyber-btn ${
                    hero.isOwned 
                      ? "border-secondary-container" 
                      : "border-primary-container"
                  }`}
                >
                  {hero.isOwned ? '> EXECUTE_PLAY' : hero.priceType === 'FREE' ? '> CLAIM_FREE' : '> VIEW_OFFER'}
                </Link>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-label-mono text-on-surface-variant">NO_FEATURED_GAMES_FOUND</span>
            </div>
          )}
        </div>
      </section>
      
      {/* Trending Now Section */}
      {!loading && featured.length > 5 && (
        <section className="space-y-4">
          <div className="flex justify-between items-end border-b-2 border-outline-variant pb-2">
            <h2 className="font-headline-md text-headline-sm md:text-headline-md text-on-surface uppercase tracking-wide flex items-center gap-2">
              <span className="text-on-primary-container">&gt;</span> TRENDING_MATRIX
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-4">
            {featured.slice(5, 12).map((game, i) => (
              <Link 
                key={game.id} 
                to={`/game?id=${game.id}`}
                className="group relative aspect-[3/4] bg-surface-container border border-outline-variant hover:border-primary-container transition-all overflow-hidden pixel-border"
              >
                <img 
                  src={game.coverUrl || game.heroImageUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCekcLG1R4SPSVFiOQxJ1zoNzQ9hrbKDAiiYqBAeLqrLKCe_hFKR7NQ6QI_WlQHU8mWEsb-PN9p4qJydIeJrkybfFyNewcxuYsq9lrkU4QHMrVXWy7tqEYSjlwaXcvaqjHceNI8yTD15ng1V985MpmirSstKeXb1qNcl-auZLfMscpTK0UIE5icpoufxSRg1IjEHpHvNFFlS_nSBeGkIcSpscgQMmO7KTndk9Hj-yiqimxsjd1VLpKfCRSPY_VMPqKfQq8LxefHchno'} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                  alt={game.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                  <span className="font-label-mono text-[9px] text-on-primary-container truncate">{game.title}</span>
                </div>
                <div className="absolute top-1 left-1 bg-surface-container-highest/90 border border-outline-variant px-1 text-[8px] font-label-mono text-on-surface-variant">
                  #{i+6}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-margin">
        <div className="lg:col-span-9 space-y-4">
          <div className="flex justify-between items-end border-b-2 border-outline-variant pb-2">
            <h2 className="font-headline-md text-headline-sm md:text-headline-md text-on-surface uppercase tracking-wide flex items-center gap-2">
              <span className="text-on-primary-container">&gt;</span> MEMORY_BANKS
            </h2>
            <Link to="/library" className="font-label-mono text-[10px] md:text-label-mono text-on-surface-variant hover:text-on-primary-container underline decoration-dotted">VIEW_ALL</Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {[1,2,3].map(i => <div key={i} className="h-48 bg-surface-container-low border-2 border-outline-variant animate-pulse" />)}
            </div>
          ) : recentGames.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {recentGames.map(item => (
                <div key={item.gameId} className="bg-surface-container border-2 border-outline-variant retro-border retro-border-hover group transition-all flex flex-col h-full">
                  <div className="h-32 border-b-2 border-outline-variant relative overflow-hidden bg-surface-container-lowest">
                    <img alt={item.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0" src={item.heroBannerUrl || item.heroImageUrl || item.coverUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuC54pm-DlFwdN1M9aKkTmci1Zz0d7megKplAw_Mc7TTOX7uLShonn-bBLCc7cXpCoaJEvbpeFbBK5hIhZIS2jwNMGNDpJjWbSqi2Fr3cNsnrU1Jy2gnBW2BwF7ogB2l8jrpkOJynVla_CZmJsnzn6FvKxT3vjKF21JJYB7_pm9W8NAIEct109nk6rV1xJ_FCd0xRJD1IbvQaP1GVxe8QCxci3u4RBQ6gSKWdCufRjGqG4WmLbZnPYsXoZg7mIms2ZbZOqH65wIHmGoM'} />
                    <div className="absolute top-2 right-2 bg-primary-container text-on-primary-container font-label-mono text-[10px] px-2 py-0.5 border border-on-primary">{item.installedStatus || 'READY'}</div>
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-headline-md text-[18px] md:text-[20px] text-on-surface mb-1 group-hover:text-on-primary-container transition-colors uppercase">{(item.title||'').replace(/\s/g,'_')}</h3>
                    <p className="font-label-mono text-[10px] text-on-surface-variant mb-4">{item.lastPlayedAt ? `LAST_SYNC: ${new Date(item.lastPlayedAt).toLocaleDateString()}` : 'NEVER_PLAYED'}</p>
                    <div className="mt-auto flex justify-between items-center">
                      <div className="flex gap-1 h-2 w-16 bg-surface-container-highest border border-outline">
                        <div className="bg-primary-container" style={{ width: item.updateAvailable ? '50%' : '100%' }} />
                      </div>
                      <Link to={`/game?id=${item.gameId}`} className="text-on-primary-container hover:text-primary-fixed bg-surface border border-outline-variant hover:border-primary-container px-3 py-1 font-label-mono text-[10px]">&gt; RESUME</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 font-label-mono text-on-surface-variant border-2 border-dashed border-outline-variant p-4">
              <p>NO_GAMES_IN_LIBRARY</p>
              <Link to="/games" className="text-primary-container underline mt-2 block">&gt; BROWSE_CATALOG</Link>
            </div>
          )}
        </div>

        <aside className="lg:col-span-3 space-y-4">
          <div className="border-b-2 border-outline-variant pb-2">
            <h2 className="font-headline-md text-headline-sm md:text-[20px] text-on-surface uppercase tracking-wide flex items-center gap-2">
              <span className="text-primary-container">&gt;</span> NETWORK_STATUS
            </h2>
          </div>
          <div className="bg-surface border-2 border-outline-variant p-4 space-y-4 retro-border">
            <div className="bg-surface-container-highest border-b-2 border-outline-variant px-2 py-1 mb-2">
              <span className="font-label-mono text-[10px] text-on-surface-variant uppercase">ACTIVE_CONNECTIONS.LOG</span>
            </div>
            <div className="space-y-2">
              {[
                { label: 'FEATURED_GAMES', value: featured.length },
                { label: 'LIBRARY_SIZE', value: recentGames.length },
                { label: 'BACKEND', value: loading ? 'CONNECTING...' : 'ONLINE' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between font-label-mono text-[10px]">
                  <span className="text-on-surface-variant uppercase">{label}</span>
                  <span className={loading ? 'text-secondary-container animate-pulse' : 'text-primary-container'}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

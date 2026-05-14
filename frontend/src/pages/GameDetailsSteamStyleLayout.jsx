import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { games as gamesApi, payments, library as libraryApi } from '../api';
import DOMPurify from 'dompurify';
import RazorpayCheckout from '../components/RazorpayCheckout';

export default function GameDetailsSteamStyleLayout() {
  const [params] = useSearchParams();
  const gameId = params.get('id');
  const [game, setGame] = useState(null);
  const [media, setMedia] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [playingTrailer, setPlayingTrailer] = useState(false);
  const [playingGame, setPlayingGame] = useState(false);
  const [launchData, setLaunchData] = useState(null);
  const [playSessionId, setPlaySessionId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameContainerRef = useRef(null);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleFullscreen = () => {
    if (gameContainerRef.current) {
      if (gameContainerRef.current.requestFullscreen) {
        gameContainerRef.current.requestFullscreen();
      } else if (gameContainerRef.current.webkitRequestFullscreen) { /* Safari */
        gameContainerRef.current.webkitRequestFullscreen();
      } else if (gameContainerRef.current.msRequestFullscreen) { /* IE11 */
        gameContainerRef.current.msRequestFullscreen();
      }
    }
  };

  useEffect(() => {
    if (!gameId) { setLoading(false); return; }
    Promise.all([
      gamesApi.get(gameId).then(r => r.data),
      gamesApi.media(gameId).then(r => r.data).catch(() => []),
      gamesApi.reviews(gameId, { page: 1, limit: 10 }).then(r => r.data).catch(() => [])
    ])
      .then(([g, m, r]) => {
        setGame(g || null);
        setMedia(m || []);
        setReviews(r || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'FAILED_TO_LOAD_GAME');
        setLoading(false);
      });
  }, [gameId]);

  const handlePaymentSuccess = useCallback((data) => {
    setSuccessMsg("PURCHASE_SUCCESSFUL! Game added to your library.");
    // Refresh game data to show "PLAY NOW"
    gamesApi.get(gameId).then(r => setGame(r.data));
  }, [gameId]);

  const handlePaymentError = useCallback((msg) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  }, []);

  const handleSubmitReview = async () => {
    if (!gameId) return;
    if (!reviewBody.trim()) {
      setError('REVIEW_BODY_REQUIRED');
      return;
    }
    setReviewSubmitting(true);
    try {
      await gamesApi.submitReview(gameId, { rating: reviewRating, body: reviewBody.trim() });
      const res = await gamesApi.reviews(gameId, { page: 1, limit: 10 });
      setReviews(res.data || []);
      setReviewBody('');
      setSuccessMsg('REVIEW_SUBMITTED');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.message || 'REVIEW_SUBMIT_FAILED');
    } finally {
      setReviewSubmitting(false);
    }
  };
  
  const handleClaim = async () => {
    if (!gameId) return;
    setLoading(true);
    try {
      await libraryApi.add(gameId);
      setSuccessMsg("GAME_ADDED_TO_LIBRARY!");
      const res = await gamesApi.get(gameId);
      setGame(res.data);
    } catch (err) {
      setError(err.message || 'CLAIM_FAILED');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async () => {
    if (!gameId) return;

    // Check if we are in Electron and it's a native game
    const platforms = (game.platforms || []).map(p => p.toUpperCase());
    const isWeb = platforms.includes('WEB') || platforms.includes('BROWSER');

    if (window.electron && !isWeb) {
      try {
        const res = await window.electron.invoke('launch-game', gameId);
        if (res.success) return;
        setError(res.error || 'FAILED_TO_LAUNCH_NATIVE_GAME');
      } catch (err) {
        setError('LAUNCHER_COMMUNICATION_ERROR');
      }
      return;
    }

    setLoading(true);
    try {
      const res = await gamesApi.launchManifest(gameId);
      setLaunchData(res.data);
      const sessionRes = await gamesApi.playStart(gameId);
      setPlaySessionId(sessionRes.data.sessionId);
      setPlayingGame(true);
    } catch (err) {
      setError(err.message || 'FAILED_TO_LAUNCH_GAME');
    } finally {
      setLoading(false);
    }
  };

  const handleStopPlay = async () => {
    setPlayingGame(false);
    if (!gameId) return;
    try {
      await gamesApi.playEnd(gameId, playSessionId ? { sessionId: playSessionId } : undefined);
    } catch (err) {
      console.warn('Play end tracking failed', err);
    } finally {
      setPlaySessionId(null);
      setLaunchData(null);
    }
  };

  // Ensure tracking stops on unmount and handle autoPlay
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autoPlay') === 'true' && game && game.isOwned && !playingGame && !loading) {
        handlePlay();
        // Clear param so it doesn't re-trigger on refresh
        const newUrl = window.location.pathname + '?id=' + gameId;
        window.history.replaceState({ path: newUrl }, '', newUrl);
    }

    return () => {
      if (playSessionId) {
        gamesApi.playEnd(gameId, { sessionId: playSessionId }).catch(() => {});
      }
    };
  }, [playSessionId, gameId, game, loading]);

  const screenshots = media.filter((m) => m.type === 'IMAGE' && (m.alt === 'SCREENSHOT' || !m.alt));
  const videos = media.filter((m) => m.type === 'VIDEO');

  const sysReqs = game?.systemRequirements || {};
  const minSpecs = sysReqs.minimum || {};
  const recSpecs = sysReqs.recommended || {};

  return (
    <div className="flex flex-col min-w-0 p-gutter md:p-margin gap-6">
      {loading && <div className="text-center py-24 font-label-mono text-primary-container animate-pulse">LOADING_GAME_DATA...</div>}
      {error && <div className="p-4 border border-error text-error font-label-mono bg-error/10 pixel-border">&gt; ERROR: {error}</div>}
      {successMsg && <div className="p-4 border border-primary-container text-primary-container font-label-mono bg-primary-container/10 pixel-border">&gt; SUCCESS: {successMsg}</div>}
      {!loading && !game && <div className="text-center py-24 font-label-mono text-on-surface-variant">GAME_NOT_FOUND</div>}
      {!loading && game && (
        <>
        {/*  Hero Section (Steam Style)  */}
        <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] lg:grid-cols-[1fr_320px] gap-gutter bg-surface-container-low pixel-border p-2">
        {/*  Left: Main Media  */}
        <div className="relative aspect-video xl:h-[450px] overflow-hidden bg-black pixel-border group min-w-0">
          {playingGame && launchData ? (
            <div ref={gameContainerRef} className="absolute inset-0 z-50 bg-black flex flex-col">
              <div className="flex items-center justify-between p-2 bg-surface-container-highest border-b border-outline-variant h-10 px-4">
                <span className="font-label-mono text-[10px] text-primary-container uppercase truncate">{game.title} // ONLINE_SESSION</span>
                <div className="flex gap-2">
                  <button onClick={handleFullscreen} className="text-on-surface-variant hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[18px]">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
                  </button>
                  <button onClick={handleStopPlay} className="text-error hover:text-red-400 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              </div>
              <iframe 
                src={launchData.entrypointUrl} 
                className="flex-1 w-full h-full border-none bg-black"
                allow="autoplay; fullscreen; keyboard"
                title={game.title}
              />
            </div>
          ) : playingTrailer && (game.trailerUrl || videos.length > 0) ? (
            <div className="w-full h-full relative">
                <video 
                    src={game.trailerUrl || (videos.length > 0 ? videos[0].url : '')} 
                    poster={game.heroBannerUrl || game.heroImageUrl}
                    controls 
                    autoPlay 
                    className="w-full h-full object-contain" 
                />
                <button 
                    onClick={() => setPlayingTrailer(false)}
                    className="absolute top-4 right-4 bg-surface/50 text-on-surface p-1 pixel-border hover:bg-surface transition-all z-10 opacity-0 group-hover:opacity-100"
                >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
            </div>
          ) : (
            <>
              <img alt={game.title} className="w-full h-full object-cover opacity-80" src={game.heroBannerUrl || game.heroImageUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuC9KrQ5YpZIImJ1Kd2RBfr-IeRwo5ttSkse1x9Q71QkonTieCCBK-ZICf1E_3LD5-X4q63if0DYzWnYTFcwoRStnzJtmrdqfhsIouTLhtzkMmCzw0y_69VlGf5INbG4nK77O9oKMw9FDOaqKgWuh-yDPS9BKfJsFzcuP9Ueuv1CFIMfot1RHyyIqegrc4toawTb6VxlS0VnqAc-XiUBOixMQ6hvHARoZbpH1Dlt9IHWrRbvaJaqI_mte6dOhR4-5vmnF9sG75TI6lXu"}/>
              <div 
                className={`absolute inset-0 flex items-center justify-center ${(game.trailerUrl || videos.length > 0) ? 'cursor-pointer hover:bg-black/20 pointer-events-auto' : 'pointer-events-none'} transition-colors`}
                onClick={() => { if (game.trailerUrl || videos.length > 0) setPlayingTrailer(true); }}
              >
                <div className={`bg-surface/80 p-4 pixel-border ${(game.trailerUrl || videos.length > 0) ? 'hover:bg-surface pointer-events-none' : ''} transition-colors`}>
                  <span className="material-symbols-outlined text-primary-container text-6xl">play_circle</span>
                </div>
              </div>
            </>
          )}
        </div>
        {/*  Right: Game Info Box  */}
        <div className="flex flex-col gap-4 p-4 font-label-mono text-label-mono min-w-0">
          <div className="w-full aspect-[2/3] bg-black pixel-border overflow-hidden mb-2 hidden lg:block shadow-[0_0_15px_rgba(0,0,0,0.3)]">
            <img 
              src={game.coverUrl || game.heroImageUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuC9KrQ5YpZIImJ1Kd2RBfr-IeRwo5ttSkse1x9Q71QkonTieCCBK-ZICf1E_3LD5-X4q63if0DYzWnYTFcwoRStnzJtmrdqfhsIouTLhtzkMmCzw0y_69VlGf5INbG4nK77O9oKMw9FDOaqKgWuh-yDPS9BKfJsFzcuP9Ueuv1CFIMfot1RHyyIqegrc4toawTb6VxlS0VnqAc-XiUBOixMQ6hvHARoZbpH1Dlt9IHWrRbvaJaqI_mte6dOhR4-5vmnF9sG75TI6lXu"} 
              alt="Project Cover" 
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="font-headline-lg text-headline-lg text-primary-container uppercase tracking-tighter drop-shadow-[0_0_8px_rgba(57,255,20,0.6)] truncate">{game.title}</h1>
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="grid grid-cols-[100px_1fr] gap-y-2 text-[11px] uppercase">
              <span className="text-on-surface-variant">RECENT_REVIEWS:</span>
              <span className="text-primary-container">OVERWHELMINGLY_POSITIVE</span>
              <span className="text-on-surface-variant">RELEASE_DATE:</span>
              <span className="text-on-surface">{game.releaseDate || new Date(game.createdAt).toLocaleDateString()}</span>
              <span className="text-on-surface-variant">DEVELOPER:</span>
              <span className="text-secondary-container truncate">{game.developer?.displayName || 'UNKNOWN_DEV'}</span>
              <span className="text-on-surface-variant">PUBLISHER:</span>
              <span className="text-secondary-container truncate">{game.publisher || 'LAZPLAY_STUDIOS'}</span>
            </div>
          </div>
          <div className="pt-4 border-t border-outline-variant">
            <div className="flex flex-wrap gap-1 mb-4">
              {game.genres?.map(g => (
                <span key={g} className="bg-surface-variant px-1 text-[10px] text-tertiary-container pixel-border uppercase">{g}</span>
              ))}
            </div>
            <div className="mb-4 text-headline-sm font-bold text-primary-container">
              {game.priceType === 'FREE' ? 'FREE_TO_PLAY' : `₹${(game.price / 100).toFixed(2)}`}
            </div>
            {game.isOwned ? (
              <div className="flex flex-col gap-2">
                <button 
                  onClick={handlePlay}
                  className="w-full bg-primary-container text-on-primary-container py-3 pixel-border neon-glow hover:bg-primary-fixed transition-all uppercase flex justify-center items-center gap-2 font-bold"
                >
                  <span className="material-symbols-outlined">play_arrow</span>
                  PLAY_NOW
                </button>
                <Link 
                  to="/library"
                  className="w-full bg-secondary-container text-on-secondary-container py-2 pixel-border hover:bg-secondary-fixed transition-all uppercase flex justify-center items-center gap-2 text-[10px]"
                >
                  <span className="material-symbols-outlined text-[14px]">library_books</span>
                  GO_TO_LIBRARY
                </Link>
              </div>
            ) : (game.priceType === 'FREE' || game.hasEntitlement) ? (
              <button 
                onClick={handleClaim}
                className="w-full bg-primary-container text-on-primary-container py-3 pixel-border neon-glow hover:bg-primary-fixed transition-all uppercase flex justify-center items-center gap-2 font-bold disabled:opacity-50"
              >
                <span className="material-symbols-outlined">add_circle</span>
                {game.hasEntitlement ? 'ADD_TO_LIBRARY' : 'CLAIM_FREE_GAME'}
              </button>
            ) : (
              <RazorpayCheckout 
                game={game} 
                onSuccess={handlePaymentSuccess} 
                onError={handlePaymentError} 
              />
            )}
          </div>
        </div>
      </section>

      {/*  Horizontal Navigation Bar  */}
      <nav className="flex flex-wrap bg-surface-container-high pixel-border font-label-mono text-[11px] uppercase">
        <a className="px-6 py-2 bg-primary-container text-on-primary-container font-bold" href="#overview">Overview</a>
        <a className="px-6 py-2 text-on-surface-variant hover:text-primary transition-colors" href="#screenshots">Screenshots</a>
        <a className="px-6 py-2 text-on-surface-variant hover:text-primary transition-colors" href="#reviews">Reviews</a>
      </nav>

      {/*  Main Content Area: Two Column  */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/*  Left Column: Detailed Content  */}
        <div className="space-y-6">
          <section id="overview" className="bg-surface-container pixel-border p-gutter">
            <div className="bg-surface-variant text-on-surface border-b-2 border-outline-variant -mx-gutter -mt-gutter mb-gutter px-gutter py-2 font-label-mono text-label-mono">
              &gt;_ README.TXT
            </div>
            <div className="font-body-md text-on-surface quill-content">
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(game.description) }} />
            </div>
          </section>

          {(screenshots.length > 0 || videos.length > 1) && (
            <section id="screenshots" className="bg-surface-container pixel-border p-gutter">
              <div className="bg-surface-variant text-on-surface border-b-2 border-outline-variant -mx-gutter -mt-gutter mb-gutter px-gutter py-2 font-label-mono text-label-mono uppercase">
                &gt;_ MEDIA_ARCHIVE
              </div>

              {videos.length > 1 && (
                <div className="mb-4 space-y-4">
                  {videos.slice(1).map(v => (
                    <video key={v.id} controls className="w-full aspect-video pixel-border bg-black">
                      <source src={v.url} />
                      Your browser does not support the video tag.
                    </video>
                  ))}
                </div>
              )}

              {screenshots.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {screenshots.map(s => (
                    <div key={s.id} className="pixel-border overflow-hidden bg-black aspect-video relative group/item">
                      <img src={s.url} alt="Screenshot" className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
          <section className="bg-surface-container pixel-border p-gutter font-label-mono">
            <div className="text-on-surface-variant border-b border-outline-variant pb-2 mb-4 text-[12px] uppercase">System Requirements</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[11px]">
              <div>
                <div className="text-primary-container mb-2">MINIMUM_SPECS:</div>
                <ul className="space-y-1 text-on-surface-variant">
                  <li>OS: {minSpecs.os || 'SYSTEM_OS V_1.0.4'}</li>
                  <li>PROC: {minSpecs.processor || '8-BIT ZILOG Z80'}</li>
                  <li>MEMORY: {minSpecs.memory || '64 KB RAM'}</li>
                  {minSpecs.graphics && <li>GRAPHICS: {minSpecs.graphics}</li>}
                  {minSpecs.storage && <li>STORAGE: {minSpecs.storage}</li>}
                </ul>
              </div>
              <div>
                <div className="text-secondary-container mb-2">RECOMMENDED_SPECS:</div>
                <ul className="space-y-1 text-on-surface-variant">
                  <li>OS: {recSpecs.os || 'SYSTEM_OS V_1.0.4+'}</li>
                  <li>PROC: {recSpecs.processor || '16-BIT MOTOROLA 68000'}</li>
                  <li>MEMORY: {recSpecs.memory || '128 KB RAM'}</li>
                  {recSpecs.graphics && <li>GRAPHICS: {recSpecs.graphics}</li>}
                  {recSpecs.storage && <li>STORAGE: {recSpecs.storage}</li>}
                </ul>
              </div>
            </div>
          </section>
          <section id="reviews" className="bg-surface-container-lowest pixel-border p-gutter">
            <div className="bg-surface text-primary-container border-b-2 border-primary-container -mx-gutter -mt-gutter mb-gutter px-gutter py-2 font-label-mono text-label-mono uppercase">
              COMM_LINK_ESTABLISHED // USER_FEEDBACK
            </div>
            
            <div className="mb-6 flex flex-wrap gap-4">
              <div className="w-10 h-10 bg-surface pixel-border flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-on-surface-variant">face</span>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-on-surface-variant text-[11px] font-label-mono uppercase">RATING:</span>
                  <select 
                    value={reviewRating} 
                    onChange={e => setReviewRating(Number(e.target.value))}
                    className="bg-surface border border-outline-variant text-primary-container text-[11px] p-1 pixel-border focus:outline-none font-label-mono uppercase"
                  >
                    <option value="5">5 - OVERWHELMINGLY_POSITIVE</option>
                    <option value="4">4 - POSITIVE</option>
                    <option value="3">3 - MIXED</option>
                    <option value="2">2 - NEGATIVE</option>
                    <option value="1">1 - OVERWHELMINGLY_NEGATIVE</option>
                  </select>
                </div>
                <textarea 
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  disabled={reviewSubmitting}
                  className="w-full bg-surface pixel-border border-outline-variant p-2 font-label-mono text-primary focus:border-primary-container focus:ring-0 resize-none h-20 placeholder-on-surface-variant" 
                  placeholder="&gt; ENTER_TRANSMISSION..."
                />
                <button 
                  onClick={handleSubmitReview}
                  disabled={reviewSubmitting}
                  className="self-end bg-surface-variant text-on-surface font-label-mono text-label-mono px-4 py-2 pixel-border-hover uppercase disabled:opacity-50"
                >
                  {reviewSubmitting ? 'TRANSMITTING...' : 'SEND_DATA'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {reviews.map(review => (
                <div key={review.id} className="bg-surface pixel-border p-4">
                  <div className="flex items-center justify-between mb-2 border-b border-outline-variant pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-surface-variant pixel-border flex items-center justify-center">
                         <span className="material-symbols-outlined text-[12px]">person</span>
                      </div>
                      <span className="text-[11px] font-label-mono text-secondary-container uppercase">{review.author?.username || 'ANONYMOUS'}</span>
                    </div>
                    <div className="text-[11px] font-label-mono text-primary-container flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">star</span>
                      {review.rating}/5
                    </div>
                  </div>
                  <div className="text-[12px] font-body-sm text-on-surface leading-relaxed">
                    {review.body}
                  </div>
                </div>
              ))}
              {reviews.length === 0 && (
                <div className="text-center font-label-mono text-on-surface-variant text-[11px] py-4 uppercase">NO_TRANSMISSIONS_FOUND</div>
              )}
            </div>
          </section>
        </div>
        <div className="flex flex-col md:flex-row lg:flex-col gap-6 font-label-mono">
          <div className="terminal-bg pixel-border p-4 flex-1 min-w-[240px]">
            <div className="text-[11px] text-on-surface-variant mb-4 uppercase">Friend Activity</div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-surface-variant pixel-border flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px]">person</span>
              </div>
              <div className="text-[11px]">
                <div className="text-on-surface">CYBER_PUNK_99</div>
                <div className="text-primary-container">Currently Playing</div>
              </div>
            </div>
          </div>
          <div className="terminal-bg pixel-border p-4 space-y-4 flex-1 min-w-[240px]">
            <div className="border-t border-outline-variant pt-4">
              <div className="text-[11px] text-on-surface-variant mb-2 uppercase">Tags</div>
              <div className="flex flex-wrap gap-2">
                {game.tags && game.tags.length > 0 ? (
                  game.tags.map(tag => (
                    <span key={tag} className="bg-surface px-2 py-1 text-[10px] text-tertiary-container pixel-border uppercase">{tag}</span>
                  ))
                ) : (
                  <span className="text-[10px] text-on-surface-variant font-label-mono uppercase">NO_TAGS_FOUND</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

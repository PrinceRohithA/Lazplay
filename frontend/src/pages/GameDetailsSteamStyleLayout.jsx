import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { games as gamesApi, payments } from '../api';
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
  
  const handlePlayNow = async () => {
      if (!gameId) return;
      setLoading(true);
      try {
          const res = await gamesApi.launchManifest(gameId);
          setLaunchData(res.data);
          setPlayingGame(true);
          setPlayingTrailer(false);
          try {
            const startRes = await gamesApi.playStart(gameId);
            setPlaySessionId(startRes.data?.sessionId || null);
          } catch (err) {
            console.warn('Play start tracking failed', err);
          }
      } catch (err) {
          setError(err.message || 'FAILED_TO_LOAD_LAUNCH_MANIFEST');
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
    }
  };

  // Ensure tracking stops on unmount
  useEffect(() => {
    return () => {
      if (playSessionId) {
        gamesApi.playEnd(gameId, { sessionId: playSessionId }).catch(() => {});
      }
    };
  }, [playSessionId, gameId]);

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
        <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-gutter bg-surface-container-low pixel-border p-2">
        {/*  Left: Main Media  */}
        <div className="relative aspect-video xl:h-[450px] overflow-hidden bg-black pixel-border group">
          {playingGame && launchData ? (
            <div className="w-full h-full relative">
                <iframe 
                    src={launchData.entrypointUrl} 
                    className="w-full h-full border-none"
                    title={game.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                />
                <button 
                  onClick={handleStopPlay}
                    className="absolute top-4 right-4 bg-error text-on-error p-2 pixel-border hover:brightness-110 transition-all z-10 opacity-0 group-hover:opacity-100"
                    title="EXIT_RUNTIME"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>
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
        <div className="flex flex-col gap-4 p-4 font-label-mono text-label-mono">
          <h1 className="font-headline-lg text-headline-lg text-primary-container uppercase tracking-tighter drop-shadow-[0_0_8px_rgba(57,255,20,0.6)]">{game.title}</h1>
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="grid grid-cols-[100px_1fr] gap-y-2 text-[11px] uppercase">
              <span className="text-on-surface-variant">RECENT_REVIEWS:</span>
              <span className="text-primary-container">OVERWHELMINGLY_POSITIVE</span>
              <span className="text-on-surface-variant">RELEASE_DATE:</span>
              <span className="text-on-surface">{game.releaseDate || new Date(game.createdAt).toLocaleDateString()}</span>
              <span className="text-on-surface-variant">DEVELOPER:</span>
              <span className="text-secondary-container">{game.developer?.displayName || 'UNKNOWN_DEV'}</span>
              <span className="text-on-surface-variant">PUBLISHER:</span>
              <span className="text-secondary-container">{game.publisher || 'LAZPLAY_STUDIOS'}</span>
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
            {(game.isOwned || (game.priceType === 'FREE' && game.platforms?.includes('WEB'))) ? (
              <button 
                onClick={game.priceType === 'FREE' && game.platforms?.includes('WEB') ? handlePlayNow : undefined}
                className="w-full bg-primary-container text-on-primary-container py-3 pixel-border neon-glow hover:bg-primary-fixed transition-all uppercase flex justify-center items-center gap-2 font-bold disabled:opacity-50"
              >
                <span className="material-symbols-outlined">play_circle</span>
                {game.priceType === 'FREE' && game.platforms?.includes('WEB') ? 'PLAY_IN_BROWSER' : 'PLAY_NOW'}
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
      <nav className="flex bg-surface-container-high pixel-border font-label-mono text-[11px] uppercase">
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
                <div className="grid grid-cols-2 gap-4">
                  {screenshots.map(s => (
                    <div key={s.id} className="pixel-border overflow-hidden bg-black aspect-video">
                      <img src={s.url} alt="Screenshot" className="w-full h-full object-cover hover:scale-105 transition-transform" />
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
            
            <div className="mb-6 flex gap-4">
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
        <div className="space-y-6 font-label-mono">
          <div className="terminal-bg pixel-border p-4">
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
          <div className="terminal-bg pixel-border p-4 space-y-4">
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

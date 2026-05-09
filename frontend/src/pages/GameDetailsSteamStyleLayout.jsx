import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { games as gamesApi, payments } from '../api';
import RazorpayCheckout from '../components/RazorpayCheckout';

export default function GameDetailsSteamStyleLayout() {
  const [params] = useSearchParams();
  const gameId = params.get('id');
  const [game, setGame] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (!gameId) { setLoading(false); return; }
    Promise.all([
      gamesApi.get(gameId).then(r => r.data).catch(() => null),
      gamesApi.media(gameId).then(r => r.data).catch(() => []),
    ]).then(([g, m]) => { setGame(g); setMedia(m); setLoading(false); });
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
        <div className="relative aspect-video xl:h-[450px] overflow-hidden bg-black pixel-border">
          <img alt={game.title} className="w-full h-full object-cover opacity-80" src={game.bannerUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuC9KrQ5YpZIImJ1Kd2RBfr-IeRwo5ttSkse1x9Q71QkonTieCCBK-ZICf1E_3LD5-X4q63if0DYzWnYTFcwoRStnzJtmrdqfhsIouTLhtzkMmCzw0y_69VlGf5INbG4nK77O9oKMw9FDOaqKgWuh-yDPS9BKfJsFzcuP9Ueuv1CFIMfot1RHyyIqegrc4toawTb6VxlS0VnqAc-XiUBOixMQ6hvHARoZbpH1Dlt9IHWrRbvaJaqI_mte6dOhR4-5vmnF9sG75TI6lXu"}/>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-surface/80 p-4 pixel-border">
              <span className="material-symbols-outlined text-primary-container text-6xl">play_circle</span>
            </div>
          </div>
        </div>
        {/*  Right: Game Info Box  */}
        <div className="flex flex-col gap-4 p-4 font-label-mono text-label-mono">
          <h1 className="font-headline-lg text-headline-lg text-primary-container uppercase tracking-tighter drop-shadow-[0_0_8px_rgba(57,255,20,0.6)]">{game.title}</h1>
          <div className="flex-1 overflow-y-auto space-y-4">
            <p className="text-on-surface text-[14px] leading-relaxed">
              {game.description}
            </p>
            <div className="grid grid-cols-[100px_1fr] gap-y-2 text-[11px] uppercase">
              <span className="text-on-surface-variant">RECENT_REVIEWS:</span>
              <span className="text-primary-container">OVERWHELMINGLY_POSITIVE</span>
              <span className="text-on-surface-variant">RELEASE_DATE:</span>
              <span className="text-on-surface">{new Date(game.createdAt).toLocaleDateString()}</span>
              <span className="text-on-surface-variant">DEVELOPER:</span>
              <span className="text-secondary-container">{game.developer?.displayName || 'UNKNOWN_DEV'}</span>
              <span className="text-on-surface-variant">PUBLISHER:</span>
              <span className="text-secondary-container">LAZPLAY_STUDIOS</span>
            </div>
          </div>
          <div className="pt-4 border-t border-outline-variant">
            <div className="flex flex-wrap gap-1 mb-4">
              {game.genres?.map(g => (
                <span key={g} className="bg-surface-variant px-1 text-[10px] text-tertiary-container pixel-border uppercase">{g}</span>
              ))}
            </div>
            {game.isOwned ? (
              <Link to={`/launch/${game.id}`} className="w-full bg-primary-container text-on-primary-container py-3 pixel-border neon-glow hover:bg-primary-fixed transition-all uppercase flex justify-center items-center gap-2 font-bold">
                <span className="material-symbols-outlined">play_circle</span>
                PLAY NOW
              </Link>
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
        <a className="px-6 py-2 bg-primary-container text-on-primary-container font-bold" href="#">Overview</a>
        <a className="px-6 py-2 text-on-surface-variant hover:text-primary transition-colors" href="#">Reviews</a>
        <a className="px-6 py-2 text-on-surface-variant hover:text-primary transition-colors" href="#">Discussions</a>
        <a className="px-6 py-2 text-on-surface-variant hover:text-primary transition-colors" href="#">Screenshots</a>
        <a className="px-6 py-2 text-on-surface-variant hover:text-primary transition-colors" href="#">News</a>
      </nav>

      {/*  Main Content Area: Two Column  */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/*  Left Column: Detailed Content  */}
        <div className="space-y-6">
          <section className="bg-surface-container pixel-border p-gutter">
            <div className="bg-surface-variant text-on-surface border-b-2 border-outline-variant -mx-gutter -mt-gutter mb-gutter px-gutter py-2 font-label-mono text-label-mono">
              &gt;_ README.TXT
            </div>
            <div className="font-body-md text-on-surface space-y-4">
              <p><span className="text-primary-container font-bold cursor-blink">&gt; </span>Welcome to the grid, runner. Cyber Quest is the premier 16-bit action platformer hosted exclusively on LAZPLAY servers.</p>
              <p>Equip a variety of energy weapons, upgrade your cybernetic enhancements, and face off against brutal syndicate bosses.</p>
            </div>
          </section>
          <section className="bg-surface-container pixel-border p-gutter font-label-mono">
            <div className="text-on-surface-variant border-b border-outline-variant pb-2 mb-4 text-[12px] uppercase">System Requirements</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[11px]">
              <div>
                <div className="text-primary-container mb-2">MINIMUM_SPECS:</div>
                <ul className="space-y-1 text-on-surface-variant">
                  <li>OS: SYSTEM_OS V_1.0.4</li>
                  <li>PROC: 8-BIT ZILOG Z80</li>
                  <li>MEMORY: 64 KB RAM</li>
                </ul>
              </div>
              <div>
                <div className="text-secondary-container mb-2">RECOMMENDED_SPECS:</div>
                <ul className="space-y-1 text-on-surface-variant">
                  <li>OS: SYSTEM_OS V_1.0.4+</li>
                  <li>PROC: 16-BIT MOTOROLA 68000</li>
                  <li>MEMORY: 128 KB RAM</li>
                </ul>
              </div>
            </div>
          </section>
          <section className="bg-surface-container-lowest pixel-border p-gutter">
            <div className="bg-surface text-primary-container border-b-2 border-primary-container -mx-gutter -mt-gutter mb-gutter px-gutter py-2 font-label-mono text-label-mono uppercase">
              COMM_LINK_ESTABLISHED // USER_FEEDBACK
            </div>
            <div className="mb-6 flex gap-4">
              <div className="w-10 h-10 bg-surface pixel-border flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-on-surface-variant">face</span>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <textarea className="w-full bg-surface pixel-border border-outline-variant p-2 font-label-mono text-primary focus:border-primary-container focus:ring-0 resize-none h-20 placeholder-on-surface-variant" placeholder="&gt; ENTER_TRANSMISSION..."></textarea>
                <button className="self-end bg-surface-variant text-on-surface font-label-mono text-label-mono px-4 py-2 pixel-border-hover uppercase">SEND_DATA</button>
              </div>
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
                <span className="bg-surface px-2 py-1 text-[10px] text-tertiary-container pixel-border uppercase">Platformer</span>
                <span className="bg-surface px-2 py-1 text-[10px] text-tertiary-container pixel-border uppercase">Cyberpunk</span>
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

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { admin as adminApi, auth as authApi } from '../api';
import DOMPurify from 'dompurify';

export default function AdminMainframe() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({});
  const [nodes, setNodes] = useState([]);
  const [instances, setInstances] = useState([]);
  const [pendingGames, setPendingGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingGame, setReviewingGame] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const me = await authApi.me();
        setUser(me.data);

        if (!me.data.roles.includes('ADMIN')) {
          navigate('/');
          return;
        }

        const [analyticsRes, nodesRes, instancesRes, pendingGamesRes] = await Promise.all([
          adminApi.dashboard(),
          adminApi.listServers(),
          adminApi.listInstances({ limit: 10 }),
          adminApi.listGames({ status: 'PENDING_REVIEW' })
        ]);
        
        setStats(analyticsRes.data || {});
        setNodes(nodesRes.data || []);
        setInstances(instancesRes.data || []);
        setPendingGames(pendingGamesRes.data || []);
      } catch (err) {
        console.error('Admin data fetch failed', err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [navigate]);

  const handleUpdateGameStatus = async (gameId, status) => {
    try {
        await adminApi.updateGameStatus(gameId, { status });
        setPendingGames(prev => prev.filter(g => g.id !== gameId));
        setReviewingGame(null);
        // Refresh stats
        const analyticsRes = await adminApi.dashboard();
        setStats(analyticsRes.data || {});
    } catch (err) {
        alert(`Failed to update status: ${err.message}`);
    }
  };

  const openReviewModal = async (gameId) => {
      try {
          const res = await adminApi.getGame(gameId);
          setReviewingGame(res.data);
      } catch (err) {
          alert(`Failed to fetch game details: ${err.message}`);
      }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center font-label-mono text-primary animate-pulse">
        [ ACCESSING_CORE_MAINFRAME... ]
      </div>
    );
  }

  return (
    <div className="p-margin flex-1 flex flex-col gap-margin pb-20">
      {/*  Page Header  */}
      <div className="flex justify-between items-end border-b-4 border-outline-variant pb-2">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface uppercase tracking-tighter">CMD_CENTER</h1>
          <p className="font-label-mono text-label-mono text-tertiary-fixed mt-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-tertiary-fixed inline-block animate-pulse"></span>
            GLOBAL OVERRIDE PROTOCOLS ACTIVE
          </p>
        </div>
        <div className="font-label-mono text-label-mono text-on-surface-variant text-right">
          LAZPLAY_CORE: ONLINE<br />
          NODE_COUNT: {nodes.length}
        </div>
      </div>

      {/*  Bento Grid Layout  */}
      <div className="grid grid-cols-12 gap-4">
        {/*  System Stats Summary  */}
        <div className="col-span-12 xl:col-span-8 flex flex-col gap-4">
          <div className="border-2 border-outline-variant bg-surface-container-low flex flex-col h-full hover:border-primary-container transition-colors duration-300">
            <div className="bg-surface-variant text-on-surface-variant font-label-mono text-label-mono px-2 py-1 uppercase border-b-2 border-outline-variant flex justify-between items-center">
              <span>Grid_Statistics</span>
              <span className="material-symbols-outlined text-[16px]">monitoring</span>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-6 flex-1">
              <div className="flex flex-col gap-1 border-l-2 border-primary-container pl-3">
                <span className="font-label-caps text-[10px] text-on-surface-variant">TOTAL_USERS</span>
                <span className="font-headline-md text-primary-container">{stats.stats?.users || 0}</span>
              </div>
              <div className="flex flex-col gap-1 border-l-2 border-tertiary-fixed pl-3">
                <span className="font-label-caps text-[10px] text-on-surface-variant">ACTIVE_GAMES</span>
                <span className="font-headline-md text-tertiary-fixed">{stats.stats?.games || 0}</span>
              </div>
              <div className="flex flex-col gap-1 border-l-2 border-secondary-fixed pl-3">
                <span className="font-label-caps text-[10px] text-on-surface-variant">DEPLOYMENTS</span>
                <span className="font-headline-md text-secondary-fixed">{stats.stats?.deployments || 0}</span>
              </div>
              <div className="flex flex-col gap-1 border-l-2 border-error pl-3">
                <span className="font-label-caps text-[10px] text-on-surface-variant">REVENUE</span>
                <span className="font-headline-md text-error">₹{((stats.stats?.totalRevenue || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex flex-col gap-1 border-l-2 border-primary-container pl-3">
                <span className="font-label-caps text-[10px] text-on-surface-variant">CURRENT_PLAYERS</span>
                <span className="font-headline-md text-primary-container">{stats.stats?.currentPlayers || 0}</span>
              </div>
              <div className="flex flex-col gap-1 border-l-2 border-tertiary-fixed pl-3">
                <span className="font-label-caps text-[10px] text-on-surface-variant">TOTAL_PLAYERS</span>
                <span className="font-headline-md text-tertiary-fixed">{stats.stats?.totalPlayers || 0}</span>
              </div>
            </div>
          </div>

          {/* Pending Reviews Section */}
          <div className="border-2 border-primary-container/30 bg-surface-container-low flex flex-col hover:border-primary-container transition-colors duration-300">
            <div className="bg-primary-container/10 text-primary-container font-label-mono text-label-mono px-2 py-1 uppercase border-b-2 border-primary-container/20 flex justify-between items-center">
              <span>Pending_Game_Reviews</span>
              <span className="material-symbols-outlined text-[16px] animate-pulse">new_releases</span>
            </div>
            <div className="p-2 overflow-x-auto">
              <table className="w-full text-left border-collapse font-label-mono text-label-mono">
                <thead>
                  <tr className="border-b border-outline-variant text-on-surface-variant">
                    <th className="p-2 uppercase text-[10px]">GAME_TITLE</th>
                    <th className="p-2 uppercase text-[10px]">DEVELOPER</th>
                    <th className="p-2 uppercase text-[10px]">SUBMITTED</th>
                    <th className="p-2 uppercase text-[10px] text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingGames.map(game => (
                    <tr key={game.id} className="border-b border-outline-variant/30 hover:bg-surface-bright transition-colors group">
                      <td className="p-2 text-primary-container">{game.title}</td>
                      <td className="p-2 text-on-surface-variant">{game.developer?.displayName || 'Unknown'}</td>
                      <td className="p-2 text-[10px]">{new Date(game.submittedAt || game.updatedAt).toLocaleDateString()}</td>
                      <td className="p-2 text-right">
                        <button onClick={() => openReviewModal(game.id)} className="bg-primary-container text-on-primary-container px-3 py-1 hover:brightness-110 transition-all text-[10px]">REVIEW_ASSETS</button>
                      </td>
                    </tr>
                  ))}
                  {pendingGames.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-on-surface-variant opacity-50 uppercase text-[10px]">
                        NO_PENDING_REVIEWS_IN_BUFFER
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-2 border-outline-variant bg-surface-container-low flex flex-col flex-1 hover:border-tertiary-fixed transition-colors duration-300">
            <div className="bg-surface-variant text-on-surface-variant font-label-mono text-label-mono px-2 py-1 uppercase border-b-2 border-outline-variant flex justify-between items-center">
              <span>Active_Server_Nodes</span>
              <span className="material-symbols-outlined text-[16px]">dns</span>
            </div>
            <div className="p-2 overflow-x-auto">
              <table className="w-full text-left border-collapse font-label-mono text-label-mono">
                <thead>
                  <tr className="border-b-2 border-outline-variant text-on-surface-variant">
                    <th className="p-2 uppercase text-[10px]">NODE_ID</th>
                    <th className="p-2 uppercase text-[10px]">REGION</th>
                    <th className="p-2 uppercase text-[10px]">STATUS</th>
                    <th className="p-2 uppercase text-[10px] text-right">METRICS</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.map(node => (
                    <tr key={node.id} className="border-b border-outline-variant/50 hover:bg-surface-bright transition-colors">
                      <td className="p-2 text-on-surface">{node.id}</td>
                      <td className="p-2 text-primary-container">{node.region}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 border text-[10px] ${
                          node.status === 'HEALTHY' ? 'bg-primary-fixed-dim text-on-primary-fixed border-primary-fixed' : 'bg-error-container text-on-error-container border-error'
                        }`}>
                          {node.status}
                        </span>
                      </td>
                      <td className="p-2 text-right text-[10px] text-on-surface-variant">
                        CPU: {node.cpuUsage || 0}% | RAM: {node.memoryUsage || 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/*  Terminal Feed & Leaderboards  */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-4">
          {/* Top Performance Sections */}
          <div className="border-2 border-outline-variant bg-surface-container-low flex flex-col hover:border-secondary-fixed transition-colors duration-300">
            <div className="bg-secondary-fixed/10 text-secondary-fixed font-label-mono text-label-mono px-2 py-1 uppercase border-b-2 border-secondary-fixed/20 flex justify-between items-center">
              <span>Top_Revenue_Games</span>
              <span className="material-symbols-outlined text-[16px]">stars</span>
            </div>
            <div className="p-2">
              <table className="w-full text-left border-collapse font-label-mono text-[10px]">
                <tbody>
                  {(stats.topGames || []).map((g, i) => (
                    <tr key={g.id} className="border-b border-outline-variant/30 hover:bg-surface-bright transition-colors">
                      <td className="p-2 w-8 opacity-50">#0{i+1}</td>
                      <td className="p-2 text-on-surface font-bold">{g.title}</td>
                      <td className="p-2 text-right text-error font-bold">₹{(g.revenue / 100).toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!stats.topGames || stats.topGames.length === 0) && (
                    <tr><td className="p-4 text-center opacity-50 italic">NO_DATA_AVAILABLE</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-2 border-outline-variant bg-surface-container-low flex flex-col hover:border-tertiary-fixed transition-colors duration-300">
            <div className="bg-tertiary-fixed/10 text-tertiary-fixed font-label-mono text-label-mono px-2 py-1 uppercase border-b-2 border-tertiary-fixed/20 flex justify-between items-center">
              <span>Top_Spending_Users</span>
              <span className="material-symbols-outlined text-[16px]">person_celebrate</span>
            </div>
            <div className="p-2">
              <table className="w-full text-left border-collapse font-label-mono text-[10px]">
                <tbody>
                  {(stats.topUsers || []).map((u, i) => (
                    <tr key={u.id} className="border-b border-outline-variant/30 hover:bg-surface-bright transition-colors">
                      <td className="p-2 w-8 opacity-50">#0{i+1}</td>
                      <td className="p-2 text-on-surface font-bold">{u.username}</td>
                      <td className="p-2 text-right text-tertiary-fixed font-bold">₹{(u.totalSpent / 100).toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!stats.topUsers || stats.topUsers.length === 0) && (
                    <tr><td className="p-4 text-center opacity-50 italic">NO_DATA_AVAILABLE</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/*  Terminal Feed  */}
          <div className="border-2 border-outline-variant bg-[#050505] flex flex-col h-[400px] xl:h-auto hover:border-primary-container transition-colors duration-300 relative overflow-hidden flex-1">
            <div className="bg-surface-variant text-on-surface-variant font-label-mono text-label-mono px-2 py-1 uppercase border-b-2 border-outline-variant flex justify-between items-center">
              <span>Terminal_Feed</span>
              <div className="flex gap-2">
                <span className="w-2 h-2 bg-primary-container rounded-full animate-flicker"></span>
                <span className="w-2 h-2 bg-error rounded-full"></span>
              </div>
            </div>
            <div className="p-4 font-label-mono text-[10px] text-primary-container flex-1 overflow-y-auto leading-relaxed flex flex-col gap-1">
              <div><span className="text-on-surface-variant">[{new Date().toLocaleTimeString()}]</span> &gt; INITIALIZING_ADMIN_MAINFRAME... OK</div>
              <div><span className="text-on-surface-variant">[{new Date().toLocaleTimeString()}]</span> &gt; SYNCING_WITH_CORE_DATABASE... OK</div>
              <div><span className="text-on-surface-variant">[{new Date().toLocaleTimeString()}]</span> &gt; FETCHING_GRID_METRICS... OK</div>
              <div className="text-tertiary-fixed"><span className="text-on-surface-variant">[{new Date().toLocaleTimeString()}]</span> &gt; DATA_LINK_ESTABLISHED</div>
              <div className="mt-4 border-t border-outline-variant/30 pt-2 opacity-50">
                -- LOGGING_ACTIVE --
                {instances.length > 0 && <div>&gt; {instances.length} ACTIVE_INSTANCES_DETECTED</div>}
                {nodes.length > 0 && <div>&gt; {nodes.length} SERVER_NODES_ONLINE</div>}
                {pendingGames.length > 0 && <div className="text-error">&gt; ATTENTION: {pendingGames.length} PROJECTS_AWAITING_APPROVAL</div>}
                &gt; MONITORING_ALL_TRAFFIC...
              </div>
              <div className="mt-auto pt-4 flex gap-2">
                <span className="text-primary-container animate-pulse">&gt;</span>
                <span className="w-2 h-4 bg-primary-container animate-blink"></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {reviewingGame && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-surface-container-low border-2 border-primary-container max-w-4xl w-full max-h-[90vh] overflow-y-auto pixel-border-active flex flex-col">
                  <div className="bg-primary-container text-on-primary-container p-4 flex justify-between items-center">
                      <h2 className="font-headline-sm uppercase tracking-tighter">PROJECT_REVIEW: {reviewingGame.title}</h2>
                      <button onClick={() => setReviewingGame(null)} className="hover:rotate-90 transition-transform"><span className="material-symbols-outlined">close</span></button>
                  </div>
                  <div className="p-6 grid grid-cols-12 gap-6">
                      <div className="col-span-12 md:col-span-8 space-y-6">
                          <div className="aspect-video bg-black border border-outline-variant overflow-hidden">
                              {reviewingGame.media?.length > 0 && (
                                  <img src={reviewingGame.media[0].url} className="w-full h-full object-cover" alt="Review" />
                              )}
                          </div>
                          <div className="prose prose-invert max-w-none font-label-mono text-[12px] opacity-80" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reviewingGame.description) }}></div>
                      </div>
                      <div className="col-span-12 md:col-span-4 space-y-4">
                          <div className="bg-surface-container-high p-4 border border-outline-variant">
                              <h3 className="font-label-mono text-[10px] text-primary-container mb-2 uppercase">BUILD_STATUS</h3>
                              <div className="font-label-mono text-[11px] space-y-1">
                                  <p>_ID: {reviewingGame.latestBuildId || 'NONE'}</p>
                                  <p>_PLATFORMS: {reviewingGame.platforms?.join(', ')}</p>
                                  <p>_PRICE: ₹{(reviewingGame.price / 100).toFixed(2)}</p>
                              </div>
                          </div>
                          <div className="bg-surface-container-high p-4 border border-outline-variant">
                              <h3 className="font-label-mono text-[10px] text-secondary-container mb-2 uppercase">DEVELOPER_INFO</h3>
                              <div className="font-label-mono text-[11px] space-y-1">
                                  <p>_NAME: {reviewingGame.developer?.displayName}</p>
                                  <p>_VERIFIED: {reviewingGame.developer?.verificationStatus}</p>
                              </div>
                          </div>
                          <div className="flex flex-col gap-2 pt-4">
                              <button onClick={() => handleUpdateGameStatus(reviewingGame.id, 'PUBLISHED')} className="w-full bg-primary-container text-on-primary-container py-3 font-label-mono uppercase hover:brightness-110 transition-all">APPROVE_AND_PUBLISH</button>
                              <button onClick={() => handleUpdateGameStatus(reviewingGame.id, 'DRAFT')} className="w-full border border-error text-error py-3 font-label-mono uppercase hover:bg-error/10 transition-all">REJECT_TO_DRAFT</button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

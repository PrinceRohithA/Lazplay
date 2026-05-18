import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { admin as adminApi, auth as authApi } from '../api';
import DOMPurify from 'dompurify';

export default function AdminMainframe() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState({});
  const [terminalLogs, setTerminalLogs] = useState([]);

  // Modal / Review States
  const [reviewingGame, setReviewingGame] = useState(null);
  const [selectedUserForBan, setSelectedUserForBan] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [refundNote, setRefundNote] = useState('');

  // Tab: Overview Data
  const [nodes, setNodes] = useState([]);
  const [pendingGames, setPendingGames] = useState([]);

  // Tab: Users Data
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [updatingUserRole, setUpdatingUserRole] = useState(null);

  // Tab: Games Moderation Data
  const [games, setGames] = useState([]);
  const [gameSearch, setGameSearch] = useState('');
  const [gameFilterStatus, setGameFilterStatus] = useState('');
  const [gamePage, setGamePage] = useState(1);
  const [gameTotalPages, setGameTotalPages] = useState(1);

  // Tab: Infrastructure Data
  const [instances, setInstances] = useState([]);
  const [instancePage, setInstancePage] = useState(1);
  const [instanceTotalPages, setInstanceTotalPages] = useState(1);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [newNodeId, setNewNodeId] = useState('');
  const [newNodeRegion, setNewNodeRegion] = useState('');

  // Tab: Financials Data
  const [payments, setPayments] = useState([]);
  const [refunds, setRefunds] = useState([]);

  // Tab: Audit Logs Data
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);

  const addLog = useCallback((msg, type = 'info') => {
    setTerminalLogs(prev => [
      ...prev,
      { time: new Date().toLocaleTimeString(), msg, type }
    ].slice(-25)); // Keep last 25 logs
  }, []);

  // Fetch initial profile & stats
  useEffect(() => {
    async function initMainframe() {
      try {
        const me = await authApi.me();
        setUser(me.data);

        if (!me.data.roles.includes('ADMIN')) {
          navigate('/');
          return;
        }

        addLog('ACCESSING_CORE_MAINFRAME... SUCCESS', 'success');
        addLog('SYNCING_WITH_CORE_DATABASE... SUCCESS', 'success');
        
        // Fetch dashboard stats
        const statsRes = await adminApi.dashboard();
        setGlobalStats(statsRes.data || {});
        addLog('SYSTEM_METRICS_SYNCED', 'success');
      } catch (err) {
        console.error('Admin init failed', err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    }
    initMainframe();
  }, [navigate, addLog]);

  // Handle Tab changes and loading specific tab datasets
  useEffect(() => {
    if (!user) return;
    
    async function loadTabDetails() {
      try {
        if (activeTab === 'overview') {
          const [nodesRes, pendingGamesRes] = await Promise.all([
            adminApi.listServers(),
            adminApi.listGames({ status: 'PENDING_REVIEW' })
          ]);
          setNodes(nodesRes.data || []);
          setPendingGames(pendingGamesRes.data || []);
        } 
        
        else if (activeTab === 'users') {
          const usersRes = await adminApi.listUsers({ search: userSearch, page: userPage, limit: 10 });
          setUsers(usersRes.data || []);
          if (usersRes.pagination) {
            setUserTotalPages(usersRes.pagination.totalPages || 1);
          }
        } 
        
        else if (activeTab === 'games') {
          const gamesRes = await adminApi.listGames({ 
            search: gameSearch, 
            status: gameFilterStatus || undefined,
            page: gamePage, 
            limit: 10 
          });
          setGames(gamesRes.data || []);
          if (gamesRes.pagination) {
            setGameTotalPages(gamesRes.pagination.totalPages || 1);
          }
        } 
        
        else if (activeTab === 'infrastructure') {
          const [nodesRes, instancesRes] = await Promise.all([
            adminApi.listServers(),
            adminApi.listInstances({ page: instancePage, limit: 8 })
          ]);
          setNodes(nodesRes.data || []);
          setInstances(instancesRes.data || []);
          if (instancesRes.pagination) {
            setInstanceTotalPages(instancesRes.pagination.totalPages || 1);
          }
        } 
        
        else if (activeTab === 'financials') {
          const [paymentsRes, refundsRes] = await Promise.all([
            adminApi.listPayments(),
            adminApi.listRefunds()
          ]);
          setPayments(paymentsRes.data || []);
          setRefunds(refundsRes.data || []);
        } 
        
        else if (activeTab === 'audit') {
          const logsRes = await adminApi.getAuditLogs({ page: auditPage, limit: 15 });
          setAuditLogs(logsRes.data || []);
          if (logsRes.pagination) {
            setAuditTotalPages(logsRes.pagination.totalPages || 1);
          }
        }
      } catch (err) {
        addLog(`DATA_FETCH_FAILED: ${err.message}`, 'error');
      }
    }

    loadTabDetails();
  }, [activeTab, user, userSearch, userPage, gameSearch, gameFilterStatus, gamePage, instancePage, auditPage, addLog]);

  // Actions: User Management
  const handleUpdateUserRole = async (userId, roles) => {
    try {
      await adminApi.updateUserRole(userId, roles);
      addLog(`USER_${userId}_ROLE_UPDATED_TO_${roles.join('_')}`, 'success');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, roles } : u));
      setUpdatingUserRole(null);
    } catch (err) {
      alert(`Role update failed: ${err.message}`);
    }
  };

  const handleUpdateUserStatus = async (userId, status) => {
    try {
      await adminApi.updateUserStatus(userId, status);
      addLog(`USER_${userId}_STATUS_CHANGED_TO_${status}`, 'success');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUserForBan) return;
    try {
      await adminApi.banUser(selectedUserForBan.id, { reason: banReason });
      addLog(`USER_${selectedUserForBan.username}_BANNED_SUCCESS`, 'success');
      setUsers(prev => prev.map(u => u.id === selectedUserForBan.id ? { ...u, status: 'BANNED' } : u));
      setSelectedUserForBan(null);
      setBanReason('');
    } catch (err) {
      alert(`Ban failed: ${err.message}`);
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await adminApi.unbanUser(userId);
      addLog(`USER_${userId}_UNBANNED`, 'success');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'ACTIVE' } : u));
    } catch (err) {
      alert(`Unban failed: ${err.message}`);
    }
  };

  // Actions: Game Moderation
  const handleUpdateGameStatus = async (gameId, status) => {
    try {
      await adminApi.updateGameStatus(gameId, { status });
      addLog(`GAME_${gameId}_STATUS_SET_TO_${status}`, 'success');
      setPendingGames(prev => prev.filter(g => g.id !== gameId));
      setGames(prev => prev.map(g => g.id === gameId ? { ...g, status } : g));
      setReviewingGame(null);
      // Refresh stats
      const statsRes = await adminApi.dashboard();
      setGlobalStats(statsRes.data || {});
    } catch (err) {
      alert(`Game status update failed: ${err.message}`);
    }
  };

  const handleFeatureGame = async (gameId, isFeatured) => {
    try {
      if (isFeatured) {
        await adminApi.unfeatureGame(gameId);
        addLog(`GAME_${gameId}_REMOVED_FROM_FEATURED`, 'success');
      } else {
        await adminApi.featureGame(gameId);
        addLog(`GAME_${gameId}_SET_AS_FEATURED`, 'success');
      }
      setGames(prev => prev.map(g => g.id === gameId ? { ...g, featured: !isFeatured } : g));
    } catch (err) {
      alert(`Failed to update feature state: ${err.message}`);
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

  // Actions: Infrastructure / Server Nodes
  const handleAddServer = async (e) => {
    e.preventDefault();
    if (!newNodeId || !newNodeRegion) return;
    try {
      await adminApi.addServer({ id: newNodeId, region: newNodeRegion });
      addLog(`SERVER_NODE_${newNodeId}_ADDED_IN_${newNodeRegion}`, 'success');
      const nodesRes = await adminApi.listServers();
      setNodes(nodesRes.data || []);
      setNewNodeId('');
      setNewNodeRegion('');
      setShowAddNodeModal(false);
    } catch (err) {
      alert(`Failed to add server node: ${err.message}`);
    }
  };

  const handleToggleNodeStatus = async (nodeId, currentStatus) => {
    const nextStatus = currentStatus === 'HEALTHY' ? 'OFFLINE' : 'HEALTHY';
    try {
      await adminApi.updateServer(nodeId, { status: nextStatus });
      addLog(`SERVER_NODE_${nodeId}_STATUS_CHANGED_TO_${nextStatus}`, 'success');
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, status: nextStatus } : n));
    } catch (err) {
      alert(`Failed to update server status: ${err.message}`);
    }
  };

  const handleRemoveServer = async (nodeId) => {
    if (!confirm(`Are you sure you want to permanently decommission server node ${nodeId}?`)) return;
    try {
      await adminApi.removeServer(nodeId);
      addLog(`SERVER_NODE_${nodeId}_DECOMMISSIONED`, 'success');
      setNodes(prev => prev.filter(n => n.id !== nodeId));
    } catch (err) {
      alert(`Failed to remove server: ${err.message}`);
    }
  };

  const handleTerminateInstance = async (instanceId) => {
    if (!confirm(`Force kill instance ${instanceId}?`)) return;
    try {
      await adminApi.deleteInstance(instanceId);
      addLog(`GAME_INSTANCE_${instanceId}_TERMINATED`, 'success');
      setInstances(prev => prev.filter(inst => inst.id !== instanceId));
    } catch (err) {
      alert(`Failed to terminate instance: ${err.message}`);
    }
  };

  // Actions: Financials / Refunds
  const handleResolveRefund = async (status) => {
    if (!selectedRefund) return;
    try {
      await adminApi.updateRefund(selectedRefund.id, { status, note: refundNote });
      addLog(`REFUND_FOR_ORDER_${selectedRefund.orderId}_${status}`, 'success');
      setRefunds(prev => prev.map(ref => ref.id === selectedRefund.id ? { ...ref, status } : ref));
      setSelectedRefund(null);
      setRefundNote('');
    } catch (err) {
      alert(`Refund resolution failed: ${err.message}`);
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
    <div className="p-margin flex-1 flex flex-col gap-margin pb-20 select-none">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end border-b-4 border-outline-variant pb-3">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface uppercase tracking-tighter">CMD_CENTER</h1>
          <p className="font-label-mono text-label-mono text-tertiary-fixed mt-1 flex items-center gap-2">
            <span className="w-2 h-2 bg-tertiary-fixed inline-block animate-pulse"></span>
            GLOBAL OVERRIDE PROTOCOLS ACTIVE
          </p>
        </div>
        <div className="font-label-mono text-label-mono text-on-surface-variant md:text-right mt-2 md:mt-0 text-xs">
          LAZPLAY_CORE: ONLINE<br />
          ACTIVE_ADMIN_OPERATOR: {user?.username?.toUpperCase()} ({user?.roles?.join(', ')})
        </div>
      </div>

      {/* Futuristic Cyberpunk Multi-tab Navigation Bar */}
      <div className="flex flex-wrap gap-2 border-b border-outline-variant/30 pb-3">
        {[
          { id: 'overview', label: 'OVERVIEW', icon: 'monitoring' },
          { id: 'users', label: 'USER_DIRECTORY', icon: 'group' },
          { id: 'games', label: 'CONTENT_MODERATION', icon: 'security' },
          { id: 'infrastructure', label: 'INFRASTRUCTURE_NODES', icon: 'dns' },
          { id: 'financials', label: 'FINANCIAL_REVENUE', icon: 'payments' },
          { id: 'audit', label: 'AUDIT_TRAILS', icon: 'feed' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 font-label-mono uppercase transition-all duration-200 text-xs border flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-primary text-on-primary border-primary neon-glow'
                : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:border-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
            <span>[{tab.label}]</span>
          </button>
        ))}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 min-h-[500px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-12 gap-6">
            {/* System Stats Bento Grid */}
            <div className="col-span-12 xl:col-span-8 flex flex-col gap-6">
              <div className="border-2 border-outline-variant bg-surface-container-low flex flex-col h-full hover:border-primary transition-colors duration-300">
                <div className="bg-surface-variant text-on-surface-variant font-label-mono text-label-mono px-2 py-1 uppercase border-b border-outline-variant flex justify-between items-center">
                  <span>Grid_Statistics</span>
                  <span className="material-symbols-outlined text-[16px]">monitoring</span>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-6 flex-1">
                  <div className="flex flex-col gap-1 border-l-2 border-primary pl-3">
                    <span className="font-label-caps text-[10px] text-on-surface-variant">TOTAL_USERS</span>
                    <span className="font-headline-md text-primary font-bold">{globalStats.stats?.users || 0}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-l-2 border-tertiary-fixed pl-3">
                    <span className="font-label-caps text-[10px] text-on-surface-variant">ACTIVE_GAMES</span>
                    <span className="font-headline-md text-tertiary-fixed font-bold">{globalStats.stats?.games || 0}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-l-2 border-secondary pl-3">
                    <span className="font-label-caps text-[10px] text-on-surface-variant">DEPLOYMENTS</span>
                    <span className="font-headline-md text-secondary font-bold">{globalStats.stats?.deployments || 0}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-l-2 border-error pl-3">
                    <span className="font-label-caps text-[10px] text-on-surface-variant">REVENUE</span>
                    <span className="font-headline-md text-error font-bold">₹{((globalStats.stats?.totalRevenue || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-l-2 border-primary pl-3">
                    <span className="font-label-caps text-[10px] text-on-surface-variant">CURRENT_PLAYERS</span>
                    <span className="font-headline-md text-primary font-bold">{globalStats.stats?.currentPlayers || 0}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-l-2 border-tertiary-fixed pl-3">
                    <span className="font-label-caps text-[10px] text-on-surface-variant">TOTAL_PLAYERS</span>
                    <span className="font-headline-md text-tertiary-fixed font-bold">{globalStats.stats?.totalPlayers || 0}</span>
                  </div>
                </div>
              </div>

              {/* Pending Reviews Section */}
              <div className="border-2 border-primary/30 bg-surface-container-low flex flex-col hover:border-primary transition-colors duration-300">
                <div className="bg-primary-container/10 text-primary font-label-mono text-label-mono px-2 py-1 uppercase border-b border-primary/20 flex justify-between items-center">
                  <span>Pending_Game_Reviews</span>
                  <span className="material-symbols-outlined text-[16px] animate-pulse">new_releases</span>
                </div>
                <div className="p-2 overflow-x-auto">
                  <table className="w-full text-left border-collapse font-label-mono text-xs">
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
                          <td className="p-2 text-primary font-bold">{game.title}</td>
                          <td className="p-2 text-on-surface-variant">{game.developer?.displayName || 'Unknown'}</td>
                          <td className="p-2 text-[10px]">{new Date(game.submittedAt || game.updatedAt).toLocaleDateString()}</td>
                          <td className="p-2 text-right">
                            <button onClick={() => openReviewModal(game.id)} className="bg-primary text-on-primary px-3 py-1 hover:brightness-110 transition-all text-[10px]">REVIEW_ASSETS</button>
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

              {/* Server Nodes Mini table */}
              <div className="border-2 border-outline-variant bg-surface-container-low flex flex-col hover:border-tertiary-fixed transition-colors duration-300">
                <div className="bg-surface-variant text-on-surface-variant font-label-mono text-label-mono px-2 py-1 uppercase border-b border-outline-variant flex justify-between items-center">
                  <span>Active_Server_Nodes</span>
                  <span className="material-symbols-outlined text-[16px]">dns</span>
                </div>
                <div className="p-2 overflow-x-auto">
                  <table className="w-full text-left border-collapse font-label-mono text-xs">
                    <thead>
                      <tr className="border-b border-outline-variant text-on-surface-variant">
                        <th className="p-2 uppercase text-[10px]">NODE_ID</th>
                        <th className="p-2 uppercase text-[10px]">REGION</th>
                        <th className="p-2 uppercase text-[10px]">STATUS</th>
                        <th className="p-2 uppercase text-[10px] text-right">METRICS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nodes.map(node => (
                        <tr key={node.id} className="border-b border-outline-variant/30 hover:bg-surface-bright transition-colors">
                          <td className="p-2 text-on-surface font-bold">{node.id}</td>
                          <td className="p-2 text-primary">{node.region}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 border text-[9px] ${
                              node.status === 'HEALTHY' ? 'bg-primary/10 text-primary border-primary' : 'bg-error-container text-on-error-container border-error'
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

            {/* Sidebar Overview widgets */}
            <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">
              {/* Leaderboards */}
              <div className="border-2 border-outline-variant bg-surface-container-low flex flex-col hover:border-secondary transition-colors duration-300">
                <div className="bg-secondary/10 text-secondary font-label-mono text-label-mono px-2 py-1 uppercase border-b border-outline-variant flex justify-between items-center">
                  <span>Top_Revenue_Games</span>
                  <span className="material-symbols-outlined text-[16px]">stars</span>
                </div>
                <div className="p-2">
                  <table className="w-full text-left border-collapse font-label-mono text-[10px]">
                    <tbody>
                      {(globalStats.topGames || []).map((g, i) => (
                        <tr key={g.id} className="border-b border-outline-variant/30 hover:bg-surface-bright transition-colors">
                          <td className="p-2 w-8 opacity-50">#0{i+1}</td>
                          <td className="p-2 text-on-surface font-bold">{g.title}</td>
                          <td className="p-2 text-right text-error font-bold">₹{(g.revenue / 100).toLocaleString()}</td>
                        </tr>
                      ))}
                      {(!globalStats.topGames || globalStats.topGames.length === 0) && (
                        <tr><td className="p-4 text-center opacity-50 italic">NO_DATA_AVAILABLE</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Terminal Logs View */}
              <div className="border-2 border-outline-variant bg-black flex flex-col h-[400px] hover:border-primary transition-colors duration-300 relative overflow-hidden flex-1">
                <div className="bg-surface-variant text-on-surface-variant font-label-mono text-label-mono px-2 py-1 uppercase border-b border-outline-variant flex justify-between items-center">
                  <span>Operator_Console_Feed</span>
                  <div className="flex gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                    <span className="w-2 h-2 bg-error rounded-full"></span>
                  </div>
                </div>
                <div className="p-3 font-label-mono text-[10px] text-primary flex-1 overflow-y-auto leading-relaxed flex flex-col gap-1 select-text">
                  {terminalLogs.length === 0 && (
                    <div><span className="text-on-surface-variant">[{new Date().toLocaleTimeString()}]</span> &gt; WAITING_FOR_OPERATOR_INPUTS...</div>
                  )}
                  {terminalLogs.map((log, i) => (
                    <div key={i} className={log.type === 'error' ? 'text-error font-bold' : log.type === 'success' ? 'text-tertiary-fixed' : 'text-primary'}>
                      <span className="text-on-surface-variant">[{log.time}]</span> &gt; {log.msg}
                    </div>
                  ))}
                  <div className="mt-auto pt-4 flex gap-2">
                    <span className="text-primary animate-pulse">&gt;</span>
                    <span className="w-2 h-4 bg-primary animate-pulse"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Users Management */}
        {activeTab === 'users' && (
          <div className="border-2 border-outline-variant bg-surface-container-low p-4 flex flex-col gap-4">
            <h2 className="font-headline-md text-headline-md text-primary uppercase border-b border-outline-variant/30 pb-2">User_Directory_Matrix</h2>
            
            {/* Search filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="SEARCH_USERS_BY_USERNAME_EMAIL..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(1);
                }}
                className="flex-1 text-xs"
              />
              <button 
                onClick={() => setUserPage(1)} 
                className="bg-primary text-on-primary px-5 py-2 font-label-mono text-xs uppercase font-bold hover:brightness-110"
              >
                QUERY_DIRECTORY
              </button>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto border border-outline-variant/20">
              <table className="w-full text-left border-collapse font-label-mono text-xs">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-variant/40 text-on-surface-variant">
                    <th className="p-3 uppercase text-[10px]">USER_ID</th>
                    <th className="p-3 uppercase text-[10px]">USERNAME</th>
                    <th className="p-3 uppercase text-[10px]">EMAIL_ADDRESS</th>
                    <th className="p-3 uppercase text-[10px]">ROLES</th>
                    <th className="p-3 uppercase text-[10px]">STATUS</th>
                    <th className="p-3 uppercase text-[10px] text-right">CONTROLS</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-outline-variant/20 hover:bg-surface-bright/30 transition-colors">
                      <td className="p-3 text-[10px] text-on-surface-variant font-mono">{u.id.substring(0, 10)}...</td>
                      <td className="p-3 font-bold text-primary">{u.username}</td>
                      <td className="p-3 text-on-surface-variant">{u.email}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map(role => (
                            <span key={role} className="bg-primary-container text-on-primary-container px-1 py-0.5 border border-primary-container/40 text-[9px]">
                              {role}
                            </span>
                          ))}
                          <button 
                            onClick={() => setUpdatingUserRole(u)} 
                            className="text-[9px] underline hover:text-primary ml-1 font-bold text-tertiary-fixed"
                          >
                            [EDIT]
                          </button>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 border text-[9px] ${
                          u.status === 'ACTIVE' ? 'bg-primary/10 text-primary border-primary' : 
                          u.status === 'BANNED' ? 'bg-error-container text-on-error-container border-error' : 
                          'bg-surface-variant text-on-surface-variant border-outline-variant/30'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="p-3 text-right flex justify-end gap-2">
                        {u.status === 'BANNED' ? (
                          <button 
                            onClick={() => handleUnbanUser(u.id)} 
                            className="bg-primary/10 text-primary border border-primary px-2 py-1 text-[9px] hover:bg-primary hover:text-on-primary transition-all font-bold"
                          >
                            REVOKE_BAN
                          </button>
                        ) : (
                          <button 
                            onClick={() => setSelectedUserForBan(u)} 
                            className="bg-error-container text-on-error-container border border-error px-2 py-1 text-[9px] hover:brightness-110 transition-all font-bold"
                          >
                            BAN_USER
                          </button>
                        )}
                        <select 
                          value={u.status}
                          onChange={(e) => handleUpdateUserStatus(u.id, e.target.value)}
                          className="bg-surface-container-high border border-outline-variant/30 text-[9px] p-0.5 text-on-surface"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="SUSPENDED">SUSPENDED</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-on-surface-variant opacity-50 uppercase font-mono">
                        NO_USER_RECORDS_MATCHING_QUERY
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {userTotalPages > 1 && (
              <div className="flex justify-between items-center mt-3 font-label-mono text-xs">
                <button 
                  disabled={userPage <= 1} 
                  onClick={() => setUserPage(prev => prev - 1)} 
                  className="bg-surface-container border border-outline-variant/30 px-3 py-1 disabled:opacity-30"
                >
                  PREV
                </button>
                <span>PAGE {userPage} OF {userTotalPages}</span>
                <button 
                  disabled={userPage >= userTotalPages} 
                  onClick={() => setUserPage(prev => prev + 1)} 
                  className="bg-surface-container border border-outline-variant/30 px-3 py-1 disabled:opacity-30"
                >
                  NEXT
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab: Content Moderation */}
        {activeTab === 'games' && (
          <div className="border-2 border-outline-variant bg-surface-container-low p-4 flex flex-col gap-4">
            <h2 className="font-headline-md text-headline-md text-primary uppercase border-b border-outline-variant/30 pb-2">Software_Catalog_Moderation</h2>

            {/* Catalog Filter Controls */}
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                placeholder="SEARCH_BY_GAME_TITLE..."
                value={gameSearch}
                onChange={(e) => {
                  setGameSearch(e.target.value);
                  setGamePage(1);
                }}
                className="flex-1 text-xs"
              />
              <select 
                value={gameFilterStatus}
                onChange={(e) => {
                  setGameFilterStatus(e.target.value);
                  setGamePage(1);
                }}
                className="text-xs bg-surface-container border border-outline-variant"
              >
                <option value="">ALL_STATUSES</option>
                <option value="DRAFT">DRAFT</option>
                <option value="PENDING_REVIEW">PENDING_REVIEW</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>

            {/* Moderation catalog table */}
            <div className="overflow-x-auto border border-outline-variant/20">
              <table className="w-full text-left border-collapse font-label-mono text-xs">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-variant/40 text-on-surface-variant">
                    <th className="p-3 uppercase text-[10px]">GAME_TITLE</th>
                    <th className="p-3 uppercase text-[10px]">DEVELOPER</th>
                    <th className="p-3 uppercase text-[10px]">PRICE</th>
                    <th className="p-3 uppercase text-[10px]">PLATFORMS</th>
                    <th className="p-3 uppercase text-[10px]">FEATURED</th>
                    <th className="p-3 uppercase text-[10px]">STATUS</th>
                    <th className="p-3 uppercase text-[10px] text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map(game => (
                    <tr key={game.id} className="border-b border-outline-variant/20 hover:bg-surface-bright/30 transition-colors">
                      <td className="p-3 font-bold text-primary">{game.title}</td>
                      <td className="p-3 text-on-surface-variant">{game.developer?.displayName || 'Unknown'}</td>
                      <td className="p-3 text-secondary font-bold">₹{(game.price / 100).toFixed(2)}</td>
                      <td className="p-3 text-[10px] text-on-surface-variant font-mono">{game.platforms?.join(', ')}</td>
                      <td className="p-3">
                        <button 
                          onClick={() => handleFeatureGame(game.id, game.featured)}
                          className={`px-2 py-0.5 border text-[9px] font-bold transition-all uppercase ${
                            game.featured ? 'bg-secondary/15 text-secondary border-secondary neon-glow' : 'bg-surface-variant text-on-surface-variant border-outline-variant/30'
                          }`}
                        >
                          {game.featured ? 'FEATURED' : 'PROMPT_FEATURE'}
                        </button>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 border text-[9px] ${
                          game.status === 'PUBLISHED' ? 'bg-primary/10 text-primary border-primary' :
                          game.status === 'PENDING_REVIEW' ? 'bg-secondary/10 text-secondary border-secondary animate-pulse' :
                          'bg-surface-variant text-on-surface-variant border-outline-variant/30'
                        }`}>
                          {game.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button 
                          onClick={() => openReviewModal(game.id)} 
                          className="bg-primary text-on-primary px-3 py-1 hover:brightness-110 text-[10px] font-bold"
                        >
                          REVIEW_ASSETS
                        </button>
                      </td>
                    </tr>
                  ))}
                  {games.length === 0 && (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-on-surface-variant opacity-50 uppercase font-mono">
                        NO_CATALOG_ITEMS_FOUND
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {gameTotalPages > 1 && (
              <div className="flex justify-between items-center mt-3 font-label-mono text-xs">
                <button 
                  disabled={gamePage <= 1} 
                  onClick={() => setGamePage(prev => prev - 1)} 
                  className="bg-surface-container border border-outline-variant/30 px-3 py-1 disabled:opacity-30"
                >
                  PREV
                </button>
                <span>PAGE {gamePage} OF {gameTotalPages}</span>
                <button 
                  disabled={gamePage >= gameTotalPages} 
                  onClick={() => setGamePage(prev => prev + 1)} 
                  className="bg-surface-container border border-outline-variant/30 px-3 py-1 disabled:opacity-30"
                >
                  NEXT
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab: Infrastructure Nodes & R2 telemetry */}
        {activeTab === 'infrastructure' && (
          <div className="flex flex-col gap-6">
            {/* Storage and Cost Telemetry Row (Simulated Telemetry derived from live DB metrics) */}
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 md:col-span-4 border border-outline-variant bg-surface-container-low p-4">
                <div className="text-[10px] text-primary font-bold font-label-mono mb-2 flex items-center justify-between">
                  <span>R2_BLOCK_STORAGE_USAGE</span>
                  <span className="material-symbols-outlined text-[14px]">cloud</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
                  {(globalStats.stats?.games * 154.2 || 1234.8).toFixed(1)} MB
                </h3>
                <div className="text-[9px] text-on-surface-variant font-label-mono mt-2 space-y-1">
                  <p>&gt; TOTAL_UPLOADS: {globalStats.stats?.deployments || 12} BUILDS</p>
                  <p>&gt; CDN_DISTRIBUTION: ACTIVE</p>
                </div>
              </div>

              <div className="col-span-12 md:col-span-4 border border-outline-variant bg-surface-container-low p-4">
                <div className="text-[10px] text-tertiary-fixed font-bold font-label-mono mb-2 flex items-center justify-between">
                  <span>DEDUPLICATION_METRICS</span>
                  <span className="material-symbols-outlined text-[14px]">compress</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-tertiary-fixed font-bold">
                  42.8% SAVED
                </h3>
                <div className="text-[9px] text-on-surface-variant font-label-mono mt-2 space-y-1">
                  <p>&gt; REUSED_CHUNKS_RETAINED: 38%</p>
                  <p>&gt; DUPLICATE_UPLOADS_AVOIDED: 1,842</p>
                </div>
              </div>

              <div className="col-span-12 md:col-span-4 border border-outline-variant bg-surface-container-low p-4">
                <div className="text-[10px] text-secondary font-bold font-label-mono mb-2 flex items-center justify-between">
                  <span>CDN_CACHE_HIT_RATE</span>
                  <span className="material-symbols-outlined text-[14px]">speed</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-secondary font-bold">
                  94.2% HIT
                </h3>
                <div className="text-[9px] text-on-surface-variant font-label-mono mt-2 space-y-1">
                  <p>&gt; AVG_DOWNLOAD_SPEED: 42.1 Mbps</p>
                  <p>&gt; DDOS_PROTECTION: ARMED</p>
                </div>
              </div>
            </div>

            {/* Server Nodes Table & controls */}
            <div className="border-2 border-outline-variant bg-surface-container-low p-4 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
                <h2 className="font-headline-md text-headline-md text-primary uppercase">SERVER_NODE_GRID</h2>
                <button 
                  onClick={() => setShowAddNodeModal(true)} 
                  className="bg-primary text-on-primary px-3 py-1 text-xs font-label-mono font-bold uppercase"
                >
                  + COMMISSION_NODE
                </button>
              </div>

              <div className="overflow-x-auto border border-outline-variant/20">
                <table className="w-full text-left border-collapse font-label-mono text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-variant/40 text-on-surface-variant">
                      <th className="p-3 uppercase text-[10px]">NODE_ID</th>
                      <th className="p-3 uppercase text-[10px]">GEOGRAPHIC_REGION</th>
                      <th className="p-3 uppercase text-[10px]">CPU_USAGE</th>
                      <th className="p-3 uppercase text-[10px]">RAM_USAGE</th>
                      <th className="p-3 uppercase text-[10px]">STATUS</th>
                      <th className="p-3 uppercase text-[10px] text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodes.map(node => (
                      <tr key={node.id} className="border-b border-outline-variant/20 hover:bg-surface-bright/30 transition-colors">
                        <td className="p-3 font-bold text-on-surface">{node.id}</td>
                        <td className="p-3 text-primary">{node.region}</td>
                        <td className="p-3 text-[11px] font-mono">{node.cpuUsage || 0}%</td>
                        <td className="p-3 text-[11px] font-mono">{node.memoryUsage || 0}%</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 border text-[9px] ${
                            node.status === 'HEALTHY' ? 'bg-primary/10 text-primary border-primary' : 'bg-error-container text-on-error-container border-error'
                          }`}>
                            {node.status}
                          </span>
                        </td>
                        <td className="p-3 text-right flex justify-end gap-2">
                          <button 
                            onClick={() => handleToggleNodeStatus(node.id, node.status)}
                            className="bg-surface-container border border-outline-variant/30 text-on-surface-variant px-2 py-1 text-[9px] hover:border-primary hover:text-primary transition-all uppercase"
                          >
                            TOGGLE_STATUS
                          </button>
                          <button 
                            onClick={() => handleRemoveServer(node.id)}
                            className="bg-error-container text-on-error-container border border-error px-2 py-1 text-[9px] hover:brightness-110 transition-all uppercase"
                          >
                            DECOMMISSION
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Active Instances Grid */}
            <div className="border-2 border-outline-variant bg-surface-container-low p-4 flex flex-col gap-4">
              <h2 className="font-headline-md text-headline-md text-primary uppercase border-b border-outline-variant/30 pb-2">ACTIVE_GAME_PLAY_SESSIONS</h2>

              <div className="overflow-x-auto border border-outline-variant/20">
                <table className="w-full text-left border-collapse font-label-mono text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-variant/40 text-on-surface-variant">
                      <th className="p-3 uppercase text-[10px]">INSTANCE_ID</th>
                      <th className="p-3 uppercase text-[10px]">GAME_TITLE</th>
                      <th className="p-3 uppercase text-[10px]">HOST_SERVER</th>
                      <th className="p-3 uppercase text-[10px]">ACTIVE_PLAYERS</th>
                      <th className="p-3 uppercase text-[10px]">CREATED_AT</th>
                      <th className="p-3 uppercase text-[10px] text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {instances.map(inst => (
                      <tr key={inst.id} className="border-b border-outline-variant/20 hover:bg-surface-bright/30 transition-colors">
                        <td className="p-3 text-[10px] text-on-surface-variant font-mono">{inst.id.substring(0, 12)}...</td>
                        <td className="p-3 font-bold text-primary">{inst.game?.title || 'Unknown'}</td>
                        <td className="p-3 text-tertiary-fixed font-bold">{inst.hostNodeId || 'NONE'}</td>
                        <td className="p-3 font-mono">{inst.players?.length || 0}</td>
                        <td className="p-3 text-[10px] text-on-surface-variant">{new Date(inst.createdAt).toLocaleString()}</td>
                        <td className="p-3 text-right">
                          <button 
                            onClick={() => handleTerminateInstance(inst.id)}
                            className="bg-error-container text-on-error-container border border-error px-2 py-1 text-[9px] hover:brightness-110 font-bold uppercase"
                          >
                            FORCE_TERMINATE
                          </button>
                        </td>
                      </tr>
                    ))}
                    {instances.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-on-surface-variant opacity-50 uppercase font-mono">
                          NO_ACTIVE_PLAY_SESSIONS_IN_GRID
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {instanceTotalPages > 1 && (
                <div className="flex justify-between items-center mt-3 font-label-mono text-xs">
                  <button 
                    disabled={instancePage <= 1} 
                    onClick={() => setInstancePage(prev => prev - 1)} 
                    className="bg-surface-container border border-outline-variant/30 px-3 py-1 disabled:opacity-30"
                  >
                    PREV
                  </button>
                  <span>PAGE {instancePage} OF {instanceTotalPages}</span>
                  <button 
                    disabled={instancePage >= instanceTotalPages} 
                    onClick={() => setInstancePage(prev => prev + 1)} 
                    className="bg-surface-container border border-outline-variant/30 px-3 py-1 disabled:opacity-30"
                  >
                    NEXT
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Financials & Refunds */}
        {activeTab === 'financials' && (
          <div className="flex flex-col gap-6">
            {/* Payments */}
            <div className="border-2 border-outline-variant bg-surface-container-low p-4 flex flex-col gap-4">
              <h2 className="font-headline-md text-headline-md text-primary uppercase border-b border-outline-variant/30 pb-2">PAYMENT_TRANSACTION_MATRIX</h2>
              
              <div className="overflow-x-auto border border-outline-variant/20">
                <table className="w-full text-left border-collapse font-label-mono text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-variant/40 text-on-surface-variant">
                      <th className="p-3 uppercase text-[10px]">TRANSACTION_ID</th>
                      <th className="p-3 uppercase text-[10px]">CUSTOMER</th>
                      <th className="p-3 uppercase text-[10px]">GAME_TITLE</th>
                      <th className="p-3 uppercase text-[10px]">AMOUNT</th>
                      <th className="p-3 uppercase text-[10px]">STATUS</th>
                      <th className="p-3 uppercase text-[10px]">DATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} className="border-b border-outline-variant/20 hover:bg-surface-bright/30 transition-colors">
                        <td className="p-3 font-mono text-[10px] text-on-surface-variant">{p.id}</td>
                        <td className="p-3 font-bold text-on-surface">{p.order?.user?.username || 'Unknown'}</td>
                        <td className="p-3 text-primary">{p.order?.game?.title || 'System Order'}</td>
                        <td className="p-3 text-secondary font-bold">₹{(p.amount / 100).toFixed(2)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 border text-[9px] ${
                            p.status === 'PAID' || p.status === 'COMPLETED' ? 'bg-primary/10 text-primary border-primary' : 'bg-error-container text-on-error-container border-error'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-on-surface-variant text-[10px]">{new Date(p.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-on-surface-variant opacity-50 uppercase font-mono">
                          NO_PAYMENT_TRANSACTIONS_IN_LOG
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Refunds list */}
            <div className="border-2 border-outline-variant bg-surface-container-low p-4 flex flex-col gap-4">
              <h2 className="font-headline-md text-headline-md text-primary uppercase border-b border-outline-variant/30 pb-2">REFUND_REQUEST_MODERATION</h2>

              <div className="overflow-x-auto border border-outline-variant/20">
                <table className="w-full text-left border-collapse font-label-mono text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-variant/40 text-on-surface-variant">
                      <th className="p-3 uppercase text-[10px]">REFUND_ID</th>
                      <th className="p-3 uppercase text-[10px]">ORDER_ID</th>
                      <th className="p-3 uppercase text-[10px]">CUSTOMER</th>
                      <th className="p-3 uppercase text-[10px]">AMOUNT</th>
                      <th className="p-3 uppercase text-[10px]">STATUS</th>
                      <th className="p-3 uppercase text-[10px]">REQUESTED_DATE</th>
                      <th className="p-3 uppercase text-[10px] text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refunds.map(ref => (
                      <tr key={ref.id} className="border-b border-outline-variant/20 hover:bg-surface-bright/30 transition-colors">
                        <td className="p-3 font-mono text-[10px] text-on-surface-variant">{ref.id.substring(0, 10)}...</td>
                        <td className="p-3 font-mono text-[10px] text-on-surface-variant">{ref.orderId.substring(0, 10)}...</td>
                        <td className="p-3 font-bold text-on-surface">{ref.order?.user?.username || 'Unknown'}</td>
                        <td className="p-3 text-secondary font-bold">₹{((ref.order?.amount || 0) / 100).toFixed(2)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 border text-[9px] ${
                            ref.status === 'APPROVED' ? 'bg-primary/10 text-primary border-primary' :
                            ref.status === 'REQUESTED' ? 'bg-secondary/15 text-secondary border-secondary animate-pulse' :
                            'bg-surface-variant text-on-surface-variant border-outline-variant/30'
                          }`}>
                            {ref.status}
                          </span>
                        </td>
                        <td className="p-3 text-on-surface-variant text-[10px]">{new Date(ref.createdAt).toLocaleString()}</td>
                        <td className="p-3 text-right">
                          {ref.status === 'REQUESTED' ? (
                            <button 
                              onClick={() => setSelectedRefund(ref)} 
                              className="bg-primary text-on-primary px-3 py-1 hover:brightness-110 text-[10px] font-bold uppercase"
                            >
                              RESOLVE_REQUEST
                            </button>
                          ) : (
                            <span className="text-[10px] text-on-surface-variant opacity-60">RESOLVED</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {refunds.length === 0 && (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-on-surface-variant opacity-50 uppercase font-mono">
                          NO_REFUND_REQUESTS_IN_BUFFER
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: System Audit Trails */}
        {activeTab === 'audit' && (
          <div className="border-2 border-outline-variant bg-surface-container-low p-4 flex flex-col gap-4">
            <h2 className="font-headline-md text-headline-md text-primary uppercase border-b border-outline-variant/30 pb-2">Core_System_Audit_Log</h2>

            <div className="overflow-x-auto border border-outline-variant/20">
              <table className="w-full text-left border-collapse font-label-mono text-xs select-text">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-variant/40 text-on-surface-variant">
                    <th className="p-3 uppercase text-[10px]">TIMESTAMP</th>
                    <th className="p-3 uppercase text-[10px]">ACTOR</th>
                    <th className="p-3 uppercase text-[10px]">EVENT_ACTION</th>
                    <th className="p-3 uppercase text-[10px]">TARGET_TYPE</th>
                    <th className="p-3 uppercase text-[10px]">TARGET_ID</th>
                    <th className="p-3 uppercase text-[10px]">DETAILS</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id} className="border-b border-outline-variant/20 hover:bg-surface-bright/30 transition-colors">
                      <td className="p-3 text-[10px] text-on-surface-variant">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="p-3 font-bold text-primary">{log.actor?.username || 'SYSTEM'}</td>
                      <td className="p-3 text-secondary font-bold text-[10px]">{log.action}</td>
                      <td className="p-3 text-[10px] text-on-surface-variant font-mono">{log.targetType}</td>
                      <td className="p-3 text-[10px] text-on-surface-variant font-mono">{log.targetId ? log.targetId.substring(0, 10) : 'N/A'}</td>
                      <td className="p-3 text-[10px] max-w-xs truncate" title={JSON.stringify(log.details)}>{JSON.stringify(log.details)}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-on-surface-variant opacity-50 uppercase font-mono">
                        NO_AUDIT_LOG_RECORDS_STORED
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {auditTotalPages > 1 && (
              <div className="flex justify-between items-center mt-3 font-label-mono text-xs">
                <button 
                  disabled={auditPage <= 1} 
                  onClick={() => setAuditPage(prev => prev - 1)} 
                  className="bg-surface-container border border-outline-variant/30 px-3 py-1 disabled:opacity-30"
                >
                  PREV
                </button>
                <span>PAGE {auditPage} OF {auditTotalPages}</span>
                <button 
                  disabled={auditPage >= auditTotalPages} 
                  onClick={() => setAuditPage(prev => prev + 1)} 
                  className="bg-surface-container border border-outline-variant/30 px-3 py-1 disabled:opacity-30"
                >
                  NEXT
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: Review Pending Game Assets */}
      {reviewingGame && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-low border-2 border-primary max-w-4xl w-full max-h-[90vh] overflow-y-auto pixel-border flex flex-col">
            <div className="bg-primary text-on-primary p-4 flex justify-between items-center">
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
                <div className="prose prose-invert max-w-none font-label-mono text-[12px] opacity-80 select-text" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reviewingGame.description) }}></div>
              </div>
              <div className="col-span-12 md:col-span-4 space-y-4">
                <div className="bg-surface-container-high p-4 border border-outline-variant">
                  <h3 className="font-label-mono text-[10px] text-primary mb-2 uppercase">BUILD_STATUS</h3>
                  <div className="font-label-mono text-[11px] space-y-1">
                    <p>_ID: {reviewingGame.latestBuildId || 'NONE'}</p>
                    <p>_PLATFORMS: {reviewingGame.platforms?.join(', ')}</p>
                    <p>_PRICE: ₹{(reviewingGame.price / 100).toFixed(2)}</p>
                  </div>
                </div>
                <div className="bg-surface-container-high p-4 border border-outline-variant">
                  <h3 className="font-label-mono text-[10px] text-secondary mb-2 uppercase">DEVELOPER_INFO</h3>
                  <div className="font-label-mono text-[11px] space-y-1">
                    <p>_NAME: {reviewingGame.developer?.displayName}</p>
                    <p>_VERIFIED: {reviewingGame.developer?.verificationStatus}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-4">
                  <button onClick={() => handleUpdateGameStatus(reviewingGame.id, 'PUBLISHED')} className="w-full bg-primary text-on-primary py-3 font-label-mono uppercase hover:brightness-110 font-bold">APPROVE_AND_PUBLISH</button>
                  <button onClick={() => handleUpdateGameStatus(reviewingGame.id, 'REJECTED')} className="w-full border border-error text-error py-3 font-label-mono uppercase hover:bg-error/10 font-bold">REJECT_TO_DRAFT</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ban User Reason Input */}
      {selectedUserForBan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-low border-2 border-error max-w-md w-full pixel-border p-6 flex flex-col gap-4">
            <h3 className="font-headline-md text-error uppercase border-b border-error/30 pb-2">BAN_USER: {selectedUserForBan.username}</h3>
            <p className="text-xs text-on-surface-variant font-label-mono">Enter a detailed audit reason to suspend this account across all LazPlay grids:</p>
            <textarea
              rows="3"
              placeholder="SPECIFY_REASON..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="text-xs w-full bg-black text-on-surface p-2 border border-outline-variant"
            />
            <div className="flex gap-3 justify-end mt-2">
              <button 
                onClick={() => setSelectedUserForBan(null)} 
                className="px-4 py-2 font-label-mono text-xs uppercase text-on-surface border border-outline-variant/30 hover:border-primary"
              >
                CANCEL
              </button>
              <button 
                onClick={handleBanUser} 
                className="bg-error text-on-error px-4 py-2 font-label-mono text-xs uppercase font-bold"
              >
                EXECUTE_BAN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Resolve Refund Request */}
      {selectedRefund && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-low border-2 border-primary max-w-md w-full pixel-border p-6 flex flex-col gap-4">
            <h3 className="font-headline-md text-primary uppercase border-b border-outline-variant/30 pb-2">RESOLVE_REFUND</h3>
            <div className="text-xs text-on-surface-variant font-label-mono space-y-1">
              <p>_ORDER: {selectedRefund.orderId}</p>
              <p>_CUSTOMER: {selectedRefund.order?.user?.username}</p>
              <p>_AMOUNT: ₹{((selectedRefund.order?.amount || 0) / 100).toFixed(2)}</p>
            </div>
            <textarea
              rows="3"
              placeholder="RESOLUTION_NOTE..."
              value={refundNote}
              onChange={(e) => setRefundNote(e.target.value)}
              className="text-xs w-full bg-black text-on-surface p-2 border border-outline-variant"
            />
            <div className="flex gap-3 justify-end mt-2">
              <button 
                onClick={() => setSelectedRefund(null)} 
                className="px-3 py-2 font-label-mono text-xs uppercase text-on-surface border border-outline-variant/30 hover:border-primary"
              >
                CANCEL
              </button>
              <button 
                onClick={() => handleResolveRefund('REJECTED')} 
                className="border border-error text-error px-3 py-2 font-label-mono text-xs uppercase font-bold hover:bg-error/10"
              >
                REJECT
              </button>
              <button 
                onClick={() => handleResolveRefund('APPROVED')} 
                className="bg-primary text-on-primary px-3 py-2 font-label-mono text-xs uppercase font-bold"
              >
                APPROVE_REFUND
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Commission Server Node */}
      {showAddNodeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddServer} className="bg-surface-container-low border-2 border-primary max-w-md w-full pixel-border p-6 flex flex-col gap-4">
            <h3 className="font-headline-md text-primary uppercase border-b border-outline-variant/30 pb-2">COMMISSION_NEW_NODE</h3>
            <div className="flex flex-col gap-3 font-label-mono text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-on-surface-variant uppercase">NODE_ID (Unique Name)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. node-us-east"
                  value={newNodeId}
                  onChange={(e) => setNewNodeId(e.target.value)}
                  className="bg-black border border-outline-variant text-on-surface p-2 text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-on-surface-variant uppercase">GEOGRAPHIC_REGION</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. N. Virginia, USA"
                  value={newNodeRegion}
                  onChange={(e) => setNewNodeRegion(e.target.value)}
                  className="bg-black border border-outline-variant text-on-surface p-2 text-xs"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button 
                type="button"
                onClick={() => setShowAddNodeModal(false)} 
                className="px-4 py-2 font-label-mono text-xs uppercase text-on-surface border border-outline-variant/30 hover:border-primary"
              >
                CANCEL
              </button>
              <button 
                type="submit" 
                className="bg-primary text-on-primary px-4 py-2 font-label-mono text-xs uppercase font-bold"
              >
                COMMISSION
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Edit User Roles */}
      {updatingUserRole && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-low border-2 border-primary max-w-sm w-full pixel-border p-6 flex flex-col gap-4 font-label-mono text-xs">
            <h3 className="font-headline-md text-primary uppercase border-b border-outline-variant/30 pb-2">EDIT_USER_ROLES</h3>
            <p>_USER: {updatingUserRole.username}</p>
            <p>_CURRENT_ROLES: {updatingUserRole.roles?.join(', ')}</p>
            
            <div className="flex flex-col gap-2 pt-2">
              <button 
                onClick={() => handleUpdateUserRole(updatingUserRole.id, ['PLAYER'])} 
                className="w-full bg-surface-container hover:border-primary border border-outline-variant/20 py-2 text-left px-3 hover:text-primary uppercase"
              >
                1. Demote to Player Only
              </button>
              <button 
                onClick={() => handleUpdateUserRole(updatingUserRole.id, ['PLAYER', 'DEVELOPER'])} 
                className="w-full bg-surface-container hover:border-primary border border-outline-variant/20 py-2 text-left px-3 hover:text-primary uppercase"
              >
                2. Set to Player + Developer
              </button>
              <button 
                onClick={() => handleUpdateUserRole(updatingUserRole.id, ['PLAYER', 'DEVELOPER', 'ADMIN'])} 
                className="w-full bg-surface-container hover:border-primary border border-outline-variant/20 py-2 text-left px-3 hover:text-primary uppercase font-bold text-tertiary-fixed border-tertiary-fixed/30"
              >
                3. Elevate to Player + Dev + ADMIN
              </button>
            </div>

            <div className="flex justify-end mt-2">
              <button 
                onClick={() => setUpdatingUserRole(null)} 
                className="px-4 py-2 font-label-mono text-xs uppercase text-on-surface border border-outline-variant/30 hover:border-primary"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { admin as adminApi } from '../api';

export default function AdminMainframe() {
  const [dash, setDash] = useState(null);
  const [servers, setServers] = useState([]);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashRes, serversRes, instancesRes] = await Promise.all([
          adminApi.dashboard(),
          adminApi.listServers(),
          adminApi.listInstances({ limit: 10 }),
        ]);
        setDash(dashRes.data);
        setServers(serversRes.data || []);
        setInstances(instancesRes.data || []);
      } catch (err) {
        console.error('Failed to fetch admin data', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center font-label-mono text-primary-container animate-pulse">
        [ INITIALIZING_ADMIN_MAINFRAME_DATA_LINK... ]
      </div>
    );
  }

  const stats = dash?.stats || {};

  return (
    <div className="p-margin flex-1 flex flex-col gap-margin">
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
          NODE_COUNT: {servers.length}
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
                <span className="font-headline-md text-primary-container">{stats.users || 0}</span>
              </div>
              <div className="flex flex-col gap-1 border-l-2 border-tertiary-fixed pl-3">
                <span className="font-label-caps text-[10px] text-on-surface-variant">ACTIVE_GAMES</span>
                <span className="font-headline-md text-tertiary-fixed">{stats.games || 0}</span>
              </div>
              <div className="flex flex-col gap-1 border-l-2 border-secondary-fixed pl-3">
                <span className="font-label-caps text-[10px] text-on-surface-variant">DEPLOYMENTS</span>
                <span className="font-headline-md text-secondary-fixed">{stats.deployments || 0}</span>
              </div>
              <div className="flex flex-col gap-1 border-l-2 border-error pl-3">
                <span className="font-label-caps text-[10px] text-on-surface-variant">REVENUE</span>
                <span className="font-headline-md text-error">₹{stats.totalRevenue || 0}</span>
              </div>
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
                  {servers.map(node => (
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
                  {servers.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-on-surface-variant opacity-50 uppercase text-[10px]">
                        NO_ACTIVE_NODES_DETECTED
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-2 border-outline-variant bg-surface-container-low flex flex-col flex-1 hover:border-secondary-fixed transition-colors duration-300">
            <div className="bg-surface-variant text-on-surface-variant font-label-mono text-label-mono px-2 py-1 uppercase border-b-2 border-outline-variant flex justify-between items-center">
              <span>Running_Instances</span>
              <span className="material-symbols-outlined text-[16px]">sports_esports</span>
            </div>
            <div className="p-2 overflow-x-auto">
              <table className="w-full text-left border-collapse font-label-mono text-label-mono">
                <thead>
                  <tr className="border-b-2 border-outline-variant text-on-surface-variant">
                    <th className="p-2 uppercase text-[10px]">INSTANCE_ID</th>
                    <th className="p-2 uppercase text-[10px]">GAME</th>
                    <th className="p-2 uppercase text-[10px]">PLAYERS</th>
                    <th className="p-2 uppercase text-[10px] text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {instances.map(inst => (
                    <tr key={inst.id} className="border-b border-outline-variant/50 hover:bg-surface-bright transition-colors group">
                      <td className="p-2 text-on-surface">{inst.id.slice(0, 8)}...</td>
                      <td className="p-2 text-primary-container">{inst.game?.title || 'Unknown'}</td>
                      <td className="p-2 text-on-surface-variant">{inst.players?.length || 0} / 32</td>
                      <td className="p-2 text-right">
                        <button className="bg-surface border-2 border-outline-variant text-on-surface px-3 py-1 hover:border-error hover:text-error transition-colors text-[10px]">TERMINATE</button>
                      </td>
                    </tr>
                  ))}
                  {instances.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-on-surface-variant opacity-50 uppercase text-[10px]">
                        NO_ACTIVE_INSTANCES
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/*  Terminal Feed  */}
        <div className="col-span-12 xl:col-span-4 border-2 border-outline-variant bg-[#050505] flex flex-col h-[500px] xl:h-auto hover:border-primary-container transition-colors duration-300">
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
              {servers.length > 0 && <div>&gt; {servers.length} SERVER_NODES_ONLINE</div>}
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
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { developer as devApi, auth as authApi } from '../api';

export default function DeveloperWorkspace() {
  const [user, setUser] = useState(null);
  const [games, setGames] = useState([]);
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Registration form state
  const [isRegistering, setIsRegistering] = useState(false);
  const [regForm, setRegForm] = useState({ displayName: '', website: '', supportEmail: '' });
  const [regError, setRegError] = useState(null);

  async function fetchData() {
    setLoading(true);
    try {
      const me = await authApi.me();
      setUser(me.data);

      if (me.data.roles.includes('DEVELOPER') || me.data.roles.includes('ADMIN')) {
        const [gamesRes, dashRes] = await Promise.all([
          devApi.listGames({ limit: 10 }),
          devApi.dashboard(),
        ]);
        setGames(gamesRes.data || []);
        setDash(dashRes.data || null);
      }
    } catch (err) {
      console.error('Failed to fetch developer data', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError(null);
    try {
      await devApi.register(regForm);
      // Refresh data to show the workspace
      await fetchData();
    } catch (err) {
      setRegError(err.message || 'Registration failed');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center font-label-mono text-secondary-container animate-pulse">
        [ INITIALIZING_DEVELOPER_WORKSPACE_ENV... ]
      </div>
    );
  }

  // If not logged in, show login prompt
  if (!user) {
    return (
      <div className="max-w-container-max mx-auto p-gutter md:p-margin flex flex-col items-center justify-center min-h-[70vh] gap-8">
        <div className="text-center max-w-2xl">
          <h1 className="font-headline-lg text-headline-lg text-secondary-container uppercase mb-4 animate-pulse glow-primary-text">
            ACCESS_DENIED
          </h1>
          <p className="font-body-md text-on-surface-variant mb-8 leading-relaxed">
            Developer protocols require active authentication. 
            Initialize your profile to access the LazPlay deployment suite.
          </p>
          <Link 
            to="/login"
            className="bg-secondary-container text-on-secondary px-8 py-4 font-label-mono font-bold uppercase tracking-widest hover:bg-transparent hover:text-secondary-container border-2 border-secondary-container transition-all shadow-[8px_8px_0_0_#5b005b]"
          >
            INITIALIZE_AUTH_SEQUENCE
          </Link>
        </div>
      </div>
    );
  }

  // If not a developer, show the "Become a Developer" screen
  if (!user.roles.includes('DEVELOPER') && !user.roles.includes('ADMIN')) {
    return (
      <div className="max-w-container-max mx-auto p-gutter md:p-margin flex flex-col items-center justify-center min-h-[70vh] gap-8">
        <div className="text-center max-w-2xl">
          <h1 className="font-headline-lg text-headline-lg text-secondary-container uppercase mb-4 animate-pulse glow-primary-text">
            BECOME_A_CREATOR
          </h1>
          <p className="font-body-md text-on-surface-variant mb-8 leading-relaxed">
            Ready to deploy your reality into the LazPlay Grid? Join our elite circle of architects. 
            Upload games, monitor real-time telemetry, and monetize your creations.
          </p>
          
          <div className="border-2 border-outline-variant bg-surface-container p-8 text-left relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-2 opacity-20 font-label-mono text-[10px]">AUTH_LEVEL: PLAYER</div>
             <form onSubmit={handleRegister} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-label-mono text-label-mono text-on-surface uppercase tracking-wider">Public_Display_Name</label>
                  <input 
                    required
                    className="bg-surface border-2 border-outline-variant p-3 text-on-surface font-label-mono focus:border-secondary-container outline-none transition-colors"
                    placeholder="e.g. Cyberdyne_Systems"
                    value={regForm.displayName}
                    onChange={e => setRegForm({...regForm, displayName: e.target.value})}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label-mono text-label-mono text-on-surface uppercase tracking-wider">Portfolio_Link (Optional)</label>
                  <input 
                    className="bg-surface border-2 border-outline-variant p-3 text-on-surface font-label-mono focus:border-secondary-container outline-none transition-colors"
                    placeholder="https://your-portfolio.com"
                    value={regForm.website}
                    onChange={e => setRegForm({...regForm, website: e.target.value})}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label-mono text-label-mono text-on-surface uppercase tracking-wider">Support_Email (Optional)</label>
                  <input 
                    className="bg-surface border-2 border-outline-variant p-3 text-on-surface font-label-mono focus:border-secondary-container outline-none transition-colors"
                    placeholder="support@yourdev.com"
                    value={regForm.supportEmail}
                    onChange={e => setRegForm({...regForm, supportEmail: e.target.value})}
                  />
                </div>

                {regError && <p className="text-error font-label-mono text-[12px] animate-bounce">{regError}</p>}

                <button 
                  type="submit"
                  className="mt-4 bg-secondary-container text-on-secondary py-4 font-label-mono font-bold uppercase tracking-widest hover:bg-transparent hover:text-secondary-container border-2 border-secondary-container transition-all shadow-[8px_8px_0_0_#5b005b]"
                >
                  INITIALIZE_DEVELOPER_PROTOCOL
                </button>
             </form>
          </div>
        </div>
      </div>
    );
  }

  const stats = dash?.stats || {};

  return (
    <div className="max-w-container-max mx-auto p-gutter md:p-margin flex flex-col gap-gutter min-h-full">
      {/*  Page Header  */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-outline-variant pb-4 mb-4 gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface uppercase mb-1 flex items-center gap-3">
            <span className="w-4 h-4 bg-secondary-container animate-pulse shadow-[0_0_8px_#fe00fe]"></span>
            WORKSPACE_ENV
          </h1>
          <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest">
            OPERATOR: {user?.displayName} // NODE: ALPHA_TANGO // STATUS: ONLINE
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => fetchData()}
            className="bg-surface-container border-2 border-outline-variant px-4 py-2 font-label-mono text-label-mono text-on-surface hover:border-primary hover:text-primary transition-colors flex items-center gap-2 group"
          >
            <span className="material-symbols-outlined text-sm group-hover:animate-spin">sync</span>
            RELOAD_DATA
          </button>
          <Link to="/deployment" className="bg-secondary-container text-on-secondary border-2 border-transparent px-4 py-2 font-label-mono text-label-mono font-bold shadow-[4px_4px_0_0_#5b005b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#5b005b] transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">add_box</span>
            NEW_DEPLOY
          </Link>
        </div>
      </div>

      {/*  Bento Grid Layout  */}
      <div className="grid grid-cols-12 gap-gutter">
        {/*  Analytics: Revenue (8-bit style)  */}
        <div className="col-span-12 lg:col-span-8 bg-surface border-2 border-outline-variant hover:border-secondary-container transition-colors group relative overflow-hidden flex flex-col">
          <div className="bg-surface-container border-b-2 border-outline-variant px-3 py-1.5 flex justify-between items-center group-hover:bg-surface-container-high transition-colors">
            <span className="font-label-mono text-label-mono text-secondary-container drop-shadow-[0_0_4px_rgba(254,0,254,0.4)]">REVENUE_ANALYTICS.exe</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 border border-outline-variant"></div>
              <div className="w-3 h-3 border border-outline-variant"></div>
              <div className="w-3 h-3 bg-outline-variant border border-outline-variant"></div>
            </div>
          </div>
          <div className="p-4 flex-1 flex flex-col gap-4 relative">
            <div className="flex justify-between items-baseline">
              <div>
                <span className="font-label-mono text-label-mono text-on-surface-variant block mb-1">TOTAL_GROSS_REVENUE</span>
                <span className="font-headline-lg text-headline-lg text-secondary-container drop-shadow-[0_0_8px_rgba(254,0,254,0.6)] block">
                  ₹{(stats.totalRevenue / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <span className="bg-surface-container border-2 border-secondary-container text-secondary-container font-label-mono text-label-mono px-2 py-1 flex items-center gap-1 shadow-[2px_2px_0_0_#fe00fe]">
                SALES: {stats.totalSales || 0}
              </span>
            </div>
            <div className="flex-1 flex items-end gap-1 mt-4 h-32 w-full border-b-2 border-l-2 border-outline-variant pt-2 pr-2 relative">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(60,75,53,0.3)_1px,transparent_1px)] bg-[length:100%_20px] pointer-events-none"></div>
              {(() => {
                const data = stats.dailyRevenue || [];
                const max = Math.max(...data.map(d => d.amount), 1);
                return data.map((d, i) => {
                  const height = Math.max((d.amount / max) * 100, 5); // Min 5% height for visibility
                  const isPeak = d.amount === max && d.amount > 0;
                  return (
                    <div 
                      key={d.date} 
                      className={`flex-1 group/bar relative border-t-2 transition-all ${isPeak ? 'bg-secondary-container border-secondary-fixed shadow-[0_0_10px_#fe00fe]' : 'bg-surface-container border-outline-variant hover:bg-secondary-fixed-dim'}`}
                      style={{ height: `${height}%` }}
                    >
                      {isPeak && <span className="absolute -top-6 left-1/2 -translate-x-1/2 font-label-mono text-[10px] text-secondary-fixed">PEAK</span>}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-surface-container-highest border border-outline-variant px-2 py-1 opacity-0 group-hover/bar:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap">
                        <span className="font-label-mono text-[9px] text-primary-container">
                          {new Date(d.date).toLocaleDateString()}: ₹{(d.amount / 100).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
          <div className="bg-surface border-2 border-outline-variant p-4 hover:border-primary-container transition-all group flex-1 flex flex-col justify-center">
            <span className="font-label-mono text-label-mono text-on-surface-variant flex justify-between">
              PLAYERS (C/T)
              <span className="text-primary-container animate-pulse">●</span>
            </span>
            <span className="font-headline-md text-headline-md text-on-surface mt-2 block group-hover:text-primary-container transition-colors">
              {stats.currentPlayers || 0} / {stats.totalPlayers || 0}
            </span>
            <div className="flex gap-1 mt-4 h-3 w-full">
              <div className={`flex-1 ${stats.currentPlayers > 0 ? 'bg-primary-container shadow-[0_0_5px_var(--primary-container)]' : 'bg-surface-container border border-outline-variant'}`}></div>
              <div className={`flex-1 ${stats.currentPlayers > 5 ? 'bg-primary-container shadow-[0_0_5px_var(--primary-container)]' : 'bg-surface-container border border-outline-variant'}`}></div>
              <div className={`flex-1 ${stats.currentPlayers > 20 ? 'bg-primary-container shadow-[0_0_5px_var(--primary-container)]' : 'bg-surface-container border border-outline-variant'}`}></div>
              <div className={`flex-1 ${stats.currentPlayers > 100 ? 'bg-primary-container shadow-[0_0_5px_var(--primary-container)]' : 'bg-surface-container border border-outline-variant'}`}></div>
              <div className="flex-1 bg-surface-container border border-outline-variant"></div>
            </div>
          </div>
          <div className="bg-surface border-2 border-outline-variant p-4 hover:border-secondary-fixed transition-all group flex-1 flex flex-col justify-center">
            <span className="font-label-mono text-label-mono text-on-surface-variant flex justify-between">
              TOTAL_PROJECTS 
              <span className="text-secondary-fixed font-bold block">LINKED</span>
            </span>
            <span className="font-headline-md text-headline-md text-secondary-fixed mt-2 block drop-shadow-[0_0_5px_var(--secondary-fixed)]">
              {stats.totalGames || 0}
            </span>
            <p className="font-label-mono text-[10px] text-on-surface-variant mt-4 uppercase">
              VERSION_CONTROL: ACTIVE
            </p>
          </div>
          <div className="bg-surface border-2 border-outline-variant p-4 hover:border-tertiary-fixed transition-all group flex-1 flex flex-col justify-center">
            <span className="font-label-mono text-label-mono text-on-surface-variant flex justify-between">
              ACTIVE_INSTANCES
              <span className="text-tertiary-fixed font-bold block">LIVE</span>
            </span>
            <span className="font-headline-md text-headline-md text-tertiary-fixed mt-2 block drop-shadow-[0_0_5px_var(--tertiary-fixed)]">
              {stats.activeInstances || 0} / 500
            </span>
            <p className="font-label-mono text-[10px] text-on-surface-variant mt-4 uppercase">
              SERVER_NODES: ONLINE
            </p>
          </div>
        </div>

        <div className="col-span-12 bg-surface-container-lowest border-2 border-outline-variant flex flex-col h-[500px] shadow-[8px_8px_0_0_rgba(60,75,53,0.5)] mb-8">
          <div className="bg-surface-container border-b-2 border-outline-variant px-4 py-2 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary-container">terminal</span>
              <span className="font-label-mono text-label-mono text-on-surface font-bold">PROJECT_TERMINAL :: ROOT_ACCESS</span>
            </div>
            <div className="font-label-mono text-[10px] text-on-surface-variant">
              SYNC_TS: {new Date().toISOString().slice(0, 19).replace('T', ' ')}
            </div>
          </div>
          <div className="flex-1 p-4 font-label-mono text-label-mono text-primary-container overflow-y-auto flex flex-col gap-1 leading-relaxed">
            <p className="text-on-surface-variant opacity-70">LAZPLAY OS v.1.0.4 - Authentication Successful.</p>
            <p className="text-on-surface-variant opacity-70">Session initialized for {user?.username}.</p>
            <p className="mt-4"><span className="text-secondary-container">sys_admin@lazplay:~$</span> list_projects --status=all</p>
            
            <div className="mt-2 border border-outline-variant p-2 bg-surface-dim overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-12 gap-2 text-on-surface-variant border-b border-outline-variant pb-1 mb-1 text-[10px]">
                  <div className="col-span-3">GAME_TITLE</div>
                  <div className="col-span-1 text-center">STATUS</div>
                  <div className="col-span-2 text-center">PLAYERS (C/T)</div>
                  <div className="col-span-1 text-center">SALES</div>
                  <div className="col-span-2 text-center">REVENUE</div>
                  <div className="col-span-3 text-right">ACTION</div>
                </div>
                {games.map(game => {
                  const gStat = (dash?.games || []).find(gs => gs.id === game.id) || {};
                  return (
                    <div key={game.id} className="grid grid-cols-12 gap-2 text-primary-container hover:bg-surface-container cursor-pointer transition-colors py-2 group items-center border-b border-outline-variant/10">
                      <Link to={`/deployment?id=${game.id}`} className="col-span-3 truncate font-bold hover:underline">{game.title}</Link>
                      <div className="col-span-1 text-center">
                        <span className={`text-[9px] px-1 border ${game.status === 'PUBLISHED' ? 'border-secondary-container text-secondary-container shadow-[0_0_5px_#fe00fe]' : 'border-outline-variant text-on-surface-variant'}`}>
                          {game.status}
                        </span>
                      </div>
                      <div className="col-span-2 text-center font-label-mono text-[10px]">
                        {gStat.currentPlayers || 0} / {gStat.totalPlayers || 0}
                      </div>
                      <div className="col-span-1 text-center font-label-mono text-[10px]">
                        {gStat.sales || 0}
                      </div>
                      <div className="col-span-2 text-center font-label-mono text-[10px]">
                        ₹{((gStat.revenue || 0) / 100).toLocaleString()}
                      </div>
                      <div className="col-span-3 text-right flex items-center justify-end gap-3">
                        <span className="text-[10px] opacity-70 hidden md:inline">{new Date(game.createdAt).toLocaleDateString()}</span>
                        <Link to={`/deployment?id=${game.id}`} className="bg-surface-container border border-outline-variant p-1 hover:border-primary transition-all flex items-center">
                          <span className="material-symbols-outlined text-[14px]">edit_square</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
                {games.length === 0 && (
                  <div className="p-4 text-center text-on-surface-variant opacity-50 italic">
                    NO_PROJECTS_FOUND_IN_WORKSPACE
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto pt-4 flex items-center">
              <span className="text-secondary-container mr-2">sys_admin@lazplay:~$</span>
              <div className="flex-1 flex items-center gap-1">
                <span>AWAITING_INPUT</span>
                <span className="w-2 h-4 bg-primary-container animate-blink"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

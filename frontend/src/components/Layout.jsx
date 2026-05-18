import React, { useState, useEffect, useMemo } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { auth as authApi } from '../api';

export default function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [user, setUser] = useState(null);
  const isInsideLauncher = typeof window !== 'undefined' && !!window.electron;

  useEffect(() => {
    const initAuth = async () => {
      if (window.electron && typeof window.electron.invoke === 'function') {
        try {
          const launcherToken = await window.electron.invoke('get-access-token');
          if (launcherToken) {
            localStorage.setItem('accessToken', launcherToken);
          }
        } catch (e) {
          console.error("Failed to sync token from launcher:", e);
        }
      }

      try {
        const res = await authApi.me();
        setUser(res.data);
        // Sync session with native launcher if running inside Electron
        if (window.electron && window.electron.syncSession) {
          const access = localStorage.getItem('accessToken');
          const refresh = localStorage.getItem('refreshToken');
          if (access && refresh) {
            window.electron.syncSession(access, refresh);
          }
        }
      } catch (err) {
        setUser(null);
      }
    };

    initAuth();
  }, []);

  const navItems = useMemo(() => {
    const baseItems = [
      { name: 'START', path: '/', icon: 'play_arrow' },
      { name: 'GAMES', path: '/games', icon: 'sports_esports' },
      ...(isInsideLauncher ? [] : [
        { name: 'LIBRARY', path: '/library', icon: 'inventory_2' },
        { name: 'DEV_CONSOLE', path: '/developer', icon: 'terminal' },
      ]),
      { name: 'ADMIN', path: '/admin', icon: 'shield_person', roles: ['ADMIN'] },
      { name: 'OPTIONS', path: '/options', icon: 'settings' },
    ];

    if (!user) return baseItems.filter(i => !i.roles);

    const userRoles = (user.roles || []).map(r => r.toUpperCase());
    return baseItems.filter(item => {
      if (!item.roles) return true;
      return item.roles.some(r => userRoles.includes(r.toUpperCase()));
    });
  }, [user, isInsideLauncher]);

  return (
    <div className="min-h-screen bg-background flex flex-col grid-glow-bg">
      {/* CRT Scanline Overlay */}
      <div className="fixed inset-0 scanlines z-[60] pointer-events-none opacity-20"></div>

      {/* Mobile Sidebar Overlay */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden transition-opacity duration-300"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* TopAppBar */}
      <header className="bg-surface text-primary font-label-mono text-label-mono uppercase tracking-widest border-b-2 border-outline-variant shadow-[0_0_15px_rgba(0,0,0,0.5)] flex justify-between items-center px-4 md:px-gutter py-2 w-full z-50 fixed top-0 h-16">
        <div className="flex items-center gap-2 md:gap-4 h-full">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-10 h-10 flex items-center justify-center text-primary hover:bg-surface-variant transition-colors border-2 border-outline-variant shrink-0"
          >
            <span className="material-symbols-outlined">{isCollapsed ? 'menu' : 'close'}</span>
          </button>
          <Link to="/" className="font-headline-md text-headline-sm md:text-headline-md font-bold text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]">LAZPLAY</Link>
        </div>
        
        <div className="flex-1 max-w-md mx-8 hidden lg:block">
          <div className="relative w-full border-2 border-outline-variant bg-surface flex items-center px-3 py-1">
            <span className="text-primary mr-2 font-label-mono">&gt;</span>
            <input className="w-full bg-transparent border-none text-primary focus:ring-0 placeholder:text-outline-variant/50 focus:outline-none font-label-mono text-label-mono !border-none !ring-0" placeholder="SEARCH_DATABASE..." type="text"/>
            <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 0"}}>search</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 h-full">
          {!isInsideLauncher && (
            <Link 
              to="/download-launcher" 
              className="hidden sm:flex w-10 h-10 hover:text-primary-fixed hover:bg-surface-variant transition-colors items-center justify-center border-2 border-transparent hover:border-primary-container group relative"
              title="DOWNLOAD_LAUNCHER"
            >
              <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 0"}}>download</span>
              <span className="absolute -bottom-8 right-0 bg-surface border border-outline-variant px-2 py-1 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">GET_LAUNCHER</span>
            </Link>
          )}
          <button className="w-10 h-10 hover:text-primary-fixed hover:bg-surface-variant transition-colors flex items-center justify-center border-2 border-transparent hover:border-primary-container">
            <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 0"}}>notifications</span>
          </button>
          {!isInsideLauncher && (
            <Link to="/login" className="w-10 h-10 hover:text-primary-fixed hover:bg-surface-variant transition-colors flex items-center justify-center border-2 border-transparent hover:border-primary-container">
              <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 0"}}>account_circle</span>
            </Link>
          )}
        </div>
      </header>

      <div className="flex flex-1 pt-16">
        {/* SideNavBar */}
        <nav className={`fixed left-0 top-16 h-[calc(100vh-64px)] bg-surface-container border-r-2 border-outline-variant flex flex-col pb-4 z-40 transition-all duration-300 
          ${isCollapsed ? 'w-0 -translate-x-full md:w-20 md:translate-x-0' : 'w-64 translate-x-0'} 
        `}>
          {!isInsideLauncher && (
            <div className={`px-6 py-8 border-b-2 border-outline-variant mb-4 overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 h-0 p-0 border-0 mb-0' : 'opacity-100'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 border-2 border-primary bg-surface flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>terminal</span>
                </div>
                <div className="overflow-hidden">
                  <div className="font-headline-md text-headline-sm font-bold text-primary truncate max-w-[140px]">
                    {user ? user.displayName.toUpperCase() : 'GUEST_USER'}
                  </div>
                  <div className="text-[10px] text-on-surface-variant uppercase">
                    {user ? `${user.roles[user.roles.length - 1]}_MODE` : 'OFFLINE_MODE'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => { if (window.innerWidth < 768) setIsCollapsed(true); }}
                end={item.path === '/'}
                className={({ isActive }) => `flex items-center gap-3 py-3 transition-all font-label-mono text-label-mono border-l-4 w-full ${isCollapsed ? 'px-0 justify-center' : 'px-6 justify-start'} ${
                  isActive
                  ? 'bg-primary-container text-on-primary-fixed-variant font-bold border-primary-fixed shadow-[4px_0_0_0_var(--primary-container)]'
                  : 'text-on-surface-variant opacity-80 hover:opacity-100 hover:bg-surface-bright hover:text-primary border-transparent'
                }`}
              >
                {({ isActive }) => (
                  <>
                    <span className="material-symbols-outlined shrink-0" style={{fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0"}}>{item.icon}</span>
                    <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 invisible' : 'opacity-100 w-auto'}`}>{item.name}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {!isInsideLauncher && (
            <div className="mt-auto border-t-2 border-outline-variant pt-4">
              <Link className="flex items-center gap-3 px-6 py-3 text-error opacity-80 hover:opacity-100 hover:bg-surface-bright hover:text-error transition-all border-l-4 border-transparent w-full" to="/login">
                <span className="material-symbols-outlined shrink-0">power_settings_new</span>
                <span className={`font-label-mono text-label-mono transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 invisible' : 'opacity-100 w-auto'}`}>LOGOUT</span>
              </Link>
            </div>
          )}
        </nav>

        {/* Main Content Area */}
        <main className={`flex-1 transition-all duration-300 min-h-[calc(100vh-64px)] 
          ${isCollapsed ? 'md:ml-20' : 'md:ml-64'}
        `}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

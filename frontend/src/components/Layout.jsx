import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Layout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'START', path: '/', icon: 'play_arrow' },
    { name: 'GAMES', path: '/games', icon: 'sports_esports' },
    { name: 'LIBRARY', path: '/library', icon: 'inventory_2' },
    { name: 'DEV_CONSOLE', path: '/developer', icon: 'terminal' },
    { name: 'ADMIN', path: '/admin', icon: 'shield_person' },
    { name: 'OPTIONS', path: '/options', icon: 'settings' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* CRT Scanline Overlay */}
      <div className="fixed inset-0 scanlines z-[60] pointer-events-none opacity-20"></div>

      {/* TopAppBar */}
      <header className="bg-surface text-primary-container font-label-mono text-label-mono uppercase tracking-widest border-b-2 border-outline-variant shadow-[0_0_15px_rgba(0,0,0,0.5)] flex justify-between items-center px-gutter py-2 w-full z-50 fixed top-0 h-16">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-primary-container hover:bg-surface-variant p-2 transition-colors border-2 border-outline-variant"
          >
            <span className="material-symbols-outlined">{isCollapsed ? 'menu' : 'menu_open'}</span>
          </button>
          <Link to="/" className="font-headline-md text-headline-md font-bold text-primary-container drop-shadow-[0_0_8px_rgba(var(--primary-container-rgb),0.6)]">LAZPLAY</Link>
        </div>
        
        <div className="flex-1 max-w-md mx-8 hidden md:block">
          <div className="relative w-full border-2 border-outline-variant bg-surface flex items-center px-3 py-1">
            <span className="text-primary-container mr-2 font-label-mono">&gt;</span>
            <input className="w-full bg-transparent border-none text-primary-container focus:ring-0 placeholder:text-outline-variant/50 focus:outline-none font-label-mono text-label-mono" placeholder="SEARCH_DATABASE..." type="text"/>
            <span className="material-symbols-outlined text-primary-container" style={{fontVariationSettings: "'FILL' 0"}}>search</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="hover:text-primary-fixed hover:bg-surface-variant transition-colors p-1 flex items-center justify-center border-2 border-transparent hover:border-primary-container">
            <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 0"}}>notifications</span>
          </button>
          <Link to="/login" className="hover:text-primary-fixed hover:bg-surface-variant transition-colors p-1 flex items-center justify-center border-2 border-transparent hover:border-primary-container">
            <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 0"}}>account_circle</span>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 pt-16">
        {/* SideNavBar */}
        <nav className={`fixed left-0 top-16 h-[calc(100vh-64px)] bg-surface-container border-r-2 border-outline-variant flex flex-col pb-4 z-40 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
          <div className={`px-margin py-8 border-b-2 border-outline-variant mb-4 overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 h-0 p-0 border-0 mb-0' : 'opacity-100'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border-2 border-primary-container bg-surface flex items-center justify-center">
                <span className="material-symbols-outlined text-primary-container" style={{fontVariationSettings: "'FILL' 1"}}>terminal</span>
              </div>
              <div>
                <div className="font-headline-md text-headline-md font-bold text-primary-container">SYSTEM_OS</div>
                <div className="text-[10px] text-on-surface-variant uppercase">V_1.0.4_ARCADE</div>
              </div>
            </div>
          </div>

          <div className="flex-1 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={item.name}
                  to={item.path} 
                  className={`flex items-center gap-3 p-3 transition-all font-label-mono text-label-mono border-l-4 ${
                    isActive 
                    ? 'bg-primary-container text-on-primary-fixed-variant font-bold border-primary-fixed shadow-[4px_0_0_0_var(--primary-container)]' 
                    : 'text-on-surface-variant opacity-80 hover:opacity-100 hover:bg-surface-bright hover:text-primary border-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined shrink-0" style={{fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0"}}>{item.icon}</span>
                  {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                </Link>
              );
            })}
          </div>

          <div className="px-2 mt-auto border-t-2 border-outline-variant pt-4">
            <Link className="flex items-center gap-3 p-3 text-error opacity-80 hover:opacity-100 hover:bg-surface-bright hover:text-error transition-all border-l-4 border-transparent" to="/login">
              <span className="material-symbols-outlined shrink-0">power_settings_new</span>
              {!isCollapsed && <span className="font-label-mono text-label-mono">LOGOUT</span>}
            </Link>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className={`flex-1 transition-all duration-300 min-h-[calc(100vh-64px)] ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
          {children}
          
        </main>
      </div>
    </div>
  );
}

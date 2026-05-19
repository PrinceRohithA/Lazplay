import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-surface border-t-2 border-outline-variant py-12 px-4 md:px-gutter mt-auto z-40 relative">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-8">
        {/* Brand Section */}
        <div className="flex flex-col gap-4 max-w-sm">
          <Link to="/" className="font-headline-md text-headline-md font-bold text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]">
            LAZPLAY
          </Link>
          <p className="text-on-surface-variant text-label-mono font-label-mono text-sm leading-relaxed">
            The ultimate indie game distribution platform. Built for developers, played by everyone.
          </p>
          <div className="flex gap-4 mt-2">
            {/* Placeholder social icons or similar */}
            <div className="w-8 h-8 border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-sm">terminal</span>
            </div>
            <div className="w-8 h-8 border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-sm">code</span>
            </div>
            <div className="w-8 h-8 border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-sm">public</span>
            </div>
          </div>
        </div>

        {/* Links Section */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
          <div className="flex flex-col gap-3">
            <h3 className="text-primary-fixed font-bold text-xs uppercase tracking-widest font-label-mono mb-2">PLATFORM</h3>
            <Link to="/games" className="text-on-surface-variant hover:text-primary transition-colors text-sm font-label-mono uppercase">Browse Games</Link>
            <Link to="/library" className="text-on-surface-variant hover:text-primary transition-colors text-sm font-label-mono uppercase">My Library</Link>
            <Link to="/download-launcher" className="text-on-surface-variant hover:text-primary transition-colors text-sm font-label-mono uppercase">Launchers</Link>
          </div>
          
          <div className="flex flex-col gap-3">
            <h3 className="text-primary-fixed font-bold text-xs uppercase tracking-widest font-label-mono mb-2">LEGAL_CORE</h3>
            <Link to="/terms-and-conditions" className="text-on-surface-variant hover:text-primary transition-colors text-sm font-label-mono uppercase">Terms of Service</Link>
            <Link to="/privacy-policy" className="text-on-surface-variant hover:text-primary transition-colors text-sm font-label-mono uppercase">Privacy Policy</Link>
            <Link to="/refund-policy" className="text-on-surface-variant hover:text-primary transition-colors text-sm font-label-mono uppercase">Refund Policy</Link>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-primary-fixed font-bold text-xs uppercase tracking-widest font-label-mono mb-2">SYSTEM</h3>
            <Link to="/developer" className="text-on-surface-variant hover:text-primary transition-colors text-sm font-label-mono uppercase">Dev Console</Link>
            <Link to="/options" className="text-on-surface-variant hover:text-primary transition-colors text-sm font-label-mono uppercase">Settings</Link>
            <a href="mailto:support@lazplay.com" className="text-on-surface-variant hover:text-primary transition-colors text-sm font-label-mono uppercase">Support</a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-outline-variant/30 flex flex-col sm:row justify-between items-center gap-4">
        <p className="text-on-surface-variant/50 text-[10px] font-label-mono uppercase tracking-widest">
          © {currentYear} LAZPLAY_DISTRIBUTION_SYSTEM. ALL_RIGHTS_RESERVED.
        </p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_5px_var(--primary)]"></div>
          <p className="text-primary/70 text-[10px] font-label-mono uppercase tracking-widest">SYSTEM_STATUS: OPERATIONAL</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

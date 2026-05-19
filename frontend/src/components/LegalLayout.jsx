import React from 'react';
import { NavLink } from 'react-router-dom';

const LegalLayout = ({ children, title, lastUpdated }) => {
  const navItems = [
    { name: 'TERMS_AND_CONDITIONS', path: '/terms-and-conditions' },
    { name: 'PRIVACY_POLICY', path: '/privacy-policy' },
    { name: 'REFUND_POLICY', path: '/refund-policy' },
  ];

  return (
    <div className="min-h-full bg-background text-on-background py-12 px-4 md:px-gutter lg:px-24">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 border-b-2 border-outline-variant pb-8">
          <h1 className="text-headline-lg font-bold text-primary mb-2 drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)] uppercase tracking-tighter">
            {title}
          </h1>
          {lastUpdated && (
            <p className="text-label-mono text-on-surface-variant font-label-mono">
              LAST_UPDATED: {lastUpdated}
            </p>
          )}
        </header>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Navigation Sidebar */}
          <aside className="lg:w-1/4 shrink-0">
            <nav className="sticky top-24 space-y-2">
              <h2 className="text-label-mono font-bold text-primary-fixed mb-4 px-4">NAVIGATION_SUITE</h2>
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `
                    block px-4 py-3 border-l-2 transition-all font-label-mono text-label-mono
                    ${isActive 
                      ? 'border-primary bg-primary-container/20 text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]' 
                      : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary hover:bg-surface-bright'}
                  `}
                >
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </aside>

          {/* Content Area */}
          <article className="lg:w-3/4 bg-surface-container border-2 border-outline-variant p-6 md:p-10 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative">
            <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
              <span className="material-symbols-outlined text-primary text-6xl">gavel</span>
            </div>
            <div className="
              [&>section>h2]:text-primary [&>section>h2]:font-bold [&>section>h2]:uppercase [&>section>h2]:tracking-wider [&>section>h2]:border-b [&>section>h2]:border-outline-variant/30 [&>section>h2]:pb-2 [&>section>h2]:mt-12 [&>section>h2]:text-xl
              [&>section>h3]:text-secondary [&>section>h3]:mt-8 [&>section>h3]:font-bold [&>section>h3]:text-lg
              [&>section>p]:text-on-surface-variant [&>section>p]:leading-relaxed [&>section>p]:mb-4 [&>section>p]:text-sm md:[&>section>p]:text-base
              [&>section>ul]:text-on-surface-variant [&>section>ul]:mb-6 [&>section>ul]:list-disc [&>section>ul]:pl-6
              [&>section>ol]:text-on-surface-variant [&>section>ol]:mb-6 [&>section>ol]:list-decimal [&>section>ol]:pl-6
              [&>section>ul>li]:mb-2 [&>section>ol>li]:mb-2
              [&_strong]:text-primary-fixed [&_strong]:font-bold
            ">
              {children}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
};

export default LegalLayout;

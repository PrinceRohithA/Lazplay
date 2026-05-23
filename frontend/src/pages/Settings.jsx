import React from 'react';
import { useTheme } from '../components/ThemeContext';

export default function Options() {
  const { colorTheme, setColorTheme, t } = useTheme();

  return (
    <div className="p-4 md:p-margin max-w-4xl mx-auto">
      <div className="mb-12">
        <h1 className="font-headline-xl text-headline-xl text-primary mb-2 glow-text-primary uppercase tracking-tighter">
          {t('SYSTEM_OPTIONS')}
        </h1>
        <div className="h-1 w-24 bg-primary-container mb-8 neon-glow"></div>
      </div>

      <div className="flex flex-col gap-8">
        <section className="bg-surface-container border border-outline-variant p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 text-[10px] text-outline-variant font-label-mono">{t('UI_THEME_MODULE')} // LIGHT_DARK</div>

          <h2 className="font-headline-md text-headline-md text-primary mb-6 flex items-center gap-2 uppercase">
            <span className="material-symbols-outlined">dark_mode</span>
            Color Theme Preference
          </h2>

          <div className="flex flex-col sm:flex-row gap-4">
            {[
              { id: 'system', name: 'System Default' },
              { id: 'light', name: 'Light Theme' },
              { id: 'dark', name: 'Dark Theme' }
            ].map((theme) => (
              <button
                key={theme.id}
                onClick={() => setColorTheme(theme.id)}
                className={`flex-1 py-3 border transition-all text-center font-label-mono ${
                  colorTheme === theme.id
                    ? 'border-primary bg-primary-container/10 text-primary font-bold'
                    : 'border-outline-variant hover:border-primary/50 text-on-surface-variant bg-surface'
                }`}
              >
                {theme.name}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-outline-variant flex justify-between items-center">
        <div className="text-[10px] font-label-mono text-outline-variant">
          SESSION_ID: {Math.random().toString(36).substring(7).toUpperCase()}
          <br />
          HARDWARE_ACCEL: ENABLED
        </div>
        <button
          onClick={() => window.location.href = '/'}
          className="px-8 py-3 font-label-mono font-bold bg-primary text-white rounded"
        >
          {t('RETURN_TO_DASHBOARD')}
        </button>
      </div>
    </div>
  );
}

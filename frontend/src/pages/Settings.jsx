import React, { useState, useEffect } from 'react';
import { useTheme } from '../components/ThemeContext';

export default function Options() {
  const { uiMode, setUiMode, colorTheme, setColorTheme, t, isStandard } = useTheme();
  const [primaryColor, setPrimaryColor] = useState('#39ff14');
  const [secondaryColor, setSecondaryColor] = useState('#ffabf3');

  useEffect(() => {
    const savedPrimary = localStorage.getItem('lazplay-theme-color') || '#39ff14';
    const savedSecondary = localStorage.getItem('lazplay-secondary-color') || '#ffabf3';
    setPrimaryColor(savedPrimary);
    setSecondaryColor(savedSecondary);
  }, []);

  const handlePrimaryChange = (e) => {
    const color = e.target.value;
    setPrimaryColor(color);
    if (window.setThemeColor) {
      window.setThemeColor(color);
    }
  };

  const handleSecondaryChange = (e) => {
    const color = e.target.value;
    setSecondaryColor(color);
    if (window.setSecondaryColor) {
      window.setSecondaryColor(color);
    }
  };

  const presetColors = [
    { name: 'NEON_GREEN', hex: '#39ff14' },
    { name: 'CYBER_PINK', hex: '#fe00fe' },
    { name: 'RETRO_CYAN', hex: '#00f6f6' },
    { name: 'PLASMA_PURPLE', hex: '#9d00ff' },
    { name: 'LASER_RED', hex: '#ff0000' },
    { name: 'GOLDEN_EYE', hex: '#ffcc00' },
  ];

  return (
    <div className={`p-4 md:p-margin max-w-4xl mx-auto ${isStandard ? '' : 'grid-glow-bg'}`}>
      <div className="mb-12">
        <h1 className="font-headline-xl text-headline-xl text-primary mb-2 glow-text-primary uppercase tracking-tighter">
          {t('SYSTEM_OPTIONS')}
        </h1>
        <div className="h-1 w-24 bg-primary-container mb-8 neon-glow"></div>
      </div>

      <div className="flex flex-col gap-8">
        {/* UI Mode Selector Section */}
        <section className="bg-surface-container border-2 border-outline-variant p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 text-[10px] text-outline-variant font-label-mono">{t('UI_THEME_MODULE')} // MODE</div>
          
          <h2 className="font-headline-md text-headline-md text-primary mb-6 flex items-center gap-2 uppercase">
            <span className="material-symbols-outlined">settings_ethernet</span>
            {t('PRIMARY_COLOR_CALIBRATION')}
          </h2>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setUiMode('cyber')}
              className={`flex-1 py-4 border-2 transition-all text-center font-label-mono ${
                uiMode === 'cyber'
                  ? 'border-primary bg-primary-container/10 text-primary font-bold'
                  : 'border-outline-variant hover:border-primary/50 text-on-surface-variant bg-surface'
              }`}
            >
              Cyber Edition (Original Flashy)
            </button>
            <button
              onClick={() => setUiMode('standard')}
              className={`flex-1 py-4 border-2 transition-all text-center font-label-mono ${
                uiMode === 'standard'
                  ? 'border-primary bg-primary-container/10 text-primary font-bold'
                  : 'border-outline-variant hover:border-primary/50 text-on-surface-variant bg-surface'
              }`}
            >
              Standard Edition (Clean Green)
            </button>
          </div>
        </section>

        {/* Color Theme Selector Section (Standard Edition Only) */}
        {isStandard && (
          <section className="bg-surface-container border-2 border-outline-variant p-8 relative overflow-hidden">
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
                  className={`flex-1 py-3 border-2 transition-all text-center font-label-mono ${
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
        )}

        {/* Custom Neon Colors Section (Cyber Edition Only) */}
        {!isStandard && (
          <>
            {/* Primary Color Section */}
            <section className="bg-surface-container border-2 border-outline-variant p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 text-[10px] text-outline-variant font-label-mono">UI_THEME_MODULE // PRIMARY</div>
              
              <h2 className="font-headline-md text-headline-md text-primary mb-6 flex items-center gap-2 uppercase">
                <span className="material-symbols-outlined">palette</span>
                {t('PRIMARY_COLOR_CALIBRATION')}
              </h2>

              <div className="flex flex-col md:flex-row gap-12 items-start">
                <div className="flex flex-col gap-4">
                  <label className="font-label-mono text-[10px] text-outline-variant uppercase">{t('MANUAL_PICKER')}</label>
                  <div className="flex items-center gap-4 bg-surface p-4 border-2 border-outline-variant">
                    <input 
                      type="color" 
                      value={primaryColor}
                      onChange={handlePrimaryChange}
                      className="w-12 h-12 cursor-pointer bg-transparent"
                    />
                    <div className="font-label-mono text-lg text-primary">{primaryColor.toUpperCase()}</div>
                  </div>
                </div>

                <div className="flex-1">
                  <label className="font-label-mono text-[10px] text-outline-variant uppercase mb-4 block">{t('PRESET_PALETTES')}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {presetColors.map((color) => (
                      <button
                        key={color.hex}
                        onClick={() => handlePrimaryChange({ target: { value: color.hex } })}
                        className={`flex items-center gap-3 p-2 border-2 transition-all ${
                          primaryColor.toLowerCase() === color.hex.toLowerCase()
                            ? 'border-primary bg-primary-container/10'
                            : 'border-outline-variant hover:border-primary-container/50 bg-surface'
                        }`}
                      >
                        <div className="w-4 h-4 border-2 border-outline" style={{ backgroundColor: color.hex }}></div>
                        <span className="font-label-mono text-[9px] truncate">{color.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Secondary Color Section */}
            <section className="bg-surface-container border-2 border-outline-variant p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 text-[10px] text-outline-variant font-label-mono">UI_THEME_MODULE // SECONDARY</div>
              
              <h2 className="font-headline-md text-headline-md text-secondary mb-6 flex items-center gap-2 uppercase">
                <span className="material-symbols-outlined">colorize</span>
                {t('ACCENT_COLOR_CALIBRATION')}
              </h2>

              <div className="flex flex-col md:flex-row gap-12 items-start">
                <div className="flex flex-col gap-4">
                  <label className="font-label-mono text-[10px] text-outline-variant uppercase">{t('MANUAL_PICKER')}</label>
                  <div className="flex items-center gap-4 bg-surface p-4 border-2 border-outline-variant">
                    <input 
                      type="color" 
                      value={secondaryColor}
                      onChange={handleSecondaryChange}
                      className="w-12 h-12 cursor-pointer bg-transparent"
                    />
                    <div className="font-label-mono text-lg text-secondary">{secondaryColor.toUpperCase()}</div>
                  </div>
                </div>

                <div className="flex-1">
                  <label className="font-label-mono text-[10px] text-outline-variant uppercase mb-4 block">{t('ACCENT_PRESETS')}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {presetColors.map((color) => (
                      <button
                        key={color.hex}
                        onClick={() => handleSecondaryChange({ target: { value: color.hex } })}
                        className={`flex items-center gap-3 p-2 border-2 transition-all ${
                          secondaryColor.toLowerCase() === color.hex.toLowerCase()
                            ? 'border-secondary bg-secondary/10'
                            : 'border-outline-variant hover:border-secondary/50 bg-surface'
                        }`}
                      >
                        <div className="w-4 h-4 border-2 border-outline" style={{ backgroundColor: color.hex }}></div>
                        <span className="font-label-mono text-[9px] truncate">{color.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      <div className="mt-12 pt-8 border-t-2 border-outline-variant flex justify-between items-center">
        <div className="text-[10px] font-label-mono text-outline-variant">
          SESSION_ID: {Math.random().toString(36).substring(7).toUpperCase()}
          <br />
          HARDWARE_ACCEL: ENABLED
        </div>
        <button 
          onClick={() => window.location.href = '/'}
          className="cyber-btn px-8 py-3 font-label-mono font-bold"
        >
          {t('RETURN_TO_DASHBOARD')}
        </button>
      </div>
    </div>
  );
}

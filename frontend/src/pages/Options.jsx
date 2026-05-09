import React, { useState, useEffect } from 'react';

export default function Options() {
  const [selectedColor, setSelectedColor] = useState('#39ff14');

  useEffect(() => {
    const savedColor = localStorage.getItem('lazplay-theme-color') || '#39ff14';
    setSelectedColor(savedColor);
  }, []);

  const handleColorChange = (e) => {
    const color = e.target.value;
    setSelectedColor(color);
    if (window.setThemeColor) {
      window.setThemeColor(color);
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
    <div className="p-margin max-w-4xl mx-auto">
      <div className="mb-12">
        <h1 className="font-headline-xl text-headline-xl text-primary-container mb-2 drop-shadow-[0_0_10px_rgba(var(--primary-container-rgb),0.5)] uppercase tracking-tighter">
          SYSTEM_OPTIONS
        </h1>
        <div className="h-1 w-24 bg-primary-container mb-8"></div>
      </div>

      <section className="bg-surface-container border-2 border-outline-variant p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2 text-[10px] text-outline-variant font-label-mono">UI_THEME_MODULE</div>
        
        <h2 className="font-headline-md text-headline-md text-primary mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined">palette</span>
          THEME_COLOR_CALIBRATION
        </h2>

        <p className="text-on-surface-variant font-body-md mb-8 max-w-2xl opacity-80">
          Adjust the global aesthetic of the LAZPLAY OS. Selecting a new base color will automatically generate its respective gradients and variants across the entire interface.
        </p>

        <div className="flex flex-col md:flex-row gap-12 items-start">
          <div className="flex flex-col gap-4">
            <label className="font-label-mono text-label-mono text-outline-variant uppercase">MANUAL_COLOR_PICKER</label>
            <div className="flex items-center gap-4 bg-surface p-4 border-2 border-outline-variant">
              <input 
                type="color" 
                value={selectedColor}
                onChange={handleColorChange}
                className="w-16 h-16 cursor-pointer bg-transparent border-2 border-outline-variant p-1"
              />
              <div className="font-label-mono text-xl text-primary-container">{selectedColor.toUpperCase()}</div>
            </div>
          </div>

          <div className="flex-1">
            <label className="font-label-mono text-label-mono text-outline-variant uppercase mb-4 block">PRESET_PALETTES</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {presetColors.map((color) => (
                <button
                  key={color.hex}
                  onClick={() => handleColorChange({ target: { value: color.hex } })}
                  className={`flex items-center gap-3 p-3 border-2 transition-all group ${
                    selectedColor.toLowerCase() === color.hex.toLowerCase()
                      ? 'border-primary-container bg-primary-container/10'
                      : 'border-outline-variant hover:border-primary-container/50 bg-surface'
                  }`}
                >
                  <div 
                    className="w-6 h-6 border-2 border-outline" 
                    style={{ backgroundColor: color.hex }}
                  ></div>
                  <span className={`font-label-mono text-[10px] ${
                    selectedColor.toLowerCase() === color.hex.toLowerCase() ? 'text-primary-container' : 'text-on-surface-variant'
                  }`}>
                    {color.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-surface-container border-2 border-outline-variant p-8 opacity-50 cursor-not-allowed">
           <h3 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">monitor</span>
            SCANLINE_DENSITY
          </h3>
          <div className="h-2 bg-outline-variant w-full rounded-full overflow-hidden">
            <div className="h-full bg-primary-container w-1/2"></div>
          </div>
          <div className="mt-2 text-[10px] font-label-mono text-outline-variant text-right">MODULE_LOCKED_FOR_V1.1</div>
        </div>

        <div className="bg-surface-container border-2 border-outline-variant p-8 opacity-50 cursor-not-allowed">
           <h3 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">animation</span>
            CRT_FLICKER_INTENSITY
          </h3>
          <div className="h-2 bg-outline-variant w-full rounded-full overflow-hidden">
            <div className="h-full bg-primary-container w-3/4"></div>
          </div>
          <div className="mt-2 text-[10px] font-label-mono text-outline-variant text-right">MODULE_LOCKED_FOR_V1.1</div>
        </div>
      </section>

      <div className="mt-12 pt-8 border-t-2 border-outline-variant flex justify-between items-center">
        <div className="text-[10px] font-label-mono text-outline-variant">
          SESSION_ID: {Math.random().toString(36).substring(7).toUpperCase()}
          <br />
          HARDWARE_ACCEL: ENABLED
        </div>
        <button 
          onClick={() => window.location.href = '/'}
          className="bg-primary-container text-on-primary-fixed-variant px-8 py-3 font-label-mono text-label-mono font-bold hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(var(--primary-container-rgb),0.3)]"
        >
          RETURN_TO_DASHBOARD
        </button>
      </div>
    </div>
  );
}

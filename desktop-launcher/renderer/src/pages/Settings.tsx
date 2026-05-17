import { useState, useEffect } from "react";
import {
  Palette,
  Monitor,
  Activity,
  Cpu,
  CheckCircle,
  Sliders,
  Sparkles,
  RefreshCw
} from "lucide-react";

// Hex color brightness modifier for automatic lighter/darker shades
export const adjustColorBrightness = (hex: string, percent: number) => {
  let R = parseInt(hex.substring(1, 3), 16);
  let G = parseInt(hex.substring(3, 5), 16);
  let B = parseInt(hex.substring(5, 7), 16);

  R = Math.max(0, Math.min(255, Math.round(R * (1 + percent / 100))));
  G = Math.max(0, Math.min(255, Math.round(G * (1 + percent / 100))));
  B = Math.max(0, Math.min(255, Math.round(B * (1 + percent / 100))));

  const rHex = R.toString(16).padStart(2, "0");
  const gHex = G.toString(16).padStart(2, "0");
  const bHex = B.toString(16).padStart(2, "0");

  return `#${rHex}${gHex}${bHex}`;
};

export const hexToRgb = (hex: string) => {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  return `${r}, ${g}, ${b}`;
};

export const applyThemeColor = (primary: string, secondary: string) => {
  const root = document.documentElement;

  root.style.setProperty("--brand-500", primary);
  root.style.setProperty("--brand-600", adjustColorBrightness(primary, -20));
  root.style.setProperty("--brand-400", adjustColorBrightness(primary, 20));
  root.style.setProperty("--brand-rgb", hexToRgb(primary));

  root.style.setProperty("--secondary-color", secondary);
  root.style.setProperty("--secondary-600", adjustColorBrightness(secondary, -20));
  root.style.setProperty("--secondary-400", adjustColorBrightness(secondary, 20));
  root.style.setProperty("--secondary-rgb", hexToRgb(secondary));

  // Dynamically set an ultra-dark primary tint as the application background!
  const darkPrimaryBg = adjustColorBrightness(primary, -93);
  root.style.setProperty("--bg-primary-dark", darkPrimaryBg);

  localStorage.setItem("lazplay-launcher-color", primary);
  localStorage.setItem("lazplay-launcher-secondary", secondary);
};

export default function Settings() {
  const [primaryColor, setPrimaryColor] = useState("#39ff14");
  const [secondaryColor, setSecondaryColor] = useState("#ffabf3");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedPrimary = localStorage.getItem("lazplay-launcher-color") || "#39ff14";
    const savedSecondary = localStorage.getItem("lazplay-launcher-secondary") || "#ffabf3";
    setPrimaryColor(savedPrimary);
    setSecondaryColor(savedSecondary);
  }, []);

  const handlePrimaryChange = (color: string) => {
    setPrimaryColor(color);
    applyThemeColor(color, secondaryColor);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleSecondaryChange = (color: string) => {
    setSecondaryColor(color);
    applyThemeColor(primaryColor, color);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const presetColors = [
    { name: "NEON_GREEN", hex: "#39ff14" },
    { name: "CYBER_PINK", hex: "#fe00fe" },
    { name: "RETRO_CYAN", hex: "#00f6f6" },
    { name: "PLASMA_PURPLE", hex: "#9d00ff" },
    { name: "LASER_RED", hex: "#ff0000" },
    { name: "GOLDEN_EYE", hex: "#ffcc00" },
  ];

  return (
    <div className="w-full h-full bg-transparent text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      
      {/* Settings Navigation Header */}
      <header className="h-[70px] border-b border-slate-800/80 bg-slate-950/20 backdrop-blur-md flex-shrink-0 flex items-center justify-between px-8 relative z-20">
        <div className="flex items-center gap-3">
          <Sliders className="text-brand-500 animate-pulse" size={24} />
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-100 uppercase">
              SYSTEM_SETTINGS // LAZPLAY_OS
            </h1>
            <p className="text-[10px] font-mono text-brand-500 uppercase tracking-widest">
              HARDWARE: OPTIMAL // CALIBRATION: ONLINE
            </p>
          </div>
        </div>

        {isSaved && (
          <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-brand-500 animate-in fade-in duration-200">
            <CheckCircle size={14} />
            <span>CALIBRATION_SYNCHRONIZED_SUCCESS ✓</span>
          </span>
        )}
      </header>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        
        {/* Color Theme Customization Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Primary Color Calibration Card */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-6 relative overflow-hidden flex flex-col gap-6">
            <div className="absolute top-0 right-0 p-2.5 text-[8px] text-slate-600 font-mono tracking-widest">
              MODULE // PRIMARY
            </div>

            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <Palette className="text-brand-500" size={20} />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                PRIMARY_COLOR_CALIBRATION
              </h3>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Manual Color Picker input */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[9px] font-mono uppercase text-slate-500">MANUAL_CALIBRATION</span>
                <div className="flex items-center gap-4 bg-slate-900/60 p-4 border border-slate-800 rounded-lg">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => handlePrimaryChange(e.target.value)}
                    className="w-12 h-12 cursor-pointer bg-transparent border-0"
                  />
                  <div className="font-mono font-bold text-base text-brand-400">
                    {primaryColor.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Preset Selector Grid */}
              <div className="flex-1 space-y-2.5 w-full">
                <span className="text-[9px] font-mono uppercase text-slate-500 block">PRESET_VECTOR_BEAMS</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {presetColors.map((color) => (
                    <button
                      key={color.hex}
                      onClick={() => handlePrimaryChange(color.hex)}
                      className={`flex items-center gap-2.5 p-2.5 border transition-all rounded text-left ${
                        primaryColor.toLowerCase() === color.hex.toLowerCase()
                          ? "border-brand-500 bg-brand-500/10 text-brand-400 font-bold"
                          : "border-slate-800 hover:border-slate-700 bg-slate-900/40 text-slate-400"
                      }`}
                    >
                      <div className="w-3.5 h-3.5 rounded border border-black/40" style={{ backgroundColor: color.hex }} />
                      <span className="font-mono text-[9px] truncate tracking-wide">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Color Calibration Card */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-6 relative overflow-hidden flex flex-col gap-6">
            <div className="absolute top-0 right-0 p-2.5 text-[8px] text-slate-600 font-mono tracking-widest">
              MODULE // SECONDARY
            </div>

            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <Sparkles className="text-pink-500" size={20} />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                ACCENT_COLOR_CALIBRATION
              </h3>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Manual Color Picker */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[9px] font-mono uppercase text-slate-500">MANUAL_CALIBRATION</span>
                <div className="flex items-center gap-4 bg-slate-900/60 p-4 border border-slate-800 rounded-lg">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => handleSecondaryChange(e.target.value)}
                    className="w-12 h-12 cursor-pointer bg-transparent border-0"
                  />
                  <div className="font-mono font-bold text-base text-pink-400" style={{ color: secondaryColor }}>
                    {secondaryColor.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Preset Selector Grid */}
              <div className="flex-1 space-y-2.5 w-full">
                <span className="text-[9px] font-mono uppercase text-slate-500 block">ACCENT_PRESET_VECTORS</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {presetColors.map((color) => (
                    <button
                      key={color.hex}
                      onClick={() => handleSecondaryChange(color.hex)}
                      className={`flex items-center gap-2.5 p-2.5 border transition-all rounded text-left ${
                        secondaryColor.toLowerCase() === color.hex.toLowerCase()
                          ? "border-slate-300 bg-white/10 text-white font-bold"
                          : "border-slate-800 hover:border-slate-700 bg-slate-900/40 text-slate-400"
                      }`}
                      style={{
                        borderColor: secondaryColor.toLowerCase() === color.hex.toLowerCase() ? secondaryColor : undefined,
                        color: secondaryColor.toLowerCase() === color.hex.toLowerCase() ? secondaryColor : undefined,
                        backgroundColor: secondaryColor.toLowerCase() === color.hex.toLowerCase() ? `${secondaryColor}10` : undefined
                      }}
                    >
                      <div className="w-3.5 h-3.5 rounded border border-black/40" style={{ backgroundColor: color.hex }} />
                      <span className="font-mono text-[9px] truncate tracking-wide">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* General System Information Widgets (Bento Matrix) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="block text-[9px] font-mono uppercase text-slate-500">HARDWARE_ACCEL</span>
              <span className="text-xl font-black text-slate-100 uppercase tracking-wide">ENABLED</span>
            </div>
            <div className="w-10 h-10 rounded bg-brand-500/10 flex items-center justify-center text-brand-400">
              <Cpu size={20} />
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="block text-[9px] font-mono uppercase text-slate-500">LAUNCHER_VERSION</span>
              <span className="text-xl font-black text-slate-100 uppercase tracking-wide">V1.0.0_STABLE</span>
            </div>
            <div className="w-10 h-10 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Monitor size={20} />
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="block text-[9px] font-mono uppercase text-slate-500">TELEMETRY_BEACON</span>
              <span className="text-xl font-black text-slate-100 uppercase tracking-wide">SECURE</span>
            </div>
            <div className="w-10 h-10 rounded bg-brand-500/10 flex items-center justify-center text-brand-400">
              <Activity size={20} />
            </div>
          </div>
        </div>

        {/* Diagnostics & Reboot Protocol */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="space-y-1.5 text-center md:text-left">
            <h4 className="font-bold text-slate-200 uppercase tracking-tight">Launcher Calibration & Reset</h4>
            <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
              Re-synchronize the launcher UI container context or restore variables back to default storefront alignment protocols.
            </p>
          </div>
          <button
            onClick={() => {
              handlePrimaryChange("#39ff14");
              handleSecondaryChange("#ffabf3");
            }}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-brand-500/30 hover:bg-brand-500/5 active:scale-[0.98] transition-all px-5 py-3 rounded-lg text-xs font-mono font-bold text-brand-400"
          >
            <RefreshCw size={14} className="animate-spin-slow" />
            <span>RESTORE_STOREFRONT_DEFAULTS</span>
          </button>
        </div>
      </div>
    </div>
  );
}

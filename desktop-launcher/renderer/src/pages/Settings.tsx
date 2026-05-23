import { useState, useEffect } from "react";
import {
  Palette,
  Monitor,
  Activity,
  Cpu,
  Sliders
} from "lucide-react";

// Hex color brightness modifier for automatic shades
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

export const applyThemeColor = (primary: string, secondary: string, isDark: boolean) => {
  const root = document.documentElement;

  // 1. Primary Scales
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-rgb", hexToRgb(primary));
  root.style.setProperty("--primary-container", isDark ? adjustColorBrightness(primary, -75) : "rgba(46, 164, 79, 0.15)");
  root.style.setProperty("--on-primary-container", isDark ? adjustColorBrightness(primary, 20) : "#2ea44f");
  root.style.setProperty("--on-primary", isDark ? adjustColorBrightness(primary, -90) : "#ffffff");
  root.style.setProperty("--primary-fixed", adjustColorBrightness(primary, 10));
  root.style.setProperty("--primary-fixed-dim", adjustColorBrightness(primary, -10));
  root.style.setProperty("--on-primary-fixed", adjustColorBrightness(primary, -90));
  root.style.setProperty("--on-primary-fixed-variant", adjustColorBrightness(primary, 10));

  // 2. Secondary Scales
  root.style.setProperty("--secondary", secondary);
  root.style.setProperty("--secondary-rgb", hexToRgb(secondary));
  root.style.setProperty("--secondary-container", adjustColorBrightness(secondary, -75));
  root.style.setProperty("--on-secondary-container", adjustColorBrightness(secondary, 20));
  root.style.setProperty("--secondary-fixed", adjustColorBrightness(secondary, 15));
  root.style.setProperty("--secondary-fixed-dim", adjustColorBrightness(secondary, -5));
  root.style.setProperty("--on-secondary-fixed", adjustColorBrightness(secondary, -90));
  root.style.setProperty("--on-secondary-fixed-variant", adjustColorBrightness(secondary, -20));

  // 3. Tertiary Scales
  const tertiary = adjustColorBrightness(primary, 80);
  root.style.setProperty("--tertiary", tertiary);
  root.style.setProperty("--tertiary-container", primary);
  root.style.setProperty("--on-tertiary-container", adjustColorBrightness(primary, -60));
  root.style.setProperty("--tertiary-fixed", adjustColorBrightness(primary, 10));
  root.style.setProperty("--tertiary-fixed-dim", adjustColorBrightness(primary, -10));
  root.style.setProperty("--on-tertiary-fixed", adjustColorBrightness(primary, -85));
  root.style.setProperty("--on-tertiary-fixed-variant", adjustColorBrightness(primary, -50));

  // 4. Outlines
  root.style.setProperty("--outline", primary);
  root.style.setProperty("--outline-variant", primary);

  // 5. Surfacing & Backgrounds (Standard Website Dark UI Theme vs Light Theme)
  if (isDark) {
    root.style.setProperty("--surface", "#18181a");
    root.style.setProperty("--bg-primary-dark", "#18181a");
    root.style.setProperty("--surface-container", "#232326");
    root.style.setProperty("--surface-container-low", "#1e1e21");
    root.style.setProperty("--surface-container-high", "#2f2f35");
    root.style.setProperty("--surface-container-highest", "#38383e");
    root.style.setProperty("--surface-container-lowest", "#0e0e10");
    root.style.setProperty("--surface-dim", "#18181a");
    root.style.setProperty("--surface-bright", "#3f3f46");
    root.style.setProperty("--surface-variant", "#2b2b2f");
    root.style.setProperty("--on-surface", "#ffffff");
    root.style.setProperty("--on-surface-variant", "#9ca3af");
    root.style.setProperty("--on-surface-text", "#e2e8f0"); // slate-200
    root.style.setProperty("--outline-variant", "#2d2d31");
    root.style.setProperty("--outline", "#4b5563");
  } else {
    root.style.setProperty("--surface", "#f4f4f7");
    root.style.setProperty("--bg-primary-dark", "#f4f4f7");
    root.style.setProperty("--surface-container", "#ffffff");
    root.style.setProperty("--surface-container-low", "#fcfcfd");
    root.style.setProperty("--surface-container-high", "#f3f4f6");
    root.style.setProperty("--surface-container-highest", "#e5e7eb");
    root.style.setProperty("--surface-container-lowest", "#f4f4f7");
    root.style.setProperty("--surface-dim", "#e4e4e7");
    root.style.setProperty("--surface-bright", "#f4f4f7");
    root.style.setProperty("--surface-variant", "#e4e4e7");
    root.style.setProperty("--on-surface", "#1c1c1c");
    root.style.setProperty("--on-surface-variant", "#5b626e");
    root.style.setProperty("--on-surface-text", "#1f2937"); // gray-800
    root.style.setProperty("--outline-variant", "#e1e4e8");
    root.style.setProperty("--outline", "#c9d1d9");
  }

  // 6. Inverses & Slate Overrides
  root.style.setProperty("--inverse-surface", isDark ? "#e5e2e1" : "#313030");
  root.style.setProperty("--inverse-on-surface", isDark ? "#313030" : "#e5e2e1");
  root.style.setProperty("--inverse-primary", adjustColorBrightness(primary, 10));

  // Legacy variables support
  root.style.setProperty("--brand-500", primary);
  root.style.setProperty("--brand-600", adjustColorBrightness(primary, -20));
  root.style.setProperty("--brand-400", adjustColorBrightness(primary, 20));
  root.style.setProperty("--secondary-color", secondary);
  root.style.setProperty("--secondary-600", adjustColorBrightness(secondary, -20));
  root.style.setProperty("--secondary-400", adjustColorBrightness(secondary, 20));
};

export const applyTheme = (theme: "system" | "light" | "dark") => {
  let isDark = true;
  if (theme === "light") {
    isDark = false;
  } else if (theme === "system") {
    isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  applyThemeColor("#2ea44f", "#2c974b", isDark);
};

export default function Settings() {
  const [themePref, setThemePref] = useState<"system" | "light" | "dark">("system");

  useEffect(() => {
    const saved = localStorage.getItem("lazplay-launcher-theme") || "system";
    setThemePref(saved as any);
  }, []);

  const handleThemeChange = (newTheme: "system" | "light" | "dark") => {
    setThemePref(newTheme);
    localStorage.setItem("lazplay-launcher-theme", newTheme);
    applyTheme(newTheme);
  };

  return (
    <div className="w-full h-full bg-transparent text-on-surface flex flex-col font-sans select-none overflow-hidden">
      
      {/* Settings Navigation Header */}
      <header className="h-[70px] border-b border-outline-variant bg-surface-container/20 backdrop-blur-md flex-shrink-0 flex items-center justify-between px-8 relative z-20">
        <div className="flex items-center gap-3">
          <Sliders className="text-primary" size={24} />
          <div>
            <h1 className="text-lg font-black tracking-tight text-on-surface uppercase">
              Settings
            </h1>
            <p className="text-[10px] font-mono text-primary uppercase tracking-widest">
              Calibration: Complete
            </p>
          </div>
        </div>
      </header>

      {/* Settings Content */}
      <div className="flex-1 flex flex-col gap-8 p-8 max-w-4xl mx-auto w-full overflow-y-auto">
        
        {/* General System Information Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="block text-[9px] font-mono uppercase text-on-surface-variant">Hardware Acceleration</span>
              <span className="text-xl font-black text-on-surface uppercase tracking-wide">Enabled</span>
            </div>
            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
              <Cpu size={20} />
            </div>
          </div>

          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="block text-[9px] font-mono uppercase text-on-surface-variant">Launcher Version</span>
              <span className="text-xl font-black text-on-surface uppercase tracking-wide">V1.0.0 Stable</span>
            </div>
            <div className="w-10 h-10 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Monitor size={20} />
            </div>
          </div>

          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="block text-[9px] font-mono uppercase text-on-surface-variant">Telemetry Connection</span>
              <span className="text-xl font-black text-on-surface uppercase tracking-wide">Secure</span>
            </div>
            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
              <Activity size={20} />
            </div>
          </div>
        </div>

        {/* Color Theme Selector Section */}
        <section className="bg-surface-container border border-outline-variant rounded-xl p-8 relative overflow-hidden">
          <h2 className="text-base font-bold text-on-surface mb-6 flex items-center gap-2 uppercase tracking-tight">
            <Palette className="text-primary" size={20} />
            Color Theme Preference
          </h2>

          <div className="flex flex-col sm:flex-row gap-4">
            {[
              { id: "system", name: "System Default" },
              { id: "light", name: "Light Theme" },
              { id: "dark", name: "Dark Theme" }
            ].map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id as any)}
                className={`flex-1 py-3 border rounded-lg transition-all text-center text-xs font-semibold ${
                  themePref === theme.id
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-[0_0_10px_rgba(46,164,79,0.15)]"
                    : "border-outline-variant hover:border-primary/50 text-on-surface-variant bg-surface"
                }`}
              >
                {theme.name}
              </button>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

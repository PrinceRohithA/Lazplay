import React from 'react';
import { Link } from 'react-router-dom';

export default function DeveloperWorkspace() {
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
            NODE: ALPHA_TANGO // STATUS: ONLINE // UPTIME: 99.9%
          </p>
        </div>
        <div className="flex gap-2">
          <button className="bg-surface-container border-2 border-outline-variant px-4 py-2 font-label-mono text-label-mono text-on-surface hover:border-primary hover:text-primary transition-colors flex items-center gap-2 group">
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
        {/*  Analytics: Downloads (8-bit style)  */}
        <div className="col-span-12 lg:col-span-8 bg-surface border-2 border-outline-variant hover:border-secondary-container transition-colors group relative overflow-hidden flex flex-col">
          <div className="bg-surface-container border-b-2 border-outline-variant px-3 py-1.5 flex justify-between items-center group-hover:bg-surface-container-high transition-colors">
            <span className="font-label-mono text-label-mono text-secondary-container drop-shadow-[0_0_4px_rgba(254,0,254,0.4)]">TRAFFIC_ANALYTICS.exe</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 border border-outline-variant"></div>
              <div className="w-3 h-3 border border-outline-variant"></div>
              <div className="w-3 h-3 bg-outline-variant border border-outline-variant"></div>
            </div>
          </div>
          <div className="p-4 flex-1 flex flex-col gap-4 relative">
            <div className="flex justify-between items-baseline">
              <div>
                <span className="font-label-mono text-label-mono text-on-surface-variant block mb-1">GLOBAL_DOWNLOADS [30D]</span>
                <span className="font-headline-lg text-headline-lg text-secondary-container drop-shadow-[0_0_8px_rgba(254,0,254,0.6)] block">8,492,011</span>
              </div>
              <span className="bg-surface-container border-2 border-secondary-container text-secondary-container font-label-mono text-label-mono px-2 py-1 flex items-center gap-1 shadow-[2px_2px_0_0_#fe00fe]">
                <span className="material-symbols-outlined text-[10px]">trending_up</span> +14.2%
              </span>
            </div>
            <div className="flex-1 flex items-end gap-1 mt-4 h-32 w-full border-b-2 border-l-2 border-outline-variant pt-2 pr-2 relative">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(60,75,53,0.3)_1px,transparent_1px)] bg-[length:100%_20px] pointer-events-none"></div>
              <div className="flex-1 bg-surface-container border-t-2 border-outline-variant h-[20%] group-hover:bg-secondary-fixed-dim transition-all"></div>
              <div className="flex-1 bg-surface-container border-t-2 border-outline-variant h-[35%] group-hover:bg-secondary-fixed-dim transition-all"></div>
              <div className="flex-1 bg-surface-container border-t-2 border-outline-variant h-[25%] group-hover:bg-secondary-fixed-dim transition-all"></div>
              <div className="flex-1 bg-surface-container border-t-2 border-outline-variant h-[50%] group-hover:bg-secondary-fixed-dim transition-all"></div>
              <div className="flex-1 bg-surface-container border-t-2 border-outline-variant h-[45%] group-hover:bg-secondary-fixed-dim transition-all"></div>
              <div className="flex-1 bg-surface-container border-t-2 border-outline-variant h-[70%] group-hover:bg-secondary-fixed-dim transition-all"></div>
              <div className="flex-1 bg-secondary-container border-t-2 border-secondary-fixed h-[90%] shadow-[0_0_10px_#fe00fe] relative">
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 font-label-mono text-[10px] text-secondary-fixed">MAX</span>
              </div>
              <div className="flex-1 bg-surface-container border-t-2 border-outline-variant h-[60%] group-hover:bg-secondary-fixed-dim transition-all"></div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
          <div className="bg-surface border-2 border-outline-variant p-4 hover:border-primary-container transition-all group flex-1 flex flex-col justify-center">
            <span className="font-label-mono text-label-mono text-on-surface-variant flex justify-between">
              ACTIVE_INSTANCES 
              <span className="text-primary-container animate-pulse">●</span>
            </span>
            <span className="font-headline-md text-headline-md text-on-surface mt-2 block group-hover:text-primary-container transition-colors">402 / 500</span>
            <div className="flex gap-1 mt-4 h-3 w-full">
              <div className="flex-1 bg-primary-container shadow-[0_0_5px_#39ff14]"></div>
              <div className="flex-1 bg-primary-container shadow-[0_0_5px_#39ff14]"></div>
              <div className="flex-1 bg-primary-container shadow-[0_0_5px_#39ff14]"></div>
              <div className="flex-1 bg-primary-container shadow-[0_0_5px_#39ff14]"></div>
              <div className="flex-1 bg-surface-container border border-outline-variant"></div>
            </div>
          </div>
          <div className="bg-surface border-2 border-outline-variant p-4 hover:border-error transition-all group flex-1 flex flex-col justify-center">
            <span className="font-label-mono text-label-mono text-on-surface-variant flex justify-between">
              SERVER_LOAD 
              <span className="text-error font-bold block">WARN</span>
            </span>
            <span className="font-headline-md text-headline-md text-error mt-2 block drop-shadow-[0_0_5px_rgba(255,180,171,0.5)]">89.4%</span>
            <div className="w-full h-8 mt-4 border-2 border-error-container bg-surface-container-lowest relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 bg-error w-[89.4%] shadow-[0_0_10px_#ffb4ab] opacity-80 flex items-center justify-end pr-2">
                <span className="font-label-mono text-[10px] text-on-error">CRIT_THRESHOLD_NEAR</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 bg-surface-container-lowest border-2 border-outline-variant flex flex-col h-[500px] shadow-[8px_8px_0_0_rgba(60,75,53,0.5)] mb-8">
          <div className="bg-surface-container border-b-2 border-outline-variant px-4 py-2 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary-container">terminal</span>
              <span className="font-label-mono text-label-mono text-on-surface font-bold">PROJECT_TERMINAL :: ROOT_ACCESS</span>
            </div>
          </div>
          <div className="flex-1 p-4 font-label-mono text-label-mono text-primary-container overflow-y-auto flex flex-col gap-1 leading-relaxed">
            <p className="text-on-surface-variant opacity-70">LAZPLAY OS v.1.0.4 - Authentication Successful.</p>
            <p className="text-on-surface-variant opacity-70">Last login: Wed Oct 25 14:32:01 1989 from 192.168.1.100</p>
            <p className="mt-4"><span className="text-secondary-container">sys_admin@arcade:~$</span> scan_projects --status=active</p>
            <div className="mt-2 border border-outline-variant p-2 bg-surface-dim">
              <div className="grid grid-cols-12 gap-2 text-on-surface-variant border-b border-outline-variant pb-1 mb-1">
                <div className="col-span-3">PROJECT_ID</div>
                <div className="col-span-2">VERSION</div>
                <div className="col-span-3">LAST_UPDATE</div>
                <div className="col-span-2">SIZE</div>
                <div className="col-span-2">STATUS</div>
              </div>
              <div className="grid grid-cols-12 gap-2 text-primary-container hover:bg-surface-container cursor-pointer transition-colors py-1 group">
                <div className="col-span-3">NEON_DRIFTER</div>
                <div className="col-span-2">v.2.4.1</div>
                <div className="col-span-3">2023-10-24 08:12</div>
                <div className="col-span-2">450MB</div>
                <div className="col-span-2 text-secondary-container font-bold">LIVE</div>
              </div>
              <div className="grid grid-cols-12 gap-2 text-primary-container hover:bg-surface-container cursor-pointer transition-colors py-1 group">
                <div className="col-span-3">STELLAR_BLAST</div>
                <div className="col-span-2">v.1.0.0</div>
                <div className="col-span-3">2023-10-23 18:45</div>
                <div className="col-span-2">128MB</div>
                <div className="col-span-2 text-primary-container font-bold">LIVE</div>
              </div>
            </div>
            <div className="mt-auto pt-4 flex items-center">
              <span className="text-secondary-container mr-2">sys_admin@arcade:~$</span>
              <input className="bg-transparent border-none outline-none font-label-mono text-label-mono text-primary-container flex-1 focus:ring-0 p-0 caret-transparent" readOnly type="text" value="upload_package --force"/>
              <span className="w-2 h-4 bg-primary-container cursor-blink inline-block ml-1"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

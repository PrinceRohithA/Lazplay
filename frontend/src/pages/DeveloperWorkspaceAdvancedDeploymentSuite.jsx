import React from 'react';

export default function DeveloperWorkspaceAdvancedDeploymentSuite() {
  return (
    <div className="p-gutter min-h-screen flex flex-col gap-gutter bg-background pb-12">
      {/*  Header Section  */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-4">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-primary-container uppercase leading-none">ADVANCED_DEPLOYMENT_SUITE</h1>
          <p className="font-label-mono text-on-surface-variant mt-2 tracking-widest">&gt; INITIALIZING UPLOAD SEQUENCE... STATUS: WAITING_FOR_INPUT</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-4 h-4 bg-primary-container"></div>
            <div className="w-4 h-4 bg-primary-container"></div>
            <div className="w-4 h-4 bg-primary-container"></div>
            <div className="w-4 h-4 bg-surface-container-highest"></div>
            <div className="w-4 h-4 bg-surface-container-highest"></div>
          </div>
          <span className="font-label-mono text-label-mono text-primary-fixed ml-2">STEP 03 / 05</span>
        </div>
      </section>

      {/*  Bento Grid Layout  */}
      <div className="grid grid-cols-12 gap-gutter">
        {/*  Metadata Card  */}
        <div className="col-span-12 lg:col-span-7 bg-surface-container-low pixel-border p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <h3 className="font-label-mono text-primary-fixed text-label-mono flex items-center gap-2">
              <span className="material-symbols-outlined">info</span> GAME_METADATA
            </h3>
            <span className="text-[10px] font-label-mono text-on-surface-variant">ID: 449-X-ALPHA</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <div className="space-y-2">
              <label className="block font-label-mono text-[10px] text-on-surface-variant">_TITLE</label>
              <div className="flex items-center bg-surface-container text-primary-container p-3 border border-outline-variant focus-within:border-primary-container">
                <span className="mr-2">&gt;</span>
                <input className="bg-transparent border-none focus:ring-0 p-0 w-full uppercase font-label-mono" placeholder="ENTER_PROJECT_NAME" type="text" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block font-label-mono text-[10px] text-on-surface-variant">_VERSION</label>
              <div className="flex items-center bg-surface-container text-primary-container p-3 border border-outline-variant focus-within:border-primary-container">
                <span className="mr-2">&gt;</span>
                <input className="bg-transparent border-none focus:ring-0 p-0 w-full font-label-mono" type="text" defaultValue="v1.0.4" />
              </div>
            </div>
            <div className="col-span-full space-y-2">
              <label className="block font-label-mono text-[10px] text-on-surface-variant">_DESCRIPTION</label>
              <textarea className="w-full bg-surface-container border border-outline-variant text-on-surface font-label-mono p-3 focus:border-primary-container focus:ring-0" placeholder="DECRYPT_CONTENT_SYNOPSIS..." rows="4"></textarea>
            </div>
          </div>
        </div>

        {/*  Hardware Specs Card  */}
        <div className="col-span-12 lg:col-span-5 bg-surface-container-low pixel-border p-6 flex flex-col">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3 mb-6">
            <h3 className="font-label-mono text-primary-fixed text-label-mono flex items-center gap-2">
              <span className="material-symbols-outlined">settings_input_component</span> HARDWARE_SPECS
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {['PC_SYSTEM', 'CONSOLE_OS', 'VR_INTERFACE', 'CLOUD_RELAY'].map((spec, i) => (
              <label key={spec} className="group flex items-center gap-3 p-4 bg-surface-container border border-outline-variant cursor-pointer hover:border-primary-container transition-all">
                <input defaultChecked={i % 2 === 0} className="form-checkbox bg-transparent border-2 border-outline-variant text-primary-container rounded-none focus:ring-0" type="checkbox" />
                <span className="font-label-mono text-label-mono group-hover:text-primary-container">{spec}</span>
              </label>
            ))}
          </div>
          <div className="mt-auto pt-6 border-t border-outline-variant mt-8">
            <div className="flex justify-between items-center mb-2">
              <span className="font-label-mono text-[10px] text-on-surface-variant">ESTIMATED_BANDWIDTH</span>
              <span className="font-label-mono text-label-mono text-tertiary-fixed">12.4 GB/S</span>
            </div>
            <div className="h-2 w-full bg-surface-container relative">
              <div className="h-full bg-tertiary-container shadow-[0_0_8px_#00f6f6]" style={{ width: "65%" }}></div>
            </div>
          </div>
        </div>

        {/*  Categorization Module  */}
        <div className="col-span-12 lg:col-span-6 bg-surface-container-low pixel-border p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <h3 className="font-label-mono text-primary-fixed text-label-mono flex items-center gap-2">
              <span className="material-symbols-outlined">label</span> CATEGORIZATION
            </h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block font-label-mono text-[10px] text-on-surface-variant mb-2">_GENRE_TAGS (MULTI-SELECT)</label>
              <div className="flex flex-wrap gap-2">
                {['ACTION', 'RPG', 'STRATEGY', 'ADVENTURE', 'SIMULATION'].map((tag, i) => (
                  <button key={tag} className={`px-4 py-2 border font-label-mono text-[10px] transition-colors ${i % 2 === 0 ? 'border-primary-container text-primary-container bg-primary-container/10' : 'border-outline-variant text-on-surface'}`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block font-label-mono text-[10px] text-on-surface-variant mb-2">_CUSTOM_USER_TAGS</label>
              <div className="flex items-center bg-surface-container text-primary-container p-3 border border-outline-variant focus-within:border-primary-container">
                <span className="mr-2">&gt;</span>
                <input className="bg-transparent border-none focus:ring-0 p-0 w-full font-label-mono text-[12px] uppercase" placeholder="ADD_TAG_AND_PRESS_ENTER" type="text" />
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {['CYBERPUNK', 'PERMADEATH'].map(tag => (
                  <span key={tag} className="flex items-center gap-2 px-3 py-1 bg-surface-container-highest text-primary-container font-label-mono text-[10px] border border-outline-variant">
                    {tag} <span className="material-symbols-outlined text-[14px] cursor-pointer hover:text-error transition-colors">close</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/*  Store Info Module  */}
        <div className="col-span-12 lg:col-span-6 bg-surface-container-low pixel-border p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <h3 className="font-label-mono text-primary-fixed text-label-mono flex items-center gap-2">
              <span className="material-symbols-outlined">storefront</span> STORE_INTEGRATION
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <div className="space-y-2">
              <label className="block font-label-mono text-[10px] text-on-surface-variant">_LICENSING_MODEL</label>
              <div className="relative bg-surface-container border border-outline-variant focus-within:border-primary-container">
                <select className="w-full bg-transparent border-none text-primary-container font-label-mono p-3 appearance-none focus:ring-0 cursor-pointer text-[12px] outline-none">
                  <option value="premium">PREMIUM (PAID)</option>
                  <option value="f2p">FREE_TO_PLAY (F2P)</option>
                  <option value="subscription">SUBSCRIPTION_ACCESS</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary-container">expand_more</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block font-label-mono text-[10px] text-on-surface-variant">_BASE_PRICE (USD)</label>
              <div className="flex items-center bg-surface-container text-primary-container p-3 border border-outline-variant focus-within:border-primary-container">
                <span className="mr-2 text-on-surface-variant font-label-mono">$</span>
                <input className="bg-transparent border-none focus:ring-0 p-0 w-full font-label-mono text-[12px]" type="number" defaultValue="29.99" />
              </div>
            </div>
          </div>
          <div className="mt-auto pt-4 border-t border-outline-variant">
            <p className="font-label-mono text-[10px] text-on-surface-variant leading-relaxed tracking-wide">&gt; NOTE: REGIONAL PRICING WILL BE AUTO-CALCULATED BASED ON BASE USD VALUE UPON SUBMISSION TO MAINFRAME.</p>
          </div>
        </div>

        {/*  System Requirements Module  */}
        <div className="col-span-12 bg-surface-container-low pixel-border p-6 flex flex-col">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3 mb-6">
            <h3 className="font-label-mono text-primary-fixed text-label-mono flex items-center gap-2">
              <span className="material-symbols-outlined">memory</span> SYSTEM_REQUIREMENTS
            </h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="font-label-mono text-[12px] text-tertiary-fixed border-b border-outline-variant pb-2">_MINIMUM_SPECS</h4>
              {['CPU: INTEL CORE I5-6600K', 'RAM: 8 GB SYSTEM MEMORY', 'GPU: NVIDIA GTX 1060 6GB', 'STORAGE: 50 GB SSD'].map(spec => (
                <div key={spec} className="grid grid-cols-[80px_1fr] items-center gap-4">
                  <label className="font-label-mono text-[10px] text-on-surface-variant">{spec.split(':')[0]}</label>
                  <input className="bg-surface-container border border-outline-variant text-on-surface font-label-mono text-[12px] p-2 focus:border-primary-container focus:ring-0 w-full uppercase" type="text" defaultValue={spec.split(': ')[1]} />
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <h4 className="font-label-mono text-[12px] text-primary-container border-b border-outline-variant pb-2">_RECOMMENDED_SPECS</h4>
              {['CPU: INTEL CORE I7-9700K', 'RAM: 16 GB SYSTEM MEMORY', 'GPU: NVIDIA RTX 2070 SUPER', 'STORAGE: 50 GB NVME SSD'].map(spec => (
                <div key={spec} className="grid grid-cols-[80px_1fr] items-center gap-4">
                  <label className="font-label-mono text-[10px] text-on-surface-variant">{spec.split(':')[0]}</label>
                  <input className="bg-surface-container border border-outline-variant text-on-surface font-label-mono text-[12px] p-2 focus:border-primary-container focus:ring-0 w-full uppercase" type="text" defaultValue={spec.split(': ')[1]} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/*  Asset Deployment Card  */}
        <div className="col-span-12 bg-surface-container-low pixel-border p-6">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3 mb-6">
            <h3 className="font-label-mono text-primary-fixed text-label-mono flex items-center gap-2">
              <span className="material-symbols-outlined">cloud_upload</span> ASSET_DEPLOYMENT
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { icon: 'image', label: 'HERO_BANNER', sub: '.PNG / .JPG' },
              { icon: 'collections', label: 'SCREENSHOTS', sub: 'UP TO 10' },
              { icon: 'movie', label: 'VIDEO_TRAILER', sub: '.MP4 (MAX 1GB)' },
              { icon: 'folder_zip', label: 'GAME_BINARIES', sub: '.EXE, .PKG' }
            ].map(slot => (
              <div key={slot.label} className="border-2 border-dashed border-outline-variant p-6 flex flex-col items-center justify-center text-center bg-surface-container-lowest hover:border-primary-container transition-colors group cursor-pointer min-h-[140px]">
                <span className="material-symbols-outlined text-headline-md text-outline group-hover:text-primary-container mb-2">{slot.icon}</span>
                <p className="font-label-mono text-[12px] uppercase tracking-wider mb-1 text-on-surface">{slot.label}</p>
                <p className="font-label-mono text-[8px] text-on-surface-variant">{slot.sub}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-surface-container-highest border-l-4 border-primary-container flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary-container">image</span>
                <div className="flex flex-col">
                  <span className="font-label-mono text-[10px]">HERO_BANNER.PNG</span>
                  <span className="font-label-mono text-[8px] text-on-surface-variant">2.4 MB // COMPLETED</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant text-sm cursor-pointer hover:text-error transition-colors">close</span>
            </div>
          </div>
        </div>

        {/*  Terminal Log Area  */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest pixel-border-active p-4 flex flex-col h-64">
          <div className="flex items-center gap-2 mb-3 px-2 border-b border-outline-variant pb-2">
            <div className="w-3 h-3 rounded-full bg-error"></div>
            <div className="w-3 h-3 rounded-full bg-secondary-container"></div>
            <div className="w-3 h-3 rounded-full bg-primary-container"></div>
            <span className="ml-4 font-label-mono text-[10px] text-primary-fixed uppercase tracking-widest">DEPLOYMENT_LOG_CONSOLE_V1.0</span>
          </div>
          <div className="overflow-y-auto flex-1 font-label-mono text-[11px] space-y-1 p-2 text-primary-container/80">
            <p><span className="text-on-surface-variant">[14:22:01]</span> INITIALIZING_HANDSHAKE_PROTOCOL...</p>
            <p><span className="text-on-surface-variant">[14:22:02]</span> LINKING_TO_MAINFRAME_CENTRAL_CORE...</p>
            <p><span className="text-on-surface-variant">[14:22:12]</span> &gt; READY_FOR_DEPLOYMENT_COMMAND_SIGNAL</p>
            <p className="animate-pulse">_</p>
          </div>
        </div>

        {/*  Action Area  */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
          <button className="w-full h-full bg-primary-container text-on-primary-container font-headline-md p-6 pixel-border-active hover:scale-[1.02] active:scale-95 transition-all flex flex-col items-center justify-center gap-4 group min-h-[150px]">
            <span className="material-symbols-outlined text-headline-xl group-hover:scale-110 transition-transform">rocket_launch</span>
            <span className="uppercase tracking-tighter font-extrabold">INITIATE_DEPLOY</span>
            <span className="font-label-mono text-[10px] opacity-70">CONFIRM_HARDWARE_LOCK_ENABLED</span>
          </button>
          <button className="w-full py-4 border-2 border-outline-variant text-on-surface-variant font-label-mono hover:bg-surface-variant transition-colors uppercase">
            ABORT_SEQUENCE
          </button>
        </div>
      </div>
    </div>
  );
}

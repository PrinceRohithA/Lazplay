import React from 'react';

export default function DeveloperWorkspaceNewDeployment() {
  return (
    <div className="p-gutter min-h-screen flex flex-col gap-gutter bg-background pb-12">
      {/*  Header Section  */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-4">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-primary-container uppercase leading-none">NEW_DEPLOYMENT</h1>
          <p className="font-label-mono text-on-surface-variant mt-2 tracking-widest">&gt; INITIALIZING UPLOAD SEQUENCE... STATUS: WAITING_FOR_INPUT</p>
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <div className="space-y-2">
              <label className="block font-label-mono text-[10px] text-on-surface-variant">_TITLE</label>
              <div className="flex items-center bg-surface-container text-primary-container p-3 border border-outline-variant focus-within:border-primary-container">
                <span className="mr-2">&gt;</span>
                <input className="bg-transparent border-none focus:ring-0 p-0 w-full uppercase font-label-mono" placeholder="ENTER_PROJECT_NAME" type="text"/>
              </div>
            </div>
          </div>
        </div>
        
        {/* Asset Deployment */}
        <div className="col-span-12 bg-surface-container-low pixel-border p-6">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3 mb-6">
            <h3 className="font-label-mono text-primary-fixed text-label-mono flex items-center gap-2">
              <span className="material-symbols-outlined">cloud_upload</span> ASSET_DEPLOYMENT
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            <div className="col-span-1 md:col-span-2 border-2 border-dashed border-outline-variant p-8 flex flex-col items-center justify-center text-center bg-surface-container-lowest hover:border-primary-container transition-colors group cursor-pointer">
              <span className="material-symbols-outlined text-headline-xl text-outline group-hover:text-primary-container mb-4">upload_file</span>
              <p className="font-label-mono text-body-md uppercase tracking-wider mb-2">Drag &amp; Drop Game Binaries</p>
            </div>
          </div>
        </div>

        {/*  Action Area  */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
          <button className="w-full h-full bg-primary-container text-on-primary-container font-headline-md p-6 pixel-border-active hover:scale-[1.02] active:scale-95 transition-all flex flex-col items-center justify-center gap-4 group">
            <span className="material-symbols-outlined text-headline-xl group-hover:scale-110 transition-transform">rocket_launch</span>
            <span className="uppercase tracking-tighter font-extrabold">INITIATE_DEPLOY</span>
          </button>
        </div>
      </div>
    </div>
  );
}

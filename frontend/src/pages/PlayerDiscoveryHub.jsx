import React from 'react';
import { Link } from 'react-router-dom';

export default function PlayerDiscoveryHub() {
  return (
    <div className="flex flex-col gap-margin p-gutter md:p-margin">
      {/*  Hero Carousel Area  */}
      <section className="w-full relative border-2 border-outline-variant bg-surface-container-low retro-border h-[400px] flex flex-col">
        <div className="bg-surface-container-highest border-b-2 border-outline-variant px-4 py-1 flex justify-between items-center">
          <span className="font-label-mono text-label-mono text-primary-container">&gt; FEATURED_PROTOCOL.EXE</span>
          <div className="flex gap-2">
            <span className="w-3 h-3 bg-error inline-block border border-on-surface"></span>
            <span className="w-3 h-3 bg-secondary-container inline-block border border-on-surface"></span>
            <span className="w-3 h-3 bg-primary-container inline-block border border-on-surface"></span>
          </div>
        </div>
        <div className="flex-1 relative w-full h-full">
          <img alt="Featured Game Hero" className="w-full h-full object-cover opacity-80 mix-blend-luminosity grayscale hover:grayscale-0 transition-all duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDB5l8_2ZRmLC1n16I24FMMADDCZxwS6JscWsm2D8MvdCzka-NjfuHvd_KjhYScjv_b19ngm1WWqsgwoUxV4ygzPoKB-a8BB4QszlDn6v285IQFQqlgCmVmBrCvYMd4enHnsKJWmOBHBQTNNstZKFFrQLEjCFaeTf-5Hw_KaShDa_2doPNvpvBWjSo47gwaC_Yw5euMOvcnouvcTudO3NwNYXoFnIs8lRnQl2AVpI1AFXFovc9u5MvAocO1uqKXKlaGsiOXoQKVaOi"/>
          <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-background to-transparent flex justify-between items-end">
            <div>
              <h1 className="font-headline-xl text-headline-xl text-primary-container font-bold drop-shadow-[0_0_8px_rgba(57,255,20,0.8)] mb-2 uppercase tracking-tight">Neon_Drifter_84</h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl bg-surface-container-highest/80 p-2 border border-outline-variant">
                HIGH-SPEED SYNTHWAVE RACING PROTOCOL. ENGAGE HYPER-DRIVE.
              </p>
            </div>
            <Link to="/game" className="bg-primary-container text-on-primary-container font-label-mono text-label-mono px-6 py-3 border-2 border-primary-container hover:bg-surface hover:text-primary-container transition-colors shadow-[4px_4px_0_0_#107100] active:translate-y-1 active:translate-x-1 active:shadow-[0_0_0_0_#107100]">
              &gt; EXECUTE_PLAY
            </Link>
          </div>
        </div>
      </section>

      {/*  Layout Grid: Recently Played + Sidebar  */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-margin">
        {/*  Main Grid: Recently Played  */}
        <div className="lg:col-span-9 space-y-4">
          <div className="flex justify-between items-end border-b-2 border-outline-variant pb-2">
            <h2 className="font-headline-md text-headline-md text-on-surface uppercase tracking-wide flex items-center gap-2">
              <span className="text-primary-container">&gt;</span> RECENT_MEMORY_BANKS
            </h2>
            <a className="font-label-mono text-label-mono text-on-surface-variant hover:text-primary-container underline decoration-dotted" href="#">VIEW_ALL</a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="bg-surface-container border-2 border-outline-variant retro-border retro-border-hover group transition-all flex flex-col h-full">
              <div className="h-32 border-b-2 border-outline-variant relative overflow-hidden bg-surface-container-lowest">
                <img alt="Game Thumbnail" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC54pm-DlFwdN1M9aKkTmci1Zz0d7megKplAw_Mc7TTOX7uLShonn-bBLCc7cXpCoaJEvbpeFbBK5hIhZIS2jwNMGNDpJjWbSqi2Fr3cNsnrU1Jy2gnBW2BwF7ogB2l8jrpkOJynVla_CZmJsnzn6FvKxT3vjKF21JJYB7_pm9W8NAIEct109nk6rV1xJ_FCd0xRJD1IbvQaP1GVxe8QCxci3u4RBQ6gSKWdCufRjGqG4WmLbZnPYsXoZg7mIms2ZbZOqH65wIHmGoM"/>
                <div className="absolute top-2 right-2 bg-primary-container text-on-primary-container font-label-mono text-[10px] px-2 py-0.5 border border-on-primary">LVL_42</div>
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-headline-md text-[20px] text-on-surface mb-1 group-hover:text-primary-container transition-colors uppercase">CYBER_CHESS</h3>
                <p className="font-label-mono text-label-mono text-on-surface-variant mb-4">LAST_SYNC: 2H_AGO</p>
                <div className="mt-auto flex justify-between items-center">
                  <div className="flex gap-1 h-2 w-16 bg-surface-container-highest border border-outline">
                    <div className="bg-primary-container w-3/4"></div>
                  </div>
                  <Link to="/game" className="text-primary-container hover:text-primary-fixed bg-surface border border-outline-variant hover:border-primary-container px-3 py-1 font-label-mono text-[10px]">
                    &gt; RESUME
                  </Link>
                </div>
              </div>
            </div>
            <div className="bg-surface-container border-2 border-outline-variant retro-border retro-border-hover group transition-all flex flex-col h-full">
              <div className="h-32 border-b-2 border-outline-variant relative overflow-hidden bg-surface-container-lowest">
                <img alt="Game Thumbnail" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAC02qB3kTw4yYzbToRwzHRyzZQninpcegkni7dL97HDY4tlY-WW1eDvNwumF2MfSm6Nfo9HnUAJYFjSgWjFvqpTvTxrYCU9VuUNG9WIywC31EGj10mqBc94N4kg0sHnym5d8WBy6Lz9YqsgArKRcZbx4afv5aJOjUcPDD52QuJumgwC83339nPromO0bg5tT3YFiUCfCZO1Ca_n2giS6udUrJ6lDpRzZWdd0C_ik9akJUig3fpvAOZkBsA8bSrOFai6zjz_fwaiEQ-"/>
                <div className="absolute top-2 right-2 bg-secondary-container text-on-secondary-container font-label-mono text-[10px] px-2 py-0.5 border border-on-secondary">NEW_HS</div>
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-headline-md text-[20px] text-on-surface mb-1 group-hover:text-secondary-container transition-colors uppercase">ASTRO_BLAST</h3>
                <p className="font-label-mono text-label-mono text-on-surface-variant mb-4">LAST_SYNC: 1D_AGO</p>
                <div className="mt-auto flex justify-between items-center">
                  <div className="flex gap-1 h-2 w-16 bg-surface-container-highest border border-outline">
                    <div className="bg-secondary-container w-full"></div>
                  </div>
                  <Link to="/game" className="text-secondary-container hover:text-secondary-fixed bg-surface border border-outline-variant hover:border-secondary-container px-3 py-1 font-label-mono text-[10px]">
                    &gt; RESUME
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/*  Sidebar Activity  */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="border-b-2 border-outline-variant pb-2">
            <h2 className="font-headline-md text-[20px] text-on-surface uppercase tracking-wide flex items-center gap-2">
              <span className="text-primary-container">&gt;</span> NETWORK_STATUS
            </h2>
          </div>
          <div className="bg-surface border-2 border-outline-variant p-4 space-y-4 retro-border">
            <div className="bg-surface-container-highest border-b-2 border-outline-variant px-2 py-1 mb-2">
              <span className="font-label-mono text-[10px] text-on-surface-variant">ACTIVE_CONNECTIONS.LOG</span>
            </div>
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="w-8 h-8 bg-surface-container-highest border border-outline-variant flex items-center justify-center relative">
                <span className="material-symbols-outlined text-on-surface-variant text-sm" style={{fontVariationSettings: "'FILL' 1"}}>person</span>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary-container border border-surface shadow-[0_0_4px_#39ff14]"></div>
              </div>
              <div>
                <div className="font-label-mono text-[12px] text-on-surface group-hover:text-primary-container transition-colors">USER_0x1A</div>
                <div className="font-label-mono text-[10px] text-primary-container opacity-80">&gt; IN_GAME: NEON_DRIFTER</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

import React from 'react';

export default function GameLibraryCyberEdition() {
  return (
    <div className="p-gutter lg:p-margin flex-1 pb-12">
      {/*  Header Section  */}
      <div className="mb-xl flex flex-col md:flex-row md:items-end justify-between gap-lg py-4">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-primary-container mb-xs uppercase">LIBRARY</h1>
          <p className="font-label-mono text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-primary-container animate-pulse"></span>
            Status: Hyper_Link_Active // 128_Nodes_Online
          </p>
        </div>
      </div>

      {/*  Bento Grid Library  */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {/*  Game Card 1: Featured  */}
        <div className="md:col-span-2 md:row-span-2 bg-surface-container-low pixel-border flex flex-col group cursor-pointer border-l-4 border-l-primary-container overflow-hidden">
          <div className="relative h-64 md:h-full min-h-[400px] overflow-hidden">
            <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Cyberpunk action scene" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCPIG0qQx8l_RJS5UlehOclOkyQ5ybC-X_O9lPqcxCGi1cQH3ygjk3WyfAzd65ea8-MHrnAlrZTWqA68rAgWSYuVWfNDw5z1DfbCEDqhAEKGoIp1e-deeNA3cCfsAyF_-NmrsmVEuy9_RfFqCU0vsKL2T4tFRk78sZCAMJVszhDnjKrB-DmeIW2OvgySInBuNwO3t71_xJP3fDTF6cXrwgnEqxLIhDIuR7nE8a8PP0yJqG9ls6TFe-y5P1YvqNVdbGRMnthnAV8FO52"/>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
            <div className="absolute top-4 left-4">
              <span className="bg-primary-container text-on-primary-container font-label-mono px-3 py-1 uppercase text-xs">Recommended</span>
            </div>
            <div className="absolute bottom-6 left-6 right-6">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="font-headline-lg text-headline-lg text-primary-container">NEURAL_DRIFT_2099</h3>
                  <p className="font-label-mono text-on-surface-variant">DEV: SYNAPSE_WORKS</p>
                </div>
                <div className="bg-primary-container/10 border border-primary-container px-3 py-1 flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary-container"></span>
                  <span className="font-label-mono text-primary-container text-xs">INSTALLED</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/*  Game Card 2  */}
        <div className="bg-surface-container-low pixel-border flex flex-col group cursor-pointer overflow-hidden">
          <div className="h-48 overflow-hidden relative">
            <img className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Data streams" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCHwUoJi6o9J-jUNkaCpjaEfNPvcII8HChab5Sbk7FrR3zjbwenfVKDkiZvYqgfhQ8OIImXi4ADpM8khD-6cGHXkxTw8xHckj5JXSnggRWA1NQZr7kaKh07uaOE_v1RQGNAjhbp0ILs8ngK_EM1l169al9lUm3BpLIqGR5DxDXtSfLZ0zZNHAgcrAkF4zHLT816ElIJH9WIZK4Hlme9meiWNFw88NFjs3xXoFGnkXBgfs5_1vN5LRbYRkhUaxouP3jPmYQrpEFz_IKv"/>
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container to-transparent opacity-60"></div>
          </div>
          <div className="p-4 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <h4 className="font-headline-md text-headline-md text-primary truncate">GRID_RUNNER</h4>
              <span className="material-symbols-outlined text-on-surface-variant hover:text-secondary transition-colors">favorite</span>
            </div>
            <p className="font-label-mono text-[10px] text-on-surface-variant uppercase">DEV: VECTOR_VOID</p>
            <div className="mt-4 pt-4 border-t border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-sm">update</span>
                <span className="font-label-mono text-secondary text-[10px] uppercase">Update Available</span>
              </div>
              <button className="bg-primary-container text-on-primary-container px-3 py-1 text-[10px] font-bold uppercase transition-all active:translate-y-0.5">LAUNCH</button>
            </div>
          </div>
        </div>

        {/*  Game Card 3  */}
        <div className="bg-surface-container-low pixel-border flex flex-col group cursor-pointer overflow-hidden">
          <div className="h-48 overflow-hidden relative">
            <img className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Gaming hardware" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCmQUlASpUeSaDt9GgS-73lGEMjJarTjscjl8_m1s5mRc-uSq1lshSRc8y1wCn81nfmmiUpqBgWKIzR6Qaql15ZBNxIOiPowPUofCMSUNmMpZDVbkWTxzcRzx0_a69On8RNDHXIXNvaLP-Pe8Lt7hEK2FdxmzmZUm8yEEVD9prdzfFOdLBzMZxEMAWY62N8gMzlEcct_tmo4c9NUVNkLasjOFgWdKI5VPHXpvBWHeoy4SFKL1yWm_cqz9bvro0WGJ3NHSmGtJIfpcNw"/>
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container to-transparent opacity-60"></div>
          </div>
          <div className="p-4 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <h4 className="font-headline-md text-headline-md text-primary truncate">VOID_PROTOCOL</h4>
              <span className="material-symbols-outlined text-secondary" style={{fontVariationSettings: "'FILL' 1"}}>favorite</span>
            </div>
            <p className="font-label-mono text-[10px] text-on-surface-variant uppercase">DEV: NULL_LOGIC</p>
            <div className="mt-4 pt-4 border-t border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-sm">check_circle</span>
                <span className="font-label-mono text-primary-container text-[10px] uppercase">UP TO DATE</span>
              </div>
              <button className="bg-primary-container text-on-primary-container px-3 py-1 text-[10px] font-bold uppercase transition-all active:translate-y-0.5">LAUNCH</button>
            </div>
          </div>
        </div>

        {/*  Game Card 4  */}
        <div className="bg-surface-container-low pixel-border flex flex-col group cursor-pointer overflow-hidden">
          <div className="h-48 overflow-hidden relative">
            <img className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Orbital mechanics" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5EebE0VZWA2ghNV20ErWD8pzh1eBP-FNiRRNRWoi79GX898xPS9AmjbHuFbkooyZYH9kM6rXt6fE6DVv8NL3JUPcNVMWBwglb0SFbBFv62sgbLXZqi4eeeSbJv3VYVYKTxWFVseW3UE5tl9tAt8EDlCamX1CfIKzZVHiQ_W5DmmZZ-_AYOz6Xsfg9xwcVsvaFMPExps0cB1rhD8NMvTHrT1oRAVJSYbhUu60sKjXHxD3SKYsKu_wSd7MxuArDOgvzKzfP3Ymu1drc"/>
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container to-transparent opacity-60"></div>
          </div>
          <div className="p-4 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <h4 className="font-headline-md text-headline-md text-primary truncate">ORBITAL_STRIKE</h4>
              <span className="material-symbols-outlined text-on-surface-variant hover:text-secondary transition-colors">favorite</span>
            </div>
            <p className="font-label-mono text-[10px] text-on-surface-variant uppercase">DEV: ASTRA_COMMAND</p>
            <div className="mt-4 pt-4 border-t border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant text-sm">downloading</span>
                <span className="font-label-mono text-on-surface-variant text-[10px] uppercase">45% SYNCING...</span>
              </div>
              <div className="w-20 h-1 bg-surface-variant relative">
                <div className="absolute left-0 top-0 h-full w-[45%] bg-gradient-to-r from-primary-container to-secondary-container"></div>
              </div>
            </div>
          </div>
        </div>

        {/*  Game Card 5  */}
        <div className="bg-surface-container-low pixel-border flex flex-col group cursor-pointer overflow-hidden">
          <div className="h-48 overflow-hidden relative">
            <img className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Futuristic city rain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBIuZ8sBwAwyyJcYQAxXMZPcP-_TC29vuq2AqhsCGF8ybQI-9zoycxAKd-QjnX_76ZjQIbFyHH92o4VmecY_v3oG-1AkQuq5OJ78-xjD0fNm8Sp9ME6IhBwHQtky1_nQFOKE2ePW7U2CRTqYXnKCywkftWQlPbc8xISvp-uquCvzZDF09IL1_bL9skjsIBeHH88CyCfTSSeL2vXkNPAXz3oE9Sqi7EthU5rMGvJBco2K7JUFGDuXAu5bHu1hE7JULvGFMUL_7fbdqYV"/>
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container to-transparent opacity-60"></div>
          </div>
          <div className="p-4 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <h4 className="font-headline-md text-headline-md text-primary truncate">CYBER_PULSE</h4>
              <span className="material-symbols-outlined text-on-surface-variant hover:text-secondary transition-colors">favorite</span>
            </div>
            <p className="font-label-mono text-[10px] text-on-surface-variant uppercase">DEV: NEON_NIGHTS</p>
            <div className="mt-4 pt-4 border-t border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-sm">warning</span>
                <span className="font-label-mono text-error text-[10px] uppercase">DISK_FULL</span>
              </div>
              <button className="border border-outline-variant text-on-surface-variant px-3 py-1 text-[10px] font-bold uppercase transition-all hover:bg-surface-variant">MANAGE</button>
            </div>
          </div>
        </div>

        {/*  Stat Summary Card  */}
        <div className="lg:col-span-2 bg-surface-container-low pixel-border p-6 flex flex-col justify-between border-t-4 border-t-secondary-container">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-secondary-container">analytics</span>
              <span className="font-label-mono text-secondary-container uppercase">System_Performance_Metrics</span>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="text-on-surface-variant font-label-mono text-[10px] uppercase mb-1">TOTAL_GAME_TIME</div>
                <div className="text-headline-lg font-headline-lg text-primary-container">1,248_HRS</div>
              </div>
              <div>
                <div className="text-on-surface-variant font-label-mono text-[10px] uppercase mb-1">NETWORK_LATENCY</div>
                <div className="text-headline-lg font-headline-lg text-primary-container">12_MS</div>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <div className="h-2 w-full bg-surface-variant overflow-hidden">
              <div className="h-full w-[72%] bg-gradient-to-r from-primary-container via-secondary-container to-primary-container shadow-[0_0_10px_#39ff14]"></div>
            </div>
            <div className="flex justify-between mt-2 font-label-mono text-[10px] text-on-surface-variant uppercase">
              <span>Storage: 742GB / 1TB</span>
              <span>72% Utilized</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

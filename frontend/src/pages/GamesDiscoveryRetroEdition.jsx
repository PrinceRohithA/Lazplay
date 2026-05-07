import React from 'react';

export default function GamesDiscoveryRetroEdition() {
  return (
    <div className="p-gutter lg:p-margin flex-1 pb-12">
      {/*  Search & Filter Bar (Terminal Style)  */}
      <section className="mb-12">
        <div className="bg-surface-container-low border-2 border-outline-variant p-4 pixel-border">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container font-label-mono">&gt;</span>
              <input className="w-full bg-surface-container-highest border-0 pl-10 text-primary-container font-label-mono focus:ring-1 focus:ring-primary-container placeholder:text-outline/50 uppercase" placeholder="SEARCH_DATABASE_FOR_GAMES..." type="text"/>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-5 bg-primary-container animate-pulse"></span>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <label className="font-label-mono text-on-surface-variant text-[10px] uppercase">SORT_BY:</label>
              <select className="bg-surface-container border border-outline-variant text-primary-container font-label-mono text-[12px] px-4 py-2 focus:ring-primary-container appearance-none min-w-[150px]">
                <option>FEATURED_HOSTS</option>
                <option>NEWEST_ENTRIES</option>
                <option>PRICE_LOW_TO_HIGH</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col xl:flex-row gap-gutter">
        {/*  Sidebar Filters  */}
        <aside className="xl:w-64 flex-shrink-0">
          <div className="space-y-8">
            <div>
              <h3 className="font-label-mono text-primary-container text-label-mono border-b border-outline-variant pb-2 mb-4 uppercase">GENRE_FILTERS</h3>
              <div className="space-y-3">
                {['ACTION_COMBAT', 'RPG_ADVENTURE', 'STRATEGY_TACTICS', 'SIMULATION_OS', 'RACING_DRIFT', 'INDIE_ARCHIVE'].map(genre => (
                  <label key={genre} className="flex items-center gap-3 group cursor-pointer">
                    <input className="w-4 h-4 rounded-none bg-surface border-outline-variant text-primary-container focus:ring-primary-container" type="checkbox"/>
                    <span className="font-label-mono text-on-surface-variant text-[12px] group-hover:text-primary-container transition-colors">{genre}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-label-mono text-primary-container text-label-mono border-b border-outline-variant pb-2 mb-4 uppercase">PRICE_RANGE</h3>
              <div className="space-y-4">
                <input className="w-full accent-primary-container" max="100" min="0" type="range"/>
                <div className="flex justify-between font-label-mono text-[10px] text-on-surface-variant uppercase">
                  <span>$0</span>
                  <span>$100</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/*  Game Grid  */}
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-gutter">
            {/*  Game Card 1  */}
            <div className="bg-surface-container border-2 border-outline-variant group hover:border-primary-container transition-all flex flex-col pixel-border relative overflow-hidden">
              <div className="h-48 overflow-hidden relative">
                <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Cyberpunk city" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCekcLG1R4SPSVFiOQxJ1zoNzQ9hrbKDAiiYqBAeLqrLKCe_hFKR7NQ6QI_WlQHU8mWEsb-PN9p4qJydIeJrkybfFyNewcxuYsq9lrkU4QHMrVXWy7tqEYSjlwaXcvaqjHceNI8yTD15ng1V985MpmirSstKeXb1qNcl-auZLfMscpTK0UIE5icpoufxSRg1IjEHpHvNFFlS_nSBeGkIcSpscgQMmO7KTndk9Hj-yiqimxsjd1VLpKfCRSPY_VMPqKfQq8LxefHchno"/>
                <div className="absolute top-2 right-2 bg-background/80 border border-primary-container px-2 py-1">
                  <span className="text-primary-container font-label-mono text-[10px]">99%_SYNC</span>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-headline-md text-primary group-hover:text-primary-container transition-colors">NEON_VOID: OVERDRIVE</h4>
                  <span className="font-label-mono text-secondary-fixed text-[14px]">$24.99</span>
                </div>
                <p className="text-on-surface-variant text-body-md mb-4 line-clamp-2 opacity-80">Fast-paced arcade combat in a decaying digital landscape. Host your own sector today.</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="bg-surface-variant text-[10px] font-label-mono px-2 py-1 border border-outline uppercase">ACTION</span>
                  <span className="bg-surface-variant text-[10px] font-label-mono px-2 py-1 border border-outline uppercase">MULTIPLAYER</span>
                </div>
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <button className="bg-primary-container text-on-primary-container font-label-mono py-2 text-[12px] font-bold hover:brightness-110 active:translate-y-0.5 transition-all">HOST_NOW</button>
                  <button className="border border-outline-variant text-on-surface-variant font-label-mono py-2 text-[12px] hover:bg-surface-bright transition-all uppercase">DETAILS</button>
                </div>
              </div>
            </div>

            {/*  Game Card 2  */}
            <div className="bg-surface-container border-2 border-outline-variant group hover:border-primary-container transition-all flex flex-col pixel-border relative overflow-hidden">
              <div className="h-48 overflow-hidden relative">
                <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Server farm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuALSb5LmaXkEDalyX1Bo87adAy9KK70KxMd4kDyatz5nYIbJ1kPeU9b3bZS4i31jkaEEGDA6DUPz_U_NP9rr9GrXWsU708DlWBL-cncQq_CHtFw8UFpPsipubZTElKBwoyUJkspYZfn-rNPBcBNxMIeO_ZHqJW9Tqu8duz4ngBLrnx3PVuEwuEPPU0xszXjqJ9318rHjXIR9G_C-J_muxhRtYMNpxvj9qLIjYuT8320XLgAHPjjh1Rsiay44cekjm2M0bzx4enyIgu7"/>
                <div className="absolute top-2 right-2 bg-background/80 border border-primary-container px-2 py-1">
                  <span className="text-primary-container font-label-mono text-[10px]">LIVE_FEED</span>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-headline-md text-primary group-hover:text-primary-container transition-colors">TERMINAL_DEFENSE</h4>
                  <span className="font-label-mono text-primary-container text-[14px]">FREE_TO_PLAY</span>
                </div>
                <p className="text-on-surface-variant text-body-md mb-4 line-clamp-2 opacity-80">Command-line strategy game. Protect your data from incoming breaches in real-time.</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="bg-surface-variant text-[10px] font-label-mono px-2 py-1 border border-outline uppercase">STRATEGY</span>
                  <span className="bg-surface-variant text-[10px] font-label-mono px-2 py-1 border border-outline uppercase">INDIE</span>
                </div>
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <button className="bg-primary-container text-on-primary-container font-label-mono py-2 text-[12px] font-bold hover:brightness-110 active:translate-y-0.5 transition-all">HOST_NOW</button>
                  <button className="border border-outline-variant text-on-surface-variant font-label-mono py-2 text-[12px] hover:bg-surface-bright transition-all uppercase">DETAILS</button>
                </div>
              </div>
            </div>

            {/*  Game Card 3  */}
            <div className="bg-surface-container border-2 border-outline-variant group hover:border-primary-container transition-all flex flex-col pixel-border relative overflow-hidden">
              <div className="h-48 overflow-hidden relative">
                <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Arcade console" src="https://lh3.googleusercontent.com/aida-public/AB6AXuArV4iR5n8wLq9H9CyC41jITTE1vSZKfsZXhpVMmq2jbzAAUH0sjLV17t8VxZBP55jjcr4KO_f0tlWo7B4kEEPNX1zDSV6AUmoJyf1k6MRqQRl9NIxXRDv6b9Bm5RYB99-G7Hfg5-ely-S3ItaSrSEstPCYOY4ZrB2ZOWX0mGy7_mZthfxi9UsEuAWYXx7LjPMBeuqWJ-u_C_Y1wXSOJRPvkXi6fZqZkxb95rUOsjK-qGe1qYbufPC_sZHNTqExOVEYC9IstXd4NHPR"/>
                <div className="absolute top-2 right-2 bg-background/80 border border-primary-container px-2 py-1">
                  <span className="text-primary-container font-label-mono text-[10px]">ALPHA_V0.4</span>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-headline-md text-primary group-hover:text-primary-container transition-colors">GRID_RUNNER_2084</h4>
                  <span className="font-label-mono text-secondary-fixed text-[14px]">$12.00</span>
                </div>
                <p className="text-on-surface-variant text-body-md mb-4 line-clamp-2 opacity-80">Procedural racing across the mainframe. High-stakes hosting for high-performance racers.</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="bg-surface-variant text-[10px] font-label-mono px-2 py-1 border border-outline uppercase">RACING</span>
                  <span className="bg-surface-variant text-[10px] font-label-mono px-2 py-1 border border-outline uppercase">PROD_GEN</span>
                </div>
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <button className="bg-primary-container text-on-primary-container font-label-mono py-2 text-[12px] font-bold hover:brightness-110 active:translate-y-0.5 transition-all">HOST_NOW</button>
                  <button className="border border-outline-variant text-on-surface-variant font-label-mono py-2 text-[12px] hover:bg-surface-bright transition-all uppercase">DETAILS</button>
                </div>
              </div>
            </div>
          </div>

          {/*  Pagination  */}
          <div className="mt-12 flex justify-center items-center gap-4">
            <button className="w-10 h-10 border border-outline-variant flex items-center justify-center text-on-surface-variant hover:border-primary-container hover:text-primary-container transition-all">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <div className="flex gap-2">
              <button className="w-10 h-10 bg-primary-container text-on-primary-container font-label-mono flex items-center justify-center">01</button>
              <button className="w-10 h-10 border border-outline-variant font-label-mono text-on-surface-variant hover:border-primary-container hover:text-primary-container transition-all flex items-center justify-center">02</button>
              <button className="w-10 h-10 border border-outline-variant font-label-mono text-on-surface-variant hover:border-primary-container hover:text-primary-container transition-all flex items-center justify-center">03</button>
            </div>
            <button className="w-10 h-10 border border-outline-variant flex items-center justify-center text-on-surface-variant hover:border-primary-container hover:text-primary-container transition-all">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

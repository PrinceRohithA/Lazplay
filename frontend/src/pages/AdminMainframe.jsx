import React from 'react';

export default function AdminMainframe() {
  return (
    <div className="p-margin flex-1 flex flex-col gap-margin">
      {/*  Page Header  */}
      <div className="flex justify-between items-end border-b-4 border-outline-variant pb-2">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface uppercase tracking-tighter">CMD_CENTER</h1>
          <p className="font-label-mono text-label-mono text-tertiary-fixed mt-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-tertiary-fixed inline-block"></span>
            GLOBAL OVERRIDE PROTOCOLS ACTIVE
          </p>
        </div>
        <div className="font-label-mono text-label-mono text-on-surface-variant text-right">
          UPTIME: 948:22:11<br />
          TICK_RATE: 128Hz
        </div>
      </div>

      {/*  Bento Grid Layout  */}
      <div className="grid grid-cols-12 gap-4">
        {/*  System Health Monitors (Col Span 8)  */}
        <div className="col-span-12 xl:col-span-8 flex flex-col gap-4">
          <div className="border-2 border-outline-variant bg-surface-container-low flex flex-col h-full hover:border-primary-container transition-colors duration-300">
            <div className="bg-surface-variant text-on-surface-variant font-label-mono text-label-mono px-2 py-1 uppercase border-b-2 border-outline-variant flex justify-between items-center">
              <span>Sys_Monitors</span>
              <span className="material-symbols-outlined text-[16px]">memory</span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between font-label-mono text-label-mono">
                  <span className="text-on-surface">CPU_LOAD</span>
                  <span className="text-primary-container glow-primary-text">84%</span>
                </div>
                <div className="h-6 border-2 border-outline-variant bg-surface flex p-0.5 gap-0.5">
                  <div className="flex-1 bg-primary-container glow-primary"></div>
                  <div className="flex-1 bg-primary-container glow-primary"></div>
                  <div className="flex-1 bg-primary-container glow-primary"></div>
                  <div className="flex-1 bg-primary-container glow-primary"></div>
                  <div className="flex-1 bg-surface-variant"></div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between font-label-mono text-label-mono">
                  <span className="text-on-surface">MEM_ALLOC</span>
                  <span className="text-tertiary-fixed">45%</span>
                </div>
                <div className="h-6 border-2 border-outline-variant bg-surface flex p-0.5 gap-0.5">
                  <div className="flex-1 bg-tertiary-fixed glow-tertiary"></div>
                  <div className="flex-1 bg-tertiary-fixed glow-tertiary"></div>
                  <div className="flex-1 bg-surface-variant"></div>
                  <div className="flex-1 bg-surface-variant"></div>
                  <div className="flex-1 bg-surface-variant"></div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between font-label-mono text-label-mono">
                  <span className="text-on-surface">NET_IO</span>
                  <span className="text-error blink">CRITICAL</span>
                </div>
                <div className="h-6 border-2 border-error bg-surface flex p-0.5 gap-0.5">
                  <div className="flex-1 bg-error glow-error"></div>
                  <div className="flex-1 bg-error glow-error"></div>
                  <div className="flex-1 bg-error glow-error"></div>
                  <div className="flex-1 bg-error glow-error"></div>
                  <div className="flex-1 bg-error glow-error"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-2 border-outline-variant bg-surface-container-low flex flex-col flex-1 hover:border-tertiary-fixed transition-colors duration-300">
            <div className="bg-surface-variant text-on-surface-variant font-label-mono text-label-mono px-2 py-1 uppercase border-b-2 border-outline-variant flex justify-between items-center">
              <span>Active_Connections</span>
              <span className="material-symbols-outlined text-[16px]">lan</span>
            </div>
            <div className="p-2 overflow-x-auto">
              <table className="w-full text-left border-collapse font-label-mono text-label-mono">
                <thead>
                  <tr className="border-b-2 border-outline-variant text-on-surface-variant">
                    <th className="p-2 uppercase">ID</th>
                    <th className="p-2 uppercase">Handle</th>
                    <th className="p-2 uppercase">Status</th>
                    <th className="p-2 uppercase text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-outline-variant/50 hover:bg-surface-bright transition-colors group">
                    <td className="p-2 text-on-surface">0x001A</td>
                    <td className="p-2 text-primary-container">Neo_Runner</td>
                    <td className="p-2"><span className="bg-primary-fixed-dim text-on-primary-fixed px-2 py-0.5 border border-primary-fixed">ONLINE</span></td>
                    <td className="p-2 text-right">
                      <button className="bg-surface border-2 border-outline-variant text-on-surface px-3 py-1 hover:border-secondary-container hover:text-secondary-container transition-colors">KICK</button>
                    </td>
                  </tr>
                  <tr className="border-b border-outline-variant/50 hover:bg-surface-bright transition-colors group">
                    <td className="p-2 text-on-surface">0x002F</td>
                    <td className="p-2 text-primary-container">Bit_Crusher</td>
                    <td className="p-2"><span className="bg-surface-variant text-on-surface px-2 py-0.5 border border-outline-variant">IDLE</span></td>
                    <td className="p-2 text-right">
                      <button className="bg-surface border-2 border-outline-variant text-on-surface px-3 py-1 hover:border-secondary-container hover:text-secondary-container transition-colors">KICK</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-bright transition-colors group">
                    <td className="p-2 text-on-surface">0x008C</td>
                    <td className="p-2 text-error">Ghost_In_Machine</td>
                    <td className="p-2"><span className="bg-error-container text-on-error-container px-2 py-0.5 border border-error blink">WARN_LVL_3</span></td>
                    <td className="p-2 text-right">
                      <button className="bg-secondary-container text-on-secondary-container border-2 border-secondary-container px-3 py-1 font-bold hover:bg-transparent hover:text-secondary-container transition-colors glow-primary">BAN_IP</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-span-12 xl:col-span-4 border-2 border-outline-variant bg-[#050505] flex flex-col h-[500px] xl:h-auto hover:border-primary-container transition-colors duration-300">
          <div className="bg-surface-variant text-on-surface-variant font-label-mono text-label-mono px-2 py-1 uppercase border-b-2 border-outline-variant flex justify-between items-center">
            <span>Terminal_Feed</span>
            <div className="flex gap-2">
              <span className="w-2 h-2 bg-primary-container rounded-full blink"></span>
              <span className="w-2 h-2 bg-error rounded-full"></span>
            </div>
          </div>
          <div className="p-4 font-label-mono text-[10px] text-primary-container flex-1 overflow-y-auto leading-relaxed flex flex-col gap-1">
            <div><span className="text-on-surface-variant">10:42:01</span> &gt; INIT DAEMON... SUCCESS</div>
            <div><span className="text-on-surface-variant">10:42:05</span> &gt; BINDING PORT 8080... OK</div>
            <div><span className="text-on-surface-variant">10:43:12</span> &gt; USER_AUTH[0x001A]: ACCEPTED</div>
            <div><span className="text-on-surface-variant">10:45:00</span> &gt; RUNNING GC()... FREED 240MB</div>
            <div className="text-tertiary-fixed"><span className="text-on-surface-variant">10:48:22</span> &gt; INCOMING_CONN: REJECTED (RULE_04)</div>
            <div><span className="text-on-surface-variant">10:50:11</span> &gt; USER_AUTH[0x002F]: ACCEPTED</div>
            <div className="text-error blink"><span className="text-on-surface-variant">10:55:00</span> &gt; ERR: PACKET_LOSS &gt; 15% ON NODE_3</div>
            <div className="text-error"><span className="text-on-surface-variant">10:55:01</span> &gt; WARN: ANOMALOUS TRAFFIC DETECTED</div>
            <div><span className="text-on-surface-variant">10:56:00</span> &gt; REROUTING... OK</div>
            <div><span className="text-on-surface-variant">10:56:05</span> &gt; AWAITING INPUT<span className="blink">_</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

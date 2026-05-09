import React, { useState } from 'react';
import { developer as devApi } from '../api';
import { useNavigate } from 'react-router-dom';

export default function DeveloperWorkspaceAdvancedDeploymentSuite() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString(), msg: 'INITIALIZING_HANDSHAKE_PROTOCOL...' },
    { time: new Date().toLocaleTimeString(), msg: 'LINKING_TO_MAINFRAME_CENTRAL_CORE...' },
    { time: new Date().toLocaleTimeString(), msg: 'READY_FOR_DEPLOYMENT_COMMAND_SIGNAL' }
  ]);

  const [form, setForm] = useState({
    title: '',
    version: 'v1.0.0',
    description: '',
    hardwareSpecs: ['PC_SYSTEM'],
    genres: ['ACTION'],
    customTags: ['CYBERPUNK'],
    licensing: 'premium',
    price: '29.99',
    minSpecs: { cpu: 'I5-6600K', ram: '8GB', gpu: 'GTX 1060', storage: '50GB' },
    recSpecs: { cpu: 'I7-9700K', ram: '16GB', gpu: 'RTX 2070', storage: '50GB' }
  });

  const addLog = (msg) => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg }]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSpecChange = (type, field, value) => {
    setForm(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }));
  };

  const toggleGenre = (genre) => {
    setForm(prev => ({
      ...prev,
      genres: prev.genres.includes(genre) 
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  const handleDeploy = async () => {
    if (!form.title) {
      addLog('ERROR: PROJECT_TITLE_REQUIRED');
      return;
    }

    setLoading(true);
    addLog(`INITIATING_DEPLOYMENT_FOR: ${form.title.toUpperCase()}`);

    try {
      // 1. Create Game
      addLog('STEP_01: CREATING_GAME_RECORD...');
      const gameRes = await devApi.createGame({
        title: form.title,
        description: form.description,
        price: parseFloat(form.price),
        priceType: form.licensing === 'premium' ? 'PAID' : 'FREE',
        genres: form.genres,
        tags: form.customTags
      });
      const gameId = gameRes.data.id;
      addLog(`SUCCESS: GAME_CREATED (ID: ${gameId})`);

      // 2. Create Build
      addLog('STEP_02: INITIALIZING_BUILD_SEQUENCE...');
      const buildRes = await devApi.createBuild(gameId, {
        version: form.version,
        platform: 'WINDOWS', // Defaulting for now
        runtime: 'NATIVE',
        entrypoint: 'game.exe'
      });
      const buildId = buildRes.data.id;
      addLog(`SUCCESS: BUILD_INITIALIZED (ID: ${buildId})`);

      // 3. Simulated Upload & Scan (In a real app, we'd handle file upload here)
      addLog('STEP_03: UPLOADING_ASSETS... [SIMULATED]');
      addLog('STEP_04: SCANNING_FOR_MALWARE...');
      await devApi.scanBuild(buildId);
      addLog('SUCCESS: SCAN_PASSED_CLEAN');

      // 4. Deploy
      addLog('STEP_05: FINAL_DEPLOYMENT_TRIGGER...');
      await devApi.deployBuild(buildId, { environment: 'PRODUCTION' });
      addLog('DEPLOYMENT_COMPLETE! GRID_REDIRECT_IN_3S...');

      setTimeout(() => navigate('/developer'), 3000);
    } catch (err) {
      console.error(err);
      addLog(`CRITICAL_FAILURE: ${err.message || 'UNKNOWN_ERROR'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-gutter min-h-screen flex flex-col gap-gutter bg-background pb-12">
      {/*  Header Section  */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-4">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-primary-container uppercase leading-none tracking-tighter">ADVANCED_DEPLOYMENT_SUITE</h1>
          <p className="font-label-mono text-on-surface-variant mt-2 tracking-widest">
            &gt; {loading ? 'DEPLOYMENT_IN_PROGRESS...' : 'INITIALIZING UPLOAD SEQUENCE... STATUS: WAITING_FOR_INPUT'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className={`w-4 h-4 ${loading ? 'bg-primary-container animate-pulse' : 'bg-primary-container'}`}></div>
            <div className={`w-4 h-4 ${loading ? 'bg-primary-container animate-pulse delay-75' : 'bg-primary-container'}`}></div>
            <div className={`w-4 h-4 ${loading ? 'bg-primary-container animate-pulse delay-150' : 'bg-primary-container'}`}></div>
            <div className="w-4 h-4 bg-surface-container-highest"></div>
            <div className="w-4 h-4 bg-surface-container-highest"></div>
          </div>
          <span className="font-label-mono text-label-mono text-primary-fixed ml-2 uppercase">NODE_LINK_04</span>
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
            <span className="text-[10px] font-label-mono text-on-surface-variant uppercase tracking-widest">ENCRYPTION: AES-256</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <div className="space-y-2">
              <label className="block font-label-mono text-[10px] text-on-surface-variant">_TITLE</label>
              <div className="flex items-center bg-surface-container text-primary-container p-3 border border-outline-variant focus-within:border-primary-container group">
                <span className="mr-2 group-focus-within:animate-pulse">&gt;</span>
                <input 
                  className="bg-transparent border-none focus:ring-0 p-0 w-full uppercase font-label-mono placeholder:opacity-30" 
                  placeholder="ENTER_PROJECT_NAME" 
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block font-label-mono text-[10px] text-on-surface-variant">_VERSION</label>
              <div className="flex items-center bg-surface-container text-primary-container p-3 border border-outline-variant focus-within:border-primary-container group">
                <span className="mr-2 group-focus-within:animate-pulse">&gt;</span>
                <input 
                  className="bg-transparent border-none focus:ring-0 p-0 w-full font-label-mono" 
                  type="text" 
                  name="version"
                  value={form.version}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="col-span-full space-y-2">
              <label className="block font-label-mono text-[10px] text-on-surface-variant">_DESCRIPTION</label>
              <textarea 
                className="w-full bg-surface-container border border-outline-variant text-on-surface font-label-mono p-3 focus:border-primary-container focus:ring-0 placeholder:opacity-30" 
                placeholder="DECRYPT_CONTENT_SYNOPSIS..." 
                rows="4"
                name="description"
                value={form.description}
                onChange={handleInputChange}
              ></textarea>
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
            {['PC_SYSTEM', 'CONSOLE_OS', 'VR_INTERFACE', 'CLOUD_RELAY'].map((spec) => (
              <label key={spec} className={`group flex items-center gap-3 p-4 bg-surface-container border transition-all cursor-pointer ${form.hardwareSpecs.includes(spec) ? 'border-primary-container bg-primary-container/5' : 'border-outline-variant hover:border-primary-container/50'}`}>
                <input 
                  checked={form.hardwareSpecs.includes(spec)}
                  onChange={() => {
                    setForm(prev => ({
                      ...prev,
                      hardwareSpecs: prev.hardwareSpecs.includes(spec) 
                        ? prev.hardwareSpecs.filter(s => s !== spec)
                        : [...prev.hardwareSpecs, spec]
                    }));
                  }}
                  className="form-checkbox bg-transparent border-2 border-outline-variant text-primary-container rounded-none focus:ring-0" 
                  type="checkbox" 
                />
                <span className={`font-label-mono text-label-mono ${form.hardwareSpecs.includes(spec) ? 'text-primary-container' : 'group-hover:text-primary-container'}`}>{spec}</span>
              </label>
            ))}
          </div>
          <div className="mt-auto pt-6 border-t border-outline-variant mt-8">
            <div className="flex justify-between items-center mb-2">
              <span className="font-label-mono text-[10px] text-on-surface-variant">ESTIMATED_BANDWIDTH</span>
              <span className="font-label-mono text-label-mono text-tertiary-fixed">12.4 GB/S</span>
            </div>
            <div className="h-2 w-full bg-surface-container relative overflow-hidden">
              <div className="h-full bg-tertiary-container shadow-[0_0_8px_#00f6f6] animate-pulse" style={{ width: "65%" }}></div>
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
                {['ACTION', 'RPG', 'STRATEGY', 'ADVENTURE', 'SIMULATION'].map((tag) => (
                  <button 
                    key={tag} 
                    onClick={() => toggleGenre(tag)}
                    className={`px-4 py-2 border font-label-mono text-[10px] transition-all ${form.genres.includes(tag) ? 'border-primary-container text-primary-container bg-primary-container/10 shadow-[0_0_10px_rgba(57,255,20,0.1)]' : 'border-outline-variant text-on-surface hover:border-primary-container/50'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block font-label-mono text-[10px] text-on-surface-variant mb-2">_CUSTOM_USER_TAGS</label>
              <div className="flex items-center bg-surface-container text-primary-container p-3 border border-outline-variant focus-within:border-primary-container group">
                <span className="mr-2 group-focus-within:animate-pulse">&gt;</span>
                <input 
                  className="bg-transparent border-none focus:ring-0 p-0 w-full font-label-mono text-[12px] uppercase placeholder:opacity-30" 
                  placeholder="ADD_TAG_AND_PRESS_ENTER" 
                  type="text" 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value) {
                      const newTag = e.target.value.toUpperCase();
                      if (!form.customTags.includes(newTag)) {
                        setForm(prev => ({ ...prev, customTags: [...prev.customTags, newTag] }));
                      }
                      e.target.value = '';
                    }
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {form.customTags.map(tag => (
                  <span key={tag} className="flex items-center gap-2 px-3 py-1 bg-surface-container-highest text-primary-container font-label-mono text-[10px] border border-primary-container/30">
                    {tag} 
                    <span 
                      onClick={() => setForm(prev => ({ ...prev, customTags: prev.customTags.filter(t => t !== tag) }))}
                      className="material-symbols-outlined text-[14px] cursor-pointer hover:text-error transition-colors"
                    >close</span>
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
                <select 
                  name="licensing"
                  value={form.licensing}
                  onChange={handleInputChange}
                  className="w-full bg-transparent border-none text-primary-container font-label-mono p-3 appearance-none focus:ring-0 cursor-pointer text-[12px] outline-none"
                >
                  <option value="premium">PREMIUM (PAID)</option>
                  <option value="f2p">FREE_TO_PLAY (F2P)</option>
                  <option value="subscription">SUBSCRIPTION_ACCESS</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary-container">expand_more</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block font-label-mono text-[10px] text-on-surface-variant">_BASE_PRICE (USD)</label>
              <div className="flex items-center bg-surface-container text-primary-container p-3 border border-outline-variant focus-within:border-primary-container group">
                <span className="mr-2 text-on-surface-variant font-label-mono">$</span>
                <input 
                  className="bg-transparent border-none focus:ring-0 p-0 w-full font-label-mono text-[12px]" 
                  type="number" 
                  name="price"
                  value={form.price}
                  onChange={handleInputChange}
                  disabled={form.licensing === 'f2p'}
                />
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
              {Object.entries(form.minSpecs).map(([key, value]) => (
                <div key={key} className="grid grid-cols-[80px_1fr] items-center gap-4">
                  <label className="font-label-mono text-[10px] text-on-surface-variant uppercase">{key}</label>
                  <input 
                    className="bg-surface-container border border-outline-variant text-on-surface font-label-mono text-[12px] p-2 focus:border-primary-container focus:ring-0 w-full uppercase" 
                    type="text" 
                    value={value}
                    onChange={(e) => handleSpecChange('minSpecs', key, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <h4 className="font-label-mono text-[12px] text-primary-container border-b border-outline-variant pb-2">_RECOMMENDED_SPECS</h4>
              {Object.entries(form.recSpecs).map(([key, value]) => (
                <div key={key} className="grid grid-cols-[80px_1fr] items-center gap-4">
                  <label className="font-label-mono text-[10px] text-on-surface-variant uppercase">{key}</label>
                  <input 
                    className="bg-surface-container border border-outline-variant text-on-surface font-label-mono text-[12px] p-2 focus:border-primary-container focus:ring-0 w-full uppercase" 
                    type="text" 
                    value={value}
                    onChange={(e) => handleSpecChange('recSpecs', key, e.target.value)}
                  />
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
        </div>

        {/*  Terminal Log Area  */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest pixel-border-active p-4 flex flex-col h-64 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-2 mb-3 px-2 border-b border-outline-variant pb-2">
            <div className="w-3 h-3 rounded-full bg-error animate-pulse"></div>
            <div className="w-3 h-3 rounded-full bg-secondary-container"></div>
            <div className="w-3 h-3 rounded-full bg-primary-container"></div>
            <span className="ml-4 font-label-mono text-[10px] text-primary-fixed uppercase tracking-widest">DEPLOYMENT_LOG_CONSOLE_V1.0</span>
          </div>
          <div className="overflow-y-auto flex-1 font-label-mono text-[11px] space-y-1 p-2 text-primary-container/80 scrollbar-thin scrollbar-thumb-primary-container/20">
            {logs.map((log, i) => (
              <p key={i}><span className="text-on-surface-variant">[{log.time}]</span> &gt; {log.msg}</p>
            ))}
            <div className="animate-pulse flex items-center gap-1">
              <span className="w-1 h-3 bg-primary-container"></span>
            </div>
          </div>
        </div>

        {/*  Action Area  */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
          <button 
            onClick={handleDeploy}
            disabled={loading}
            className={`w-full h-full font-headline-md p-6 pixel-border-active hover:scale-[1.02] active:scale-95 transition-all flex flex-col items-center justify-center gap-4 group min-h-[150px] ${loading ? 'bg-surface-container-highest text-on-surface-variant cursor-wait' : 'bg-primary-container text-on-primary-container'}`}
          >
            <span className={`material-symbols-outlined text-headline-xl group-hover:scale-110 transition-transform ${loading ? 'animate-spin' : ''}`}>
              {loading ? 'sync' : 'rocket_launch'}
            </span>
            <span className="uppercase tracking-tighter font-extrabold">{loading ? 'DEPLOYING...' : 'INITIATE_DEPLOY'}</span>
            <span className="font-label-mono text-[10px] opacity-70 uppercase">{loading ? 'STABILIZING_QUARK_LINK' : 'CONFIRM_HARDWARE_LOCK_ENABLED'}</span>
          </button>
          <button 
            onClick={() => navigate('/developer')}
            className="w-full py-4 border-2 border-outline-variant text-on-surface-variant font-label-mono hover:bg-error hover:text-on-error hover:border-error transition-all uppercase tracking-widest text-[10px]"
          >
            ABORT_SEQUENCE
          </button>
        </div>
      </div>
    </div>
  );
}

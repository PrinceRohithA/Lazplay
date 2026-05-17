import React, { useState, useRef, useEffect, useCallback } from 'react';
import { developer as devApi, storage as storageApi, auth as authApi } from '../api';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const GENRES = [
  'ACTION', 'RPG', 'STRATEGY', 'ADVENTURE', 'SIMULATION',
  'SURVIVAL', 'HORROR', 'PUZZLE', 'RACING', 'SPORTS',
  'MMO', 'ROGUELIKE', 'FPS', 'MOBA', 'SANDBOX', 'PLATFORMER'
];

const PLATFORMS = [
  { id: 'WINDOWS', label: 'WINDOWS' },
  { id: 'VR', label: 'VR' },
  { id: 'WEB', label: 'WEB' },
  { id: 'LINUX', label: 'LINUX' },
  { id: 'ANDROID', label: 'ANDROID' },
  { id: 'IOS', label: 'IOS' }
];

export default function DeveloperWorkspaceAdvancedDeploymentSuite() {
  if (window.electron) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center font-label-mono text-error p-gutter text-center min-h-[60vh]">
        <span className="material-symbols-outlined text-[48px] text-error mb-4">gavel</span>
        <h1 className="text-headline-md font-bold mb-4 uppercase">ACCESS_RESTRICTED</h1>
        <p className="max-w-md text-on-surface-variant text-body-md leading-relaxed">
          Deployment protocols must be executed natively. Please use the <strong className="text-primary-container">Developer Console</strong> tab in the launcher side menu.
        </p>
      </div>
    );
  }

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gameIdParam = searchParams.get('id');

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!gameIdParam);
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString(), msg: 'INITIALIZING_HANDSHAKE_PROTOCOL...' },
    { time: new Date().toLocaleTimeString(), msg: 'LINKING_TO_MAINFRAME_CENTRAL_CORE...' },
    { time: new Date().toLocaleTimeString(), msg: 'READY_FOR_DEPLOYMENT_COMMAND_SIGNAL' }
  ]);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadLabel, setUploadLabel] = useState('');

  const [form, setForm] = useState({
    title: '',
    version: 'v1.0.0',
    entrypoint: '',
    description: '',
    hardwareSpecs: ['WINDOWS'],
    genres: ['ACTION'],
    customTags: [],
    licensing: 'PAID',
    price: '999',
    status: 'DRAFT',
    minSpecs: { os: 'WINDOWS_10_X64', processor: 'I5-6600K', memory: '8GB', graphics: 'GTX 1060', storage: '50GB' },
    recSpecs: { os: 'WINDOWS_11_X64', processor: 'I7-9700K', memory: '16GB', graphics: 'RTX 2070', storage: '50GB' }
  });

  const [existingMedia, setExistingMedia] = useState([]);
  const [existingBuilds, setExistingBuilds] = useState([]);
  const [files, setFiles] = useState({
    HERO_BANNER: null,
    SCREENSHOTS: [],
    VIDEO_TRAILER: null,
    GAME_BINARIES: null
  });

  const fileInputRefs = {
    HERO_BANNER: useRef(null),
    SCREENSHOTS: useRef(null),
    VIDEO_TRAILER: useRef(null),
    GAME_BINARIES: useRef(null)
  };

  const addLog = useCallback((msg) => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg }]);
  }, []);

  const fetchGameData = useCallback(async () => {
    if (!gameIdParam) return;
    try {
      const res = await devApi.getGame(gameIdParam);
      const game = res.data;
      const builds = Array.isArray(game.builds) ? game.builds : [];
      setForm({
        title: game.title,
        version: game.version || builds[0]?.version || 'v1.0.0',
        entrypoint: game.entrypoint || builds[0]?.entrypoint || '',
        description: game.description || '',
        hardwareSpecs: game.platforms || ['WINDOWS'],
        genres: game.genres || ['ACTION'],
        customTags: game.tags || [],
        licensing: game.priceType || 'PAID',
        price: ((game.price || 0) / 100).toString(),
        status: game.status || 'DRAFT',
        minSpecs: game.systemRequirements?.minimum || { os: 'WINDOWS_10_X64', processor: 'I5-6600K', memory: '8GB', graphics: 'GTX 1060', storage: '50GB' },
        recSpecs: game.systemRequirements?.recommended || { os: 'WINDOWS_11_X64', processor: 'I7-9700K', memory: '16GB', graphics: 'RTX 2070', storage: '50GB' }
      });

      // Fetch media
      // Note: Backend might not have devApi.media, let's check if we have it or if it's gamesApi.media
      // Based on my previous view, gamesApi.media(gameId) works. devApi might have one too.
      setExistingMedia(game.media || []);
      setExistingBuilds(builds);
    } catch (err) {
      addLog(`ERROR: FAILED_TO_FETCH_PROJECT_DATA - ${err.message}`);
    } finally {
      setInitialLoading(false);
    }
  }, [gameIdParam, addLog]);

  useEffect(() => {
    authApi.me().then(res => setUser(res.data)).catch(() => { });
    fetchGameData();
  }, [fetchGameData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleDescriptionChange = (content) => {
    setForm(prev => ({ ...prev, description: content }));
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

  const handleFileSelect = (type, e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    if (type === 'HERO_BANNER') {
      const existingHero = existingMedia.filter((m) => m.alt === 'HERO_BANNER');
      if (existingHero.length > 0 && !window.confirm('HERO_BANNER_ALREADY_EXISTS. REPLACE_IT? THIS WILL DELETE THE CURRENT ONE.')) {
        return;
      }
    }

    if (type === 'VIDEO_TRAILER') {
      const existingVideos = existingMedia.filter((m) => m.type === 'VIDEO' || m.alt === 'VIDEO_TRAILER');
      if (existingVideos.length > 0 && !window.confirm('VIDEO_TRAILER_ALREADY_EXISTS. REPLACE_IT? THIS WILL DELETE THE CURRENT ONE.')) {
        return;
      }
    }

    if (type === 'GAME_BINARIES') {
      if (existingBuilds.length > 0 && !window.confirm('BUILD_ALREADY_EXISTS. REPLACE_IT? THIS WILL DELETE THE CURRENT BUILD.')) {
        return;
      }
    }

    if (type === 'SCREENSHOTS') {
      setFiles(prev => ({ ...prev, SCREENSHOTS: [...prev.SCREENSHOTS, ...selectedFiles].slice(0, 10) }));
      addLog(`ASSET_STAGED: SCREENSHOTS (${selectedFiles.length} ADDED)`);
    } else {
      setFiles(prev => ({ ...prev, [type]: selectedFiles[0] }));
      addLog(`ASSET_STAGED: ${type} (${selectedFiles[0].name})`);
    }
  };

  const uploadBuildArtifact = useCallback((file, uploadUrl) => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      setUploadProgress(percent);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      return reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Upload failed (network error)'));
    xhr.onabort = () => reject(new Error('Upload aborted'));

    xhr.send(file);
  }), []);

  const uploadMediaFile = useCallback(async (file, purpose, label) => {
    const presign = await storageApi.presignUpload({
      purpose: String(purpose || 'GAME_MEDIA'),
      fileName: file.name || 'upload.bin',
      contentType: file.type || 'application/octet-stream',
      sizeBytes: Number(file.size || 0)
    });
    setUploadLabel(label || file.name);
    setUploadProgress(0);
    await uploadBuildArtifact(file, presign.data.uploadUrl);
    setUploadProgress(100);
    const publicUrl = presign.data.publicUrl || presign.data.uploadUrl.split('?')[0];
    return { url: publicUrl, objectKey: presign.data.objectKey };
  }, [uploadBuildArtifact]);

  const replaceHeroBannerIfNeeded = useCallback(async () => {
    const existingHero = existingMedia.filter((m) => m.alt === 'HERO_BANNER');
    if (existingHero.length === 0) return;
    for (const media of existingHero) {
      await devApi.deleteMedia(gameIdParam, media.id);
    }
  }, [existingMedia, gameIdParam]);

  const replaceVideoTrailerIfNeeded = useCallback(async () => {
    const existingVideos = existingMedia.filter((m) => m.type === 'VIDEO' || m.alt === 'VIDEO_TRAILER');
    if (existingVideos.length === 0) return;
    for (const media of existingVideos) {
      await devApi.deleteMedia(gameIdParam, media.id);
    }
  }, [existingMedia, gameIdParam]);

  const replaceBuildsIfNeeded = useCallback(async () => {
    if (existingBuilds.length === 0) return;
    for (const build of existingBuilds) {
      try {
        await devApi.deleteBuild(build.id);
      } catch (err) {
        addLog(`WARN: BUILD_DELETE_FAILED (${build.id})`);
      }
    }
  }, [existingBuilds, addLog]);

  const handleDeleteMedia = async (mediaId) => {
    if (!window.confirm('PROTOCOL_WARNING: PERMANENTLY_PURGE_DATA? (THIS WILL ALSO DELETE FROM BUCKET)')) return;
    try {
      await devApi.deleteMedia(gameIdParam, mediaId);
      addLog('SUCCESS: MEDIA_PURGED_FROM_GRID');
      fetchGameData(); // Refresh
    } catch (err) {
      addLog(`ERROR: PURGE_FAILED - ${err.message}`);
    }
  };

  const handleLifecycleAction = async (action) => {
    if (!gameIdParam) return;
    setLoading(true);
    addLog(`INITIATING_${action.toUpperCase()}_PROTOCOL...`);
    try {
      let res;
      if (action === 'submit') {
        addLog('SYSTEM: PERFORMING_DEEP_LEVEL_ARCHIVE_INSPECTION...');
        addLog('SYSTEM: VALIDATING_RUNTIME_ENVIRONMENT...');
        res = await devApi.submitGame(gameIdParam);
      }
      else if (action === 'publish') res = await devApi.publishGame(gameIdParam);
      else if (action === 'unpublish') res = await devApi.unpublishGame(gameIdParam);
      else if (action === 'delete') {
        if (!window.confirm('CRITICAL_WARNING: DESTROY_PROJECT?')) {
          setLoading(false);
          return;
        }
        await devApi.deleteGame(gameIdParam);
        navigate('/developer');
        return;
      }

      addLog(`SUCCESS: ${action.toUpperCase()}_COMPLETE`);
      if (res?.data) {
        setForm(prev => ({ ...prev, status: res.data.status }));
        addLog(`STATUS_TRANSITION: ${res.data.status}`);
      }
    } catch (err) {
      addLog(`FAILURE: ${err.message || 'VALIDATION_FAILED'}`);
      if (err.details) addLog(`DETAILS: ${err.details}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!form.title) {
      addLog('ERROR: PROJECT_TITLE_REQUIRED');
      return;
    }

    setLoading(true);
    addLog(`INITIATING_DEPLOYMENT_SEQUENCE...`);

    try {
      let gameId = gameIdParam;

      // 1. Create or Update Game
      if (!gameId) {
        addLog('STEP_01: CREATING_NEW_GRID_RECORD...');
        const gameRes = await devApi.createGame({
          title: form.title,
          tagline: form.customTags.join(', '),
          description: form.description,
          price: form.licensing === 'FREE' ? 0 : Math.round(parseFloat(form.price || 0) * 100),
          priceType: form.licensing === 'PAID' ? 'PAID' : 'FREE',
          genres: form.genres,
          tags: form.customTags,
          platforms: form.hardwareSpecs,
          systemRequirements: {
            minimum: form.minSpecs,
            recommended: form.recSpecs
          }
        });
        gameId = gameRes.data.id;
        addLog(`SUCCESS: GAME_INITIALIZED (ID: ${gameId})`);
      } else {
        addLog('STEP_01: UPDATING_GRID_METADATA...');
        await devApi.updateGame(gameId, {
          title: form.title,
          tagline: form.customTags.join(', '),
          description: form.description,
          price: form.licensing === 'FREE' ? 0 : Math.round(parseFloat(form.price || 0) * 100),
          priceType: form.licensing === 'PAID' ? 'PAID' : 'FREE',
          genres: form.genres,
          tags: form.customTags,
          platforms: form.hardwareSpecs,
          systemRequirements: {
            minimum: form.minSpecs,
            recommended: form.recSpecs
          }
        });
        addLog('SUCCESS: METADATA_SYNC_COMPLETE');
      }

      // 2. Upload Assets
      if (files.HERO_BANNER) {
        addLog('STEP_02: TRANSMITTING_HERO_ASSETS...');
        const hero = await uploadMediaFile(files.HERO_BANNER, 'GAME_MEDIA', files.HERO_BANNER.name);
        await devApi.updateGame(gameId, { heroBannerUrl: hero.url });
        addLog('SUCCESS: HERO_BANNER_UPLOADED');
      }

      if (files.SCREENSHOTS.length > 0) {
        addLog(`STEP_02B: TRANSMITTING_SCREENSHOTS (${files.SCREENSHOTS.length})...`);
        for (const screenshot of files.SCREENSHOTS) {
          const shot = await uploadMediaFile(screenshot, 'GAME_MEDIA', screenshot.name);
          await devApi.addMedia(gameId, { type: 'IMAGE', url: shot.url, alt: 'SCREENSHOT' });
        }
        addLog('SUCCESS: SCREENSHOTS_UPLOADED');
      }

      if (files.VIDEO_TRAILER) {
        addLog('STEP_02C: TRANSMITTING_VIDEO_TRAILER...');
        const trailer = await uploadMediaFile(files.VIDEO_TRAILER, 'GAME_MEDIA', files.VIDEO_TRAILER.name);
        await devApi.updateGame(gameId, {
          trailerUrl: trailer.url,
          trailerObjectKey: trailer.objectKey
        });
        addLog('SUCCESS: VIDEO_TRAILER_UPLOADED');
      }

      // 3. Create Build + Upload Binary
      if (files.GAME_BINARIES) {
        await replaceBuildsIfNeeded();
        addLog('STEP_03: INITIALIZING_BUILD_NODE...');
        const buildRes = await devApi.createBuild(gameId, {
          version: form.version,
          platform: form.hardwareSpecs[0] || 'WINDOWS',
          runtime: form.hardwareSpecs.includes('WEB') ? 'WEB' : 'NATIVE',
          entrypoint: form.entrypoint || (form.hardwareSpecs.includes('WEB') ? 'index.html' : 'game.exe')
        });
        const buildId = buildRes.data.id;
        addLog(`SUCCESS: BUILD_READY (ID: ${buildId})`);

        addLog('STEP_04: STAGING_BINARIES...');
        const uploadInfo = await devApi.getBuildUploadUrl(buildId, {
          fileName: files.GAME_BINARIES.name || 'build.zip',
          contentType: files.GAME_BINARIES.type || 'application/octet-stream',
          sizeBytes: Number(files.GAME_BINARIES.size || 0)
        });

        addLog(`STEP_05: STREAMING_PAYLOAD (${(files.GAME_BINARIES.size / 1024 / 1024).toFixed(2)} MB)...`);
        setUploadLabel(files.GAME_BINARIES.name);
        setUploadProgress(0);
        await uploadBuildArtifact(files.GAME_BINARIES, uploadInfo.data.uploadUrl);
        setUploadProgress(100);

        await devApi.completeBuildUpload(buildId, {
          objectKey: uploadInfo.data.objectKey,
          sizeBytes: Number(files.GAME_BINARIES.size || 0)
        });
        addLog('SUCCESS: PAYLOAD_STATIONED');

        addLog('STEP_06: GRID_SECURITY_SCAN...');
        await devApi.scanBuild(buildId);
        addLog('SUCCESS: SCAN_PASSED');

        addLog('STEP_07: TRIGGERING_LIVE_DEPLOYMENT...');
        await devApi.deployBuild(buildId, { environment: 'PRODUCTION', makeLatest: true });
        addLog('DEPLOYMENT_SYNC_SUCCESSFUL!');
      } else {
        addLog('WARN: NO_BUILD_SELECTED. SKIPPING_BINARY_UPLOAD.');
      }

      if (!gameIdParam) {
        setTimeout(() => navigate(`/deployment?id=${gameId}`), 2000);
      } else {
        fetchGameData();
      }
    } catch (err) {
      console.error(err);
      addLog(`CRITICAL_FAILURE: ${err.message || 'UNKNOWN_ERROR'}`);
      if (err.details) {
        const details = Array.isArray(err.details)
          ? err.details.map((item) => `${item.field}: ${item.message}`).join(' | ')
          : String(err.details);
        addLog(`DETAILS: ${details}`);
      }
    } finally {
      setUploadProgress(null);
      setUploadLabel('');
      setLoading(false);
    }
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['clean']
    ],
  };

  if (initialLoading) {
    return (
      <div className="flex-1 flex items-center justify-center font-label-mono text-primary-container animate-pulse bg-background h-screen">
        [ ACCESSING_PROJECT_DATABASE... ]
      </div>
    );
  }

  // If not logged in, show login prompt
  if (!user) {
    return (
      <div className="max-w-container-max mx-auto p-gutter md:p-margin flex flex-col items-center justify-center min-h-[70vh] gap-8 bg-background">
        <div className="text-center max-w-2xl">
          <h1 className="font-headline-lg text-headline-lg text-secondary-container uppercase mb-4 animate-pulse glow-primary-text">
            ACCESS_DENIED
          </h1>
          <p className="font-body-md text-on-surface-variant mb-8 leading-relaxed">
            Developer protocols require active authentication.
            Initialize your profile to access the LazPlay deployment suite.
          </p>
          <Link
            to="/login"
            className="bg-secondary-container text-on-secondary px-8 py-4 font-label-mono font-bold uppercase tracking-widest hover:bg-transparent hover:text-secondary-container border-2 border-secondary-container transition-all shadow-[8px_8px_0_0_var(--secondary-container)]"
          >
            INITIALIZE_AUTH_SEQUENCE
          </Link>
        </div>
      </div>
    );
  }

  // If not a developer, redirect to workspace to register
  if (!user.roles.includes('DEVELOPER') && !user.roles.includes('ADMIN')) {
    return (
      <div className="max-w-container-max mx-auto p-gutter md:p-margin flex flex-col items-center justify-center min-h-[70vh] gap-8 bg-background">
        <div className="text-center max-w-2xl">
          <h1 className="font-headline-lg text-headline-lg text-secondary-container uppercase mb-4 animate-pulse glow-primary-text">
            PROFILE_REQUIRED
          </h1>
          <p className="font-body-md text-on-surface-variant mb-8 leading-relaxed">
            You must initialize a developer profile before accessing the deployment suite.
          </p>
          <Link
            to="/developer"
            className="bg-secondary-container text-on-secondary px-8 py-4 font-label-mono font-bold uppercase tracking-widest hover:bg-transparent hover:text-secondary-container border-2 border-secondary-container transition-all shadow-[8px_8px_0_0_var(--secondary-container)]"
          >
            RETURN_TO_WORKSPACE
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-gutter min-h-screen flex flex-col gap-gutter bg-background pb-12 grid-glow-bg">
      <style>{`
        .ql-container.ql-snow { border: none !important; font-family: inherit; font-size: 14px; color: var(--on-surface); background: var(--surface-container); }
        .ql-editor { min-height: 200px; }
        .ql-editor.ql-blank::before { color: var(--on-surface-variant) !important; opacity: 0.5; font-style: normal; }
        .ql-toolbar.ql-snow { background: var(--surface-container-high); border: 1px solid var(--outline-variant) !important; border-bottom: none !important; }
        .ql-snow .ql-stroke { stroke: var(--primary-container); }
        .ql-snow .ql-fill { fill: var(--primary-container); }
        .ql-snow .ql-picker { color: var(--primary-container); }
        .ql-snow .ql-picker-options { background-color: var(--surface-container-highest) !important; color: var(--on-surface) !important; border: 1px solid var(--outline-variant) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        .ql-snow .ql-tooltip { background-color: var(--surface-container-highest) !important; color: var(--on-surface) !important; border: 1px solid var(--outline-variant) !important; }
        .ql-snow .ql-tooltip input[type=text] { background: var(--surface-container) !important; color: var(--on-surface) !important; border: 1px solid var(--outline-variant) !important; }
        
        /* Fix white box on autofill */
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px var(--surface-container) inset !important;
            -webkit-text-fill-color: var(--on-surface) !important;
            transition: background-color 5000s ease-in-out 0s;
        }

        /* Fix potential white background in standard inputs */
        input { background-color: transparent !important; color: inherit; border: none !important; outline: none !important; box-shadow: none !important; }
        input:focus { outline: none !important; box-shadow: none !important; border: none !important; }
        input::placeholder { color: var(--on-surface-variant); opacity: 0.4; }
        
        /* Global focus reset to prevent white outlines */
        *:focus { outline: none !important; }
      `}</style>

      {/*  Header Section  */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-4">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-primary-container uppercase leading-none tracking-tighter glow-text-primary">
            {gameIdParam ? 'PROJECT_CORE_MANAGEMENT' : 'ADVANCED_DEPLOYMENT_SUITE'}
          </h1>
          <p className="font-label-mono text-on-surface-variant mt-2 tracking-widest">
            &gt; STATUS: {form.status} // ID: {gameIdParam || 'NEW_PROJECT'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {gameIdParam && (
            <div className="flex gap-2">
              {user?.roles?.includes('ADMIN') && form.status === 'PENDING_REVIEW' && (
                <button onClick={() => handleLifecycleAction('publish')} className="px-3 py-1 border border-primary-container text-primary-container font-label-mono text-[10px] hover:bg-primary-container/10">PUBLISH_LIVE</button>
              )}
              {form.status === 'PUBLISHED' && (
                <button onClick={() => handleLifecycleAction('unpublish')} className="px-3 py-1 border border-error text-error font-label-mono text-[10px] hover:bg-error/10">UNPUBLISH</button>
              )}
            </div>
          )}
          <div className="flex gap-1">
            <div className={`w-4 h-4 ${loading ? 'bg-primary-container animate-pulse' : 'bg-primary-container'}`}></div>
            <div className={`w-4 h-4 ${loading ? 'bg-primary-container animate-pulse delay-75' : 'bg-primary-container'}`}></div>
            <div className={`w-4 h-4 ${loading ? 'bg-primary-container animate-pulse delay-150' : 'bg-primary-container'}`}></div>
            <div className="w-4 h-4 bg-surface-container-highest"></div>
          </div>
        </div>
      </section>

      {/*  Bento Grid Layout  */}
      <div className="grid grid-cols-12 gap-gutter">
        {/*  Metadata Card  */}
        <div className="col-span-12 lg:col-span-7 bg-surface-container-low pixel-border p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <h3 className="font-label-mono text-primary-fixed text-label-mono flex items-center gap-2 uppercase">
              <span className="material-symbols-outlined">info</span> GAME_METADATA
            </h3>
            <span className="text-[10px] font-label-mono text-on-surface-variant uppercase tracking-widest">ENCRYPTION: ENABLED</span>
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
                  autoComplete="off"
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
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="col-span-full space-y-2">
              <label className="block font-label-mono text-[10px] text-on-surface-variant">_TARGET_ENTRYPOINT (E.G. GAME.EXE / INDEX.HTML)</label>
              <div className="flex items-center bg-surface-container text-secondary-container p-3 border border-outline-variant focus-within:border-secondary-container group">
                <span className="mr-2 group-focus-within:animate-pulse text-secondary-container">&gt;</span>
                <input
                  className="bg-transparent border-none focus:ring-0 p-0 w-full font-label-mono placeholder:opacity-30"
                  placeholder="DEFAULTS_TO_PLATFORM_STANDARD"
                  type="text"
                  name="entrypoint"
                  value={form.entrypoint}
                  onChange={handleInputChange}
                  autoComplete="off"
                />
              </div>
              <p className="text-[9px] font-label-mono text-on-surface-variant opacity-60">
                NOTE: THIS IS THE FILE THE LAUNCHER WILL ATTEMPT TO EXECUTE. LEAVE BLANK TO AUTO-DETECT.
              </p>
            </div>
            <div className="col-span-full space-y-2">
              <label className="block font-label-mono text-[10px] text-on-surface-variant">_DESCRIPTION_MANIFEST</label>
              <div className="bg-surface-container border border-outline-variant">
                <ReactQuill
                  theme="snow"
                  value={form.description}
                  onChange={handleDescriptionChange}
                  modules={quillModules}
                  placeholder="DECRYPT_CONTENT_SYNOPSIS..."
                />
              </div>
            </div>
          </div>
        </div>

        {/*  Hardware Specs Card  */}
        <div className="col-span-12 lg:col-span-5 bg-surface-container-low pixel-border p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <h3 className="font-label-mono text-primary-fixed text-label-mono flex items-center gap-2 uppercase">
              <span className="material-symbols-outlined">settings_input_component</span> PLATFORM_SPECS
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {PLATFORMS.map((spec) => (
              <label key={spec.id} className={`group flex items-center gap-3 p-3 bg-surface-container border transition-all cursor-pointer ${form.hardwareSpecs.includes(spec.id) ? 'border-primary-container bg-primary-container/10' : 'border-outline-variant hover:border-primary-container/50'}`}>
                <input
                  checked={form.hardwareSpecs.includes(spec.id)}
                  onChange={() => {
                    setForm(prev => ({
                      ...prev,
                      hardwareSpecs: prev.hardwareSpecs.includes(spec.id)
                        ? prev.hardwareSpecs.filter(s => s !== spec.id)
                        : [...prev.hardwareSpecs, spec.id]
                    }));
                  }}
                  className="form-checkbox bg-transparent border-2 border-outline-variant text-primary-container rounded-none focus:ring-0"
                  type="checkbox"
                />
                <span className={`font-label-mono text-[11px] ${form.hardwareSpecs.includes(spec.id) ? 'text-primary-container' : 'group-hover:text-primary-container'}`}>{spec.label}</span>
              </label>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-label-mono text-[10px] text-primary-container uppercase">HARDWARE_REQUIREMENTS</span>
              <div className="h-px flex-1 mx-4 bg-outline-variant/30"></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Minimum Specs */}
              <div className="space-y-3 bg-surface-container/50 p-4 border border-outline-variant/30">
                <p className="font-label-mono text-[9px] text-secondary-container uppercase mb-2 underline underline-offset-4">MINIMUM_SPECS</p>
                {['os', 'processor', 'memory', 'graphics', 'storage'].map(field => (
                  <div key={field} className="space-y-1">
                    <label className="block font-label-mono text-[8px] text-on-surface-variant uppercase">{field}</label>
                    <input
                      className="w-full bg-surface-container border border-outline-variant p-2 text-[10px] font-label-mono text-on-surface focus:border-primary-container outline-none"
                      value={form.minSpecs[field] || ''}
                      onChange={(e) => handleSpecChange('minSpecs', field, e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                ))}
              </div>

              {/* Recommended Specs */}
              <div className="space-y-3 bg-surface-container/50 p-4 border border-outline-variant/30">
                <p className="font-label-mono text-[9px] text-tertiary-fixed uppercase mb-2 underline underline-offset-4">RECOMMENDED_SPECS</p>
                {['os', 'processor', 'memory', 'graphics', 'storage'].map(field => (
                  <div key={field} className="space-y-1">
                    <label className="block font-label-mono text-[8px] text-on-surface-variant uppercase">{field}</label>
                    <input
                      className="w-full bg-surface-container border border-outline-variant p-2 text-[10px] font-label-mono text-on-surface focus:border-primary-container outline-none"
                      value={form.recSpecs[field] || ''}
                      onChange={(e) => handleSpecChange('recSpecs', field, e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/*  Categorization Module  */}
        <div className="col-span-12 lg:col-span-6 bg-surface-container-low pixel-border p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <h3 className="font-label-mono text-primary-fixed text-label-mono flex items-center gap-2 uppercase">
              <span className="material-symbols-outlined">label</span> CATEGORIZATION
            </h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block font-label-mono text-[10px] text-on-surface-variant mb-2 uppercase">_GENRE_TAGS</label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleGenre(tag)}
                    className={`px-3 py-1.5 border font-label-mono text-[9px] transition-all ${form.genres.includes(tag) ? 'border-primary-container text-primary-container bg-primary-container/10' : 'border-outline-variant text-on-surface hover:border-primary-container/50'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block font-label-mono text-[10px] text-on-surface-variant mb-2 uppercase">_CUSTOM_VECTORS</label>
              <div className="flex items-center bg-surface-container text-primary-container p-3 border border-outline-variant focus-within:border-primary-container group">
                <span className="mr-2 group-focus-within:animate-pulse">&gt;</span>
                <input
                  className="bg-transparent border-none focus:ring-0 p-0 w-full font-label-mono text-[12px] uppercase placeholder:opacity-30"
                  placeholder="ADD_TAG_AND_PRESS_ENTER"
                  type="text"
                  autoComplete="off"
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
                    <span onClick={() => setForm(prev => ({ ...prev, customTags: prev.customTags.filter(t => t !== tag) }))} className="material-symbols-outlined text-[14px] cursor-pointer hover:text-error transition-colors">close</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/*  Store Info Module  */}
        <div className="col-span-12 lg:col-span-6 bg-surface-container-low pixel-border p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <h3 className="font-label-mono text-primary-fixed text-label-mono flex items-center gap-2 uppercase">
              <span className="material-symbols-outlined">storefront</span> STORE_INTEGRATION
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <div className="space-y-2">
              <label className="block font-label-mono text-[10px] text-on-surface-variant uppercase">_LICENSING_MODEL</label>
              <div className="relative bg-surface-container border border-outline-variant focus-within:border-primary-container">
                <select
                  name="licensing"
                  value={form.licensing}
                  onChange={handleInputChange}
                  className="w-full bg-surface-container-high border-none text-primary-container font-label-mono p-3 appearance-none focus:ring-0 cursor-pointer text-[12px] outline-none uppercase"
                >
                  <option value="PAID">PREMIUM (PAID)</option>
                  <option value="FREE">FREE_TO_PLAY (F2P)</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary-container">expand_more</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block font-label-mono text-[10px] text-on-surface-variant uppercase">_BASE_PRICE (INR)</label>
              <div className={`flex items-center p-3 border transition-all group ${form.licensing === 'FREE' ? 'bg-surface-container-lowest border-outline-variant/20 grayscale' : 'bg-surface-container text-primary-container border-outline-variant focus-within:border-primary-container'}`}>
                <span className="mr-2 text-on-surface-variant font-label-mono">₹</span>
                <input
                  className="bg-transparent border-none focus:ring-0 p-0 w-full font-label-mono text-[12px]"
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleInputChange}
                  disabled={form.licensing === 'FREE'}
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        </div>

        {/*  Asset Deployment Card  */}
        <div className="col-span-12 bg-surface-container-low pixel-border p-6">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3 mb-6">
            <h3 className="font-label-mono text-primary-fixed text-label-mono flex items-center gap-2 uppercase">
              <span className="material-symbols-outlined">cloud_upload</span> ASSET_DEPLOYMENT
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
              { id: 'COVER_IMAGE', icon: 'auto_stories', label: 'PROJECT_COVER', sub: '600x900 (2:3 RATIO)', accept: 'image/*' },
              { id: 'HERO_BANNER', icon: 'image', label: 'HERO_BANNER', sub: '1920x1080 (16:9)', accept: 'image/*' },
              { id: 'SCREENSHOTS', icon: 'collections', label: 'SCREENSHOTS', sub: '1920x1080 (MAX 10)', accept: 'image/*', multiple: true },
              { id: 'VIDEO_TRAILER', icon: 'movie', label: 'VIDEO_TRAILER', sub: '.MP4 (MAX 1GB)', accept: 'video/*' },
              { id: 'GAME_BINARIES', icon: 'folder_zip', label: 'GAME_BINARIES', sub: '.ZIP / .EXE / .PKG', accept: '*' }
            ].map(slot => (
              <div
                key={slot.id}
                onClick={() => fileInputRefs[slot.id].current?.click()}
                className={`relative border-2 border-dashed p-6 flex flex-col items-center justify-center text-center bg-surface-container-lowest transition-all group cursor-pointer min-h-[160px] ${files[slot.id] && (Array.isArray(files[slot.id]) ? files[slot.id].length > 0 : true) ? 'border-primary-container bg-primary-container/5 shadow-[0_0_15px_rgba(var(--primary-container-rgb),0.1)]' : 'border-outline-variant hover:border-primary-container hover:bg-surface-container-low'}`}
              >
                <input type="file" ref={fileInputRefs[slot.id]} className="hidden" multiple={slot.multiple} accept={slot.accept} onChange={(e) => handleFileSelect(slot.id, e)} />
                <span className={`material-symbols-outlined text-headline-md group-hover:text-primary-container mb-2 transition-transform group-hover:scale-110 ${files[slot.id] && (Array.isArray(files[slot.id]) ? files[slot.id].length > 0 : true) ? 'text-primary-container animate-pulse' : 'text-outline'}`}>{slot.icon}</span>
                <p className={`font-label-mono text-[11px] font-bold uppercase tracking-wider mb-1 ${files[slot.id] && (Array.isArray(files[slot.id]) ? files[slot.id].length > 0 : true) ? 'text-primary-container' : 'text-on-surface'}`}>{slot.label}</p>
                <p className="font-label-mono text-[8px] text-on-surface-variant opacity-70 group-hover:opacity-100 transition-opacity">
                  {files[slot.id] ? (Array.isArray(files[slot.id]) ? `${files[slot.id].length}_FILES_STAGED` : `${files[slot.id].name.slice(0, 15)}...`) : slot.sub}
                </p>
                {files[slot.id] && (Array.isArray(files[slot.id]) ? files[slot.id].length > 0 : true) && (
                  <div className="absolute top-2 right-2 p-1 bg-surface-container-highest hover:bg-error/20 transition-colors cursor-pointer group/close" onClick={(e) => { e.stopPropagation(); setFiles(prev => ({ ...prev, [slot.id]: slot.id === 'SCREENSHOTS' ? [] : null })); }}>
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant group-hover/close:text-error transition-colors">close</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {gameIdParam && existingMedia.length > 0 && (
            <div className="space-y-4 mt-8 pt-8 border-t border-outline-variant">
              <h4 className="font-label-mono text-[10px] text-primary-container uppercase tracking-widest">STATIONED_MEDIA_ASSETS</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {existingMedia.map(m => (
                  <div key={m.id} className="relative aspect-video bg-surface-container border border-outline-variant group overflow-hidden">
                    {m.type === 'IMAGE' ? (
                      <img src={m.url} alt="Staged" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-secondary-container">video_library</span></div>
                    )}
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDeleteMedia(m.id)} className="bg-error text-on-error p-2 rounded-full hover:scale-110 transition-transform"><span className="material-symbols-outlined text-sm">delete</span></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gameIdParam && existingBuilds.length > 0 && (
            <div className="space-y-4 mt-8 pt-8 border-t border-outline-variant">
              <h4 className="font-label-mono text-[10px] text-primary-container uppercase tracking-widest">STATIONED_BUILD_ARTIFACTS</h4>
              <div className="space-y-2">
                {existingBuilds.map((build) => (
                  <div key={build.id} className="flex items-center justify-between border border-outline-variant bg-surface-container px-3 py-2">
                    <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">
                      <span className="text-primary-container">{build.version}</span> · {build.platform} · {build.status}
                    </div>
                    <button
                      onClick={async () => {
                        if (!window.confirm('DELETE_BUILD_ARTIFACT? THIS CANNOT BE UNDONE.')) return;
                        try {
                          await devApi.deleteBuild(build.id);
                          addLog(`SUCCESS: BUILD_DELETED (${build.id})`);
                          fetchGameData();
                        } catch (err) {
                          addLog(`ERROR: BUILD_DELETE_FAILED - ${err.message}`);
                        }
                      }}
                      className="text-[10px] font-label-mono text-error border border-error/60 px-2 py-1 hover:bg-error hover:text-on-error"
                    >
                      DELETE_BUILD
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/*  Terminal Feed / Console Output  */}
        <div className="col-span-12 lg:col-span-8 bg-[#050505] border-2 border-outline-variant h-[300px] flex flex-col relative overflow-hidden group shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb),0.05)_1px,transparent_1px)] bg-[length:100%_4px] pointer-events-none"></div>
          <div className="bg-surface-container border-b-2 border-outline-variant px-3 py-1.5 flex justify-between items-center">
            <span className="font-label-mono text-[10px] text-primary-container flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">terminal</span> DEPLOYMENT_LOGS.txt
            </span>
            <div className="flex gap-1">
              <div className="w-2 h-2 border border-outline-variant"></div>
              <div className="w-2 h-2 border border-outline-variant"></div>
              <div className="w-2 h-2 bg-primary-container"></div>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-y-auto font-label-mono text-[10px] space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-4">
                <span className="text-on-surface-variant opacity-40">[{log.time}]</span>
                <span className={log.msg.includes('ERROR') ? 'text-error' : (log.msg.includes('SUCCESS') ? 'text-secondary-fixed' : 'text-primary-container')}>
                  {log.msg.startsWith('STEP') ? `>> ${log.msg}` : `> ${log.msg}`}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2">
              <span className="text-primary-container animate-pulse">&gt;</span>
              <span className="w-2 h-4 bg-primary-container animate-blink"></span>
            </div>
          </div>
          {uploadProgress !== null && (
            <div className="absolute bottom-0 left-0 right-0 bg-surface-container-highest border-t border-primary-container/30 p-4 animate-slide-up">
              <div className="flex justify-between font-label-mono text-[10px] text-primary-container mb-2">
                <span>UPLOADING_PAYLOAD: {uploadLabel}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1 bg-surface-container border border-outline-variant relative overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-primary-container shadow-[0_0_10px_var(--primary-container)] transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/*  Action Area  */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
          <button
            onClick={form.status === 'DRAFT' && existingBuilds.length > 0 ? () => handleLifecycleAction('submit') : handleDeploy}
            disabled={loading}
            className={`w-full h-full font-headline-md p-6 pixel-border-active hover:scale-[1.02] active:scale-95 transition-all flex flex-col items-center justify-center gap-4 group min-h-[150px] ${loading ? 'bg-surface-container-highest text-on-surface-variant cursor-wait' : (form.status === 'DRAFT' && existingBuilds.length > 0 ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary-container text-on-primary-container')}`}
          >
            <span className={`material-symbols-outlined text-headline-xl group-hover:scale-110 transition-transform ${loading ? 'animate-spin' : ''}`}>
              {loading ? 'sync' : (form.status === 'DRAFT' && existingBuilds.length > 0 ? 'assignment_turned_in' : 'rocket_launch')}
            </span>
            <span className="uppercase tracking-tighter font-extrabold">
              {loading ? 'SYNCING...' : (form.status === 'DRAFT' && existingBuilds.length > 0 ? 'SUBMIT_FOR_REVIEW' : (gameIdParam ? 'UPDATE_&_DEPLOY' : 'INITIATE_DEPLOY'))}
            </span>
            <span className="font-label-mono text-[10px] opacity-70 uppercase">
              {form.status === 'DRAFT' && existingBuilds.length > 0 ? 'SYSTEM_READY_FOR_INSPECTION' : (gameIdParam ? 'FORCE_OVERWRITE_ACTIVE' : 'CONFIRM_GRID_UPLOAD')}
            </span>
          </button>

          {gameIdParam && (
            <button
              onClick={() => handleLifecycleAction('delete')}
              disabled={loading}
              className="w-full py-4 border-2 border-error/50 text-error font-label-mono hover:bg-error hover:text-on-error transition-all uppercase tracking-widest text-[10px]"
            >
              TERMINATE_PROJECT
            </button>
          )}

          <button onClick={() => navigate('/developer')} className="w-full py-4 border-2 border-outline-variant text-on-surface-variant font-label-mono hover:bg-surface-variant transition-all uppercase tracking-widest text-[10px]">
            EXIT_WORKSPACE
          </button>
        </div>
      </div>
    </div>
  );
}

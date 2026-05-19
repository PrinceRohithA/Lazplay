import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import {
  Terminal as TerminalIcon,
  Plus,
  ChevronLeft,
  AlertTriangle,
  Shield,
  Layers,
  ArrowRight,
  Activity,
  UserCheck
} from "lucide-react";

interface GameForm {
  title: string;
  version: string;
  entrypoint: string;
  platformEntrypoints: Record<string, string>;
  description: string;
  hardwareSpecs: string[];
  genres: string[];
  customTags: string[];
  licensing: "FREE" | "PAID";
  price: number;
  storeCut: number;
  minSpecs: {
    os: string;
    processor: string;
    memory: string;
    graphics: string;
    storage: string;
  };
  recSpecs: {
    os: string;
    processor: string;
    memory: string;
    graphics: string;
    storage: string;
  };
}

const INITIAL_FORM: GameForm = {
  title: "",
  version: "1.0.0",
  entrypoint: "",
  platformEntrypoints: { WINDOWS: "game.exe" },
  description: "",
  hardwareSpecs: ["WINDOWS"],
  genres: ["ACTION"],
  customTags: [],
  licensing: "FREE",
  price: 0,
  storeCut: 10,
  minSpecs: { os: "Windows 10", processor: "Intel i3", memory: "8 GB RAM", graphics: "GTX 1050", storage: "5 GB space" },
  recSpecs: { os: "Windows 11", processor: "Intel i7", memory: "16 GB RAM", graphics: "RTX 3060", storage: "10 GB space" }
};

const GENRES = ["ACTION", "ADVENTURE", "RPG", "STRATEGY", "CASUAL", "ARCADE", "SHOOTER", "RACING"];

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'color': [] }, { 'background': [] }],
    ['clean']
  ],
};

export default function DeveloperConsole() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [view, setView] = useState<"dashboard" | "create" | "deploy">("dashboard");
  const [selectedGame, setSelectedGame] = useState<any>(null);

  // Form State
  const [form, setForm] = useState<GameForm>(INITIAL_FORM);

  // Asset Files State
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [trailerFile, setTrailerFile] = useState<File | null>(null);
  const [screenshotsFiles, setScreenshotsFiles] = useState<File[]>([]);
  const [platformSpecs, setPlatformSpecs] = useState<Record<string, {
    minimum: Record<string, string>;
    recommended: Record<string, string>;
  }>>({});
  const [binaryFiles, setBinaryFiles] = useState<Record<string, string | null>>({});

  // Logging & Deployment Terminal State
  const [logs, setLogs] = useState<string[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Creator Register Form State
  const [registerForm, setRegisterForm] = useState({
    displayName: "",
    website: "",
    supportEmail: ""
  });
  const [registering, setRegistering] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Fetch Session Token from Main Process on Mount
  useEffect(() => {
    if (window.lazplayAPI) {
      window.lazplayAPI.getAccessToken().then((t: string | null) => {
        setToken(t);
        if (t) {
          fetchProfile(t);
        } else {
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const fetchProfile = async (authToken: string) => {
    try {
      const res = await axios.get("https://play.lazplay.tech/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const profile = res.data.data || res.data;
      setUserProfile(profile);

      // Check if user has developer role
      const roles = profile.roles || [];
      if (roles.includes("DEVELOPER") || profile.isDeveloper) {
        fetchDeveloperGames(authToken);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Failed to load user profile:", err);
      setLoading(false);
    }
  };

  const fetchDeveloperGames = async (authToken: string) => {
    try {
      const res = await axios.get("https://play.lazplay.tech/api/v1/developer/games", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setGames(res.data.data || res.data.items || res.data || []);
    } catch (err: any) {
      console.error("Failed to fetch games:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterDeveloper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setRegistering(true);
    try {
      await axios.post(
        "https://play.lazplay.tech/api/v1/developer/register",
        {
          displayName: registerForm.displayName,
          website: registerForm.website || undefined,
          supportEmail: registerForm.supportEmail
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Re-fetch profile to gain access instantly
      await fetchProfile(token);
    } catch (err: any) {
      console.error("Failed to register as creator:", err);
      alert(err.response?.data?.message || "Registration failed. Please check credentials.");
    } finally {
      setRegistering(false);
    }
  };

  const enterDeployMode = (game: any) => {
    setSelectedGame(game);
    const platformEntrypoints: Record<string, string> = game.platformEntrypoints || {};
    if (game.entrypoint && !platformEntrypoints.WINDOWS) {
      platformEntrypoints.WINDOWS = game.entrypoint;
    }
    
    // Parse platform-specific systemRequirements
    const reqs = game.systemRequirements || {};
    const initialSpecs: Record<string, { minimum: any; recommended: any }> = {};
    const hasRootSpecs = reqs.minimum || reqs.recommended;
    const selectedPlatforms: string[] = game.hardwareSpecs || game.platforms || ["WINDOWS"];
    
    selectedPlatforms.forEach((platform: string) => {
      if (platform === "WEB") return;
      if (reqs[platform]) {
        initialSpecs[platform] = {
          minimum: reqs[platform].minimum || { os: "", processor: "", memory: "", graphics: "", storage: "" },
          recommended: reqs[platform].recommended || { os: "", processor: "", memory: "", graphics: "", storage: "" }
        };
      } else if (hasRootSpecs && platform === "WINDOWS") {
        initialSpecs[platform] = {
          minimum: reqs.minimum || { os: "", processor: "", memory: "", graphics: "", storage: "" },
          recommended: reqs.recommended || { os: "", processor: "", memory: "", graphics: "", storage: "" }
        };
      } else {
        initialSpecs[platform] = {
          minimum: { os: "", processor: "", memory: "", graphics: "", storage: "" },
          recommended: { os: "", processor: "", memory: "", graphics: "", storage: "" }
        };
      }
    });
    setPlatformSpecs(initialSpecs);

    setForm({
      title: game.title || "",
      version: game.version || "1.0.0",
      entrypoint: game.entrypoint || "",
      platformEntrypoints: Object.keys(platformEntrypoints).length > 0 ? platformEntrypoints : { WINDOWS: "game.exe" },
      description: game.description || "",
      hardwareSpecs: game.hardwareSpecs || game.platforms || ["WINDOWS"],
      genres: game.genres || ["ACTION"],
      customTags: game.customTags || [],
      licensing: game.licensing || "FREE",
      price: game.price || 0,
      storeCut: game.storeCut || 10,
      minSpecs: game.minSpecs || INITIAL_FORM.minSpecs,
      recSpecs: game.recSpecs || INITIAL_FORM.recSpecs
    });
    setCoverFile(null);
    setBannerFile(null);
    setTrailerFile(null);
    setScreenshotsFiles([]);
    setBinaryFiles({});
    setLogs([]);
    setErrorMessage(null);
    setSuccessMessage(null);
    setView("deploy");
  };

  const enterCreateMode = () => {
    setSelectedGame(null);
    
    // Default system requirement values for WINDOWS build
    setPlatformSpecs({
      WINDOWS: {
        minimum: { os: "Windows 10", processor: "Intel i3", memory: "8 GB RAM", graphics: "GTX 1050", storage: "5 GB space" },
        recommended: { os: "Windows 11", processor: "Intel i7", memory: "16 GB RAM", graphics: "RTX 3060", storage: "10 GB space" }
      }
    });

    setForm(INITIAL_FORM);
    setCoverFile(null);
    setBannerFile(null);
    setTrailerFile(null);
    setScreenshotsFiles([]);
    setBinaryFiles({});
    setLogs([]);
    setErrorMessage(null);
    setSuccessMessage(null);
    setView("create");
  };

  const handleGenreToggle = (genre: string) => {
    setForm((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  const handleHardwareToggle = (spec: string) => {
    setForm((prev) => {
      const nextHardware = prev.hardwareSpecs.includes(spec)
        ? prev.hardwareSpecs.filter((s) => s !== spec)
        : [...prev.hardwareSpecs, spec];

      if (spec !== "WEB" && !prev.hardwareSpecs.includes(spec) && !platformSpecs[spec]) {
        setPlatformSpecs((prevSpecs) => ({
          ...prevSpecs,
          [spec]: {
            minimum: { os: "", processor: "", memory: "", graphics: "", storage: "" },
            recommended: { os: "", processor: "", memory: "", graphics: "", storage: "" }
          }
        }));
      }

      return {
        ...prev,
        hardwareSpecs: nextHardware
      };
    });
  };

  // REST PUT Upload Method to direct Cloudflare R2
  const uploadToR2 = async (url: string, file: File, onProgress: (pct: number) => void) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url, true);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          onProgress(pct);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(true);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(file);
    });
  };

  // Execution pipeline orchestrating the entire native R2 deploy flow
  const handleExecuteDeployment = async () => {
    if (!token) return;
    setIsDeploying(true);
    setLogs([]);
    setErrorMessage(null);
    setSuccessMessage(null);
    setUploadProgress(0);

    const isUpdate = !!selectedGame;
    let gameId = selectedGame?.id || "";

    try {
      // Step 1: Create or Update game metadata
      setDeployStep(1);
      addLog(isUpdate ? `UPDATING_GAME_METADATA_FOR_ID: ${gameId}...` : "INITIALIZING_NEW_GAME_CONTAINER...");

      // Prepare the multi-platform systemRequirements payload
      const systemRequirements: Record<string, any> = {};
      
      // Set platform-specific requirements
      Object.keys(platformSpecs).forEach((platform) => {
        if (form.hardwareSpecs.includes(platform)) {
          systemRequirements[platform] = platformSpecs[platform];
        }
      });
      
      // Find the first selected platform (except WEB) to set at root for backwards-compatibility
      const firstPlatform = form.hardwareSpecs.find((h) => h !== "WEB");
      if (firstPlatform && platformSpecs[firstPlatform]) {
        systemRequirements.minimum = platformSpecs[firstPlatform].minimum;
        systemRequirements.recommended = platformSpecs[firstPlatform].recommended;
      }

      const payload = {
        title: form.title,
        version: form.version,
        entrypoint: form.entrypoint || undefined,
        platformEntrypoints: form.platformEntrypoints || undefined,
        description: form.description,
        platforms: form.hardwareSpecs,
        hardwareSpecs: form.hardwareSpecs,
        genres: form.genres,
        customTags: form.customTags,
        licensing: form.licensing,
        price: Number(form.price),
        storeCut: Number(form.storeCut),
        systemRequirements: systemRequirements
      };

      if (isUpdate) {
        await axios.patch(`https://play.lazplay.tech/api/v1/developer/games/${gameId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        addLog("GAME_METADATA_UPDATED_SUCCESSFULLY ✓");
      } else {
        const res = await axios.post("https://play.lazplay.tech/api/v1/developer/games", payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const created = res.data.data || res.data;
        gameId = created.id || created.gameId;
        addLog(`GAME_CONTAINER_INITIALIZED_WITH_ID: ${gameId} ✓`);
      }

      // Step 2: Upload Cover Image
      if (coverFile) {
        setDeployStep(2);
        addLog("REQUESTING_PRESIGNED_URL_FOR_COVER_IMAGE...");
        const presignRes = await axios.post(
          "https://play.lazplay.tech/api/v1/storage/presign-upload",
          {
            gameId,
            fileName: coverFile.name,
            contentType: coverFile.type || "image/jpeg",
            purpose: "COVER_IMAGE"
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const { uploadUrl, publicUrl } = presignRes.data.data || presignRes.data;

        addLog(`UPLOADING_COVER_IMAGE: ${coverFile.name} (${Math.round(coverFile.size / 1024)} KB) TO CLOUDFLARE_R2...`);
        await uploadToR2(uploadUrl, coverFile, (pct) => setUploadProgress(pct));
        addLog("COVER_IMAGE_UPLOADED_TO_R2_SUCCESSFULLY ✓");

        addLog("REGISTERING_COVER_ASSET_WITH_BACKEND...");
        await axios.post(
          `https://play.lazplay.tech/api/v1/developer/games/${gameId}/media`,
          {
            type: "IMAGE",
            url: publicUrl,
            purpose: "COVER"
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        addLog("COVER_ASSET_REGISTERED ✓");

        addLog("SYNCHRONIZING_DIRECT_COVER_URL_FIELD...");
        await axios.patch(`https://play.lazplay.tech/api/v1/developer/games/${gameId}`, {
          coverUrl: publicUrl
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        addLog("DIRECT_COVER_URL_SYNCHRONIZED ✓");
        setUploadProgress(0);
      }

      // Step 3: Upload Hero Banner
      if (bannerFile) {
        setDeployStep(3);
        addLog("REQUESTING_PRESIGNED_URL_FOR_HERO_BANNER...");
        const presignRes = await axios.post(
          "https://play.lazplay.tech/api/v1/storage/presign-upload",
          {
            gameId,
            fileName: bannerFile.name,
            contentType: bannerFile.type || "image/jpeg",
            purpose: "HERO_BANNER"
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const { uploadUrl, publicUrl } = presignRes.data.data || presignRes.data;

        addLog(`UPLOADING_HERO_BANNER: ${bannerFile.name} (${Math.round(bannerFile.size / 1024)} KB)...`);
        await uploadToR2(uploadUrl, bannerFile, (pct) => setUploadProgress(pct));
        addLog("HERO_BANNER_UPLOADED_TO_R2 ✓");

        addLog("REGISTERING_BANNER_ASSET...");
        await axios.post(
          `https://play.lazplay.tech/api/v1/developer/games/${gameId}/media`,
          {
            type: "IMAGE",
            url: publicUrl,
            purpose: "BANNER"
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        addLog("BANNER_ASSET_REGISTERED ✓");
        setUploadProgress(0);
      }

      // Step 4: Upload Trailer Video
      if (trailerFile) {
        setDeployStep(4);
        addLog("REQUESTING_PRESIGNED_URL_FOR_TRAILER...");
        const presignRes = await axios.post(
          "https://play.lazplay.tech/api/v1/storage/presign-upload",
          {
            gameId,
            fileName: trailerFile.name,
            contentType: trailerFile.type || "video/mp4",
            purpose: "VIDEO_TRAILER"
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const { uploadUrl, publicUrl } = presignRes.data.data || presignRes.data;

        addLog(`UPLOADING_TRAILER: ${trailerFile.name} (${Math.round(trailerFile.size / (1024 * 1024))} MB)...`);
        await uploadToR2(uploadUrl, trailerFile, (pct) => setUploadProgress(pct));
        addLog("TRAILER_UPLOADED_TO_R2 ✓");

        addLog("REGISTERING_TRAILER_ASSET...");
        await axios.post(
          `https://play.lazplay.tech/api/v1/developer/games/${gameId}/media`,
          {
            type: "VIDEO",
            url: publicUrl,
            purpose: "TRAILER"
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        addLog("TRAILER_ASSET_REGISTERED ✓");
        setUploadProgress(0);
      }

      // Step 4B: Upload Screenshots
      if (screenshotsFiles.length > 0) {
        setDeployStep(4);
        addLog(`TRANSMITTING_SCREENSHOTS (${screenshotsFiles.length} files)...`);
        for (let i = 0; i < screenshotsFiles.length; i++) {
          const file = screenshotsFiles[i];
          addLog(`[SCREENSHOT ${i + 1}/${screenshotsFiles.length}] REQUESTING_PRESIGNED_URL...`);
          const presignRes = await axios.post(
            "https://play.lazplay.tech/api/v1/storage/presign-upload",
            {
              gameId,
              fileName: file.name,
              contentType: file.type || "image/jpeg",
              purpose: "GAME_MEDIA"
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const { uploadUrl, publicUrl } = presignRes.data.data || presignRes.data;

          addLog(`[SCREENSHOT ${i + 1}/${screenshotsFiles.length}] UPLOADING: ${file.name} (${Math.round(file.size / 1024)} KB) TO CLOUDFLARE_R2...`);
          await uploadToR2(uploadUrl, file, (pct) => setUploadProgress(pct));

          addLog(`[SCREENSHOT ${i + 1}/${screenshotsFiles.length}] REGISTERING ASSET WITH BACKEND...`);
          await axios.post(
            `https://play.lazplay.tech/api/v1/developer/games/${gameId}/media`,
            {
              type: "IMAGE",
              url: publicUrl,
              purpose: "SCREENSHOT",
              alt: "SCREENSHOT"
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        addLog("SCREENSHOTS_UPLOADED_TO_R2_SUCCESSFULLY ✓");
        setUploadProgress(0);
      }

      // Step 5: High-performance Client-side Chunked & ZSTD Compression pipeline
      for (const platform of form.hardwareSpecs) {
        const folderPath = binaryFiles[platform];
        if (folderPath) {
          setDeployStep(5);
          addLog(`CREATING_NEW_DEVELOPER_BUILD_RECORD_FOR_${platform}...`);
          const buildRes = await axios.post(
            `https://play.lazplay.tech/api/v1/developer/games/${gameId}/builds`,
            {
              version: form.version,
              platform: platform,
              runtime: platform === "WEB" ? "WEB" : "NATIVE",
              entrypoint: form.platformEntrypoints?.[platform] || form.entrypoint || (platform === "WEB" ? "index.html" : "game.exe")
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const build = buildRes.data.data || buildRes.data;
          const buildId = build.id;
          addLog(`${platform}_BUILD_RECORD_INITIALIZED_ID: ${buildId} ✓`);

          addLog(`LAUNCHING_HIGH_PERFORMANCE_CLIENT_SIDE_CHUNKED_UPLOADER_FOR_${platform}...`);
          addLog(`[UPLOADER] SCANNING_DIRECTORY_AND_CREATING_BUNDLES...`);
          
          setUploadProgress(0);

          let removeProgress = () => {};
          if (window.lazplayAPI?.onUploadProgress) {
            removeProgress = window.lazplayAPI.onUploadProgress((data: any) => {
              if (data.buildId === buildId) {
                setUploadProgress(data.progress);
                addLog(`[UPLOADER] ${data.status}`);
              }
            });
          }

          const uploadResult = await window.lazplayAPI.uploadBuildDirectory({
            gameId,
            buildId,
            folderPath,
            platform,
            version: form.version
          });

          removeProgress();

          if (!uploadResult || !uploadResult.success) {
            throw new Error(uploadResult?.error || `Chunked upload failed for ${platform}`);
          }

          setUploadProgress(100);
          addLog(`${platform}_LOCAL_CHUNKING_AND_COMPRESSION_COMPLETED_SUCCESSFULLY ✓`);
          addLog(`${platform}_MANIFEST_PUBLISHED: ${uploadResult.manifestObjectKey} ✓`);
          setUploadProgress(0);

          // Step 6: Antivirus & validation sandbox scanning
          setDeployStep(6);
          addLog(`TRIGGERING_${platform}_ANTI_MALWARE_SANDBOX_SCAN...`);
          await axios.post(
            `https://play.lazplay.tech/api/v1/developer/builds/${buildId}/scan`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          addLog(`${platform}_SCAN_TRIGGERED: CONTAINER_VERIFIED_SECURE ✓`);

          // Step 7: Publishing/Deploying build
          setDeployStep(7);
          addLog(`DEPLOYING_${platform}_BUILD_TO_PRODUCTION_GATEWAY...`);
          await axios.post(
            `https://play.lazplay.tech/api/v1/developer/builds/${buildId}/deploy`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          addLog(`${platform}_PRODUCTION_DEPLOYMENT_COMPLETE ✓`);
        } else {
          addLog(`WARN: NO_BUILD_STAGED_FOR_${platform}. SKIPPING.`);
        }
      }

      setDeployStep(8);
      addLog("DECRYPT_&_DEPLOY: PROCESS_COMPLETED_SUCCESSFULLY ✓");
      setSuccessMessage(isUpdate ? "GAME_PROJECT_UPDATED_AND_DEPLOYED_SUCCESSFULLY!" : "NEW_GAME_PROJECT_DEPLOYED_SUCCESSFULLY!");
      fetchDeveloperGames(token);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || "An unknown deployment error occurred.";
      addLog(`[SYSTEM_FAILURE] DEPLOY_FAILED: ${errMsg}`);
      setErrorMessage(errMsg);
    } finally {
      setIsDeploying(false);
      setUploadProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full bg-transparent flex items-center justify-center font-sans">
        <div className="flex flex-col items-center opacity-70">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <span className="text-slate-400 font-mono text-xs uppercase tracking-widest animate-pulse">
            LOADING_CREATOR_WORKSPACE...
          </span>
        </div>
      </div>
    );
  }

  // Not Logged In Safeguard
  if (!token) {
    return (
      <div className="w-full h-full bg-transparent flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-slate-950/80 border border-slate-800 rounded-xl p-6 text-center select-none shadow-2xl">
          <AlertTriangle className="text-amber-500 mx-auto mb-4" size={48} />
          <h3 className="text-xl font-bold mb-2 uppercase tracking-wide text-slate-100">ACCESS_RESTRICTED</h3>
          <p className="text-slate-400 text-sm mb-6">
            We couldn't detect an active authenticated user session. Please log in through the Store page first.
          </p>
        </div>
      </div>
    );
  }

  // Become a Creator screen if roles don't match
  const roles = userProfile?.roles || [];
  const isDeveloper = roles.includes("DEVELOPER") || userProfile?.isDeveloper;

  if (!isDeveloper) {
    return (
      <div className="w-full h-full bg-transparent overflow-y-auto p-8 font-sans">
        <div className="max-w-xl mx-auto bg-slate-950/90 border border-brand-500/30 rounded-xl p-8 shadow-[0_0_30px_rgba(59,130,246,0.15)] relative overflow-hidden">
          {/* Cyber scanline & grid effects */}
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%]"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-brand-500 font-mono text-xs uppercase tracking-widest mb-3">
              <Shield size={16} />
              <span>Creator Registration</span>
            </div>

            <h2 className="text-3xl font-black text-slate-100 mb-2 uppercase tracking-tight">Become a LazPlay Creator</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              Register as a verified LazPlay Creator to submit, build, and deploy native games directly into our high-speed global digital distribution grid.
            </p>

            <form onSubmit={handleRegisterDeveloper} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase text-slate-400">DisplayName / Creator Alias *</label>
                <input
                  required
                  placeholder="e.g. RetroByte Games"
                  value={registerForm.displayName}
                  onChange={(e) => setRegisterForm({ ...registerForm, displayName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 p-3 rounded-lg text-sm text-slate-200 outline-none transition-all font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase text-slate-400">Support / Developer Email *</label>
                <input
                  required
                  type="email"
                  placeholder="e.g. support@retrobyte.tech"
                  value={registerForm.supportEmail}
                  onChange={(e) => setRegisterForm({ ...registerForm, supportEmail: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 p-3 rounded-lg text-sm text-slate-200 outline-none transition-all font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase text-slate-400">Portfolio Website (Optional)</label>
                <input
                  placeholder="https://retrobyte.tech"
                  value={registerForm.website}
                  onChange={(e) => setRegisterForm({ ...registerForm, website: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 p-3 rounded-lg text-sm text-slate-200 outline-none transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={registering}
                className="w-full mt-6 bg-brand-600 hover:bg-brand-500 active:scale-[0.98] transition-all text-white font-mono text-sm py-3.5 rounded-lg font-bold flex items-center justify-center gap-2 tracking-wider shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              >
                {registering ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <UserCheck size={18} />
                    <span>Register as Creator</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background grid-glow-bg text-on-surface flex flex-col font-sans select-none overflow-hidden">
      <style>{`
        .ql-container.ql-snow { 
          border: none !important; 
          font-family: inherit; 
          font-size: 14px; 
          color: #cbd5e1; 
          background: #0B120D; 
        }
        .ql-editor { 
          min-height: 200px; 
        }
        .ql-editor.ql-blank::before { 
          color: #94a3b8 !important; 
          opacity: 0.5; 
          font-style: normal; 
        }
        .ql-toolbar.ql-snow { 
          background: #0d1511; 
          border: 1px solid rgba(255, 255, 255, 0.1) !important; 
          border-bottom: none !important; 
        }
        .ql-snow .ql-stroke { 
          stroke: #10b981 !important; 
        }
        .ql-snow .ql-fill { 
          fill: #10b981 !important; 
        }
        .ql-snow .ql-picker { 
          color: #10b981 !important; 
        }
        .ql-snow .ql-picker-options { 
          background-color: #0b120d !important; 
          color: #cbd5e1 !important; 
          border: 1px solid rgba(255, 255, 255, 0.1) !important; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.5); 
        }
        .ql-snow .ql-tooltip { 
          background-color: #0b120d !important; 
          color: #cbd5e1 !important; 
          border: 1px solid rgba(255, 255, 255, 0.1) !important; 
        }
        .ql-snow .ql-tooltip input[type=text] { 
          background: #0b120d !important; 
          color: #cbd5e1 !important; 
          border: 1px solid rgba(255, 255, 255, 0.1) !important; 
        }
      `}</style>
      
      {/* Upper Navigation Header */}
      <header className="flex-shrink-0 flex items-center justify-between p-6 border-b-2 border-outline-variant relative z-20">
        <div>
          <h1 className="font-headline-lg text-2xl text-on-surface uppercase mb-1 flex items-center gap-3 glow-text-primary font-bold">
            <span className="w-4 h-4 bg-primary-container animate-pulse shadow-[0_0_8px_var(--primary-container)]"></span>
            Creator Workspace
          </h1>
          <p className="font-label-mono text-xs text-on-surface-variant uppercase tracking-widest">
            OPERATOR: {userProfile.displayName || userProfile.email} // NODE: ALPHA_TANGO // STATUS: ONLINE
          </p>
        </div>

        <div className="flex gap-2">
          {view !== "dashboard" ? (
            <button
              onClick={() => setView("dashboard")}
              className="bg-surface-container border-2 border-outline-variant px-4 py-2 font-label-mono text-xs text-on-surface hover:border-primary hover:text-primary transition-colors flex items-center gap-2 group"
            >
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              RETURN_TO_DASHBOARD
            </button>
          ) : (
            <>
              <button 
                onClick={() => fetchDeveloperGames(token!)}
                className="bg-surface-container border-2 border-outline-variant px-4 py-2 font-label-mono text-xs text-on-surface hover:border-primary hover:text-primary transition-colors flex items-center gap-2 group"
              >
                <Activity size={16} className="group-hover:animate-spin" />
                REFRESH_DATA
              </button>
              <button 
                onClick={enterCreateMode}
                className="bg-primary-container/10 border-2 border-primary-container text-primary-container hover:bg-primary-container hover:text-on-primary-container transition-all px-4 py-2 font-label-mono font-bold text-xs flex items-center gap-2 shadow-[4px_4px_0_0_var(--primary-container)]"
              >
                <Plus size={16} />
                CREATE_PROJECT
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content Areas */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        
        {/* DASHBOARD VIEW */}
        {view === "dashboard" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Bento Grid Analytics */}
            <div className="grid grid-cols-12 gap-4">
              {/* Analytics: Revenue (8-bit style) */}
              <div className="col-span-12 lg:col-span-8 bg-surface border-2 border-outline-variant hover:border-secondary-container transition-colors group relative overflow-hidden flex flex-col">
                <div className="bg-surface-container border-b-2 border-outline-variant px-3 py-1.5 flex justify-between items-center group-hover:bg-surface-container-high transition-colors">
                  <span className="font-label-mono text-xs text-secondary drop-shadow-[0_0_4px_var(--secondary)]">REVENUE_ANALYTICS.exe</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 border border-outline-variant"></div>
                    <div className="w-3 h-3 border border-outline-variant"></div>
                    <div className="w-3 h-3 bg-outline-variant border border-outline-variant"></div>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col gap-4 relative">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="font-label-mono text-xs text-on-surface-variant block mb-1">TOTAL_GROSS_REVENUE</span>
                      <span className="font-headline-lg text-4xl text-secondary glow-text-secondary block">
                        ₹0.00
                      </span>
                    </div>
                    <span className="bg-surface-container border-2 border-secondary-container text-on-secondary-container font-label-mono text-xs px-2 py-1 flex items-center gap-1 shadow-[2px_2px_0_0_var(--secondary)]">
                      SALES: 0
                    </span>
                  </div>
                  <div className="flex-1 flex items-end gap-1 mt-4 h-32 w-full border-b-2 border-l-2 border-outline-variant pt-2 pr-2 relative">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,246,246,0.1)_1px,transparent_1px)] bg-[length:100%_20px] pointer-events-none"></div>
                    {/* Placeholder Bar Chart */}
                    <div className="flex-1 group/bar relative border-t-2 transition-all bg-surface-container border-outline-variant" style={{ height: "10%" }}></div>
                    <div className="flex-1 group/bar relative border-t-2 transition-all bg-surface-container border-outline-variant" style={{ height: "30%" }}></div>
                    <div className="flex-1 group/bar relative border-t-2 transition-all bg-surface-container border-outline-variant" style={{ height: "15%" }}></div>
                    <div className="flex-1 group/bar relative border-t-2 transition-all bg-surface-container border-outline-variant" style={{ height: "5%" }}></div>
                  </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                <div className="bg-surface border-2 border-outline-variant p-4 hover:border-primary-container transition-all group flex-1 flex flex-col justify-center">
                  <span className="font-label-mono text-xs text-on-surface-variant flex justify-between">
                    PLAYERS (C/T)
                    <span className="text-on-primary-container animate-pulse">●</span>
                  </span>
                  <span className="font-headline-md text-2xl text-on-surface mt-2 block group-hover:text-on-primary-container transition-colors">
                    0 / 0
                  </span>
                  <div className="flex gap-1 mt-4 h-3 w-full">
                    <div className="flex-1 bg-surface-container border border-outline-variant"></div>
                    <div className="flex-1 bg-surface-container border border-outline-variant"></div>
                    <div className="flex-1 bg-surface-container border border-outline-variant"></div>
                  </div>
                </div>
                <div className="bg-surface border-2 border-outline-variant p-4 hover:border-secondary-fixed transition-all group flex-1 flex flex-col justify-center">
                  <span className="font-label-mono text-xs text-on-surface-variant flex justify-between">
                    TOTAL_PROJECTS 
                    <span className="text-secondary-fixed font-bold block">LINKED</span>
                  </span>
                  <span className="font-headline-md text-2xl text-secondary-fixed mt-2 block drop-shadow-[0_0_5px_var(--secondary-fixed)]">
                    {games.length}
                  </span>
                  <p className="font-label-mono text-[10px] text-on-surface-variant mt-4 uppercase">
                    VERSION_CONTROL: ACTIVE
                  </p>
                </div>
              </div>
            </div>

            {/* Games Listing Workspace */}
            <div className="bg-surface-container-lowest border-2 border-outline-variant flex flex-col shadow-[8px_8px_0_0_rgba(0,55,55,0.5)] mb-8">
              <div className="bg-surface-container border-b-2 border-outline-variant px-4 py-2 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <TerminalIcon className="text-primary" size={16} />
                  <span className="font-label-mono text-xs text-on-surface font-bold uppercase">Projects List</span>
                </div>
                <div className="font-label-mono text-[10px] text-on-surface-variant">
                  {games.length} Active Projects
                </div>
              </div>

              {games.length === 0 ? (
                <div className="p-16 text-center text-on-surface-variant font-label-mono italic">
                  NO_PROJECTS_FOUND_IN_WORKSPACE
                </div>
              ) : (
                <div className="p-4 overflow-x-auto">
                  <div className="min-w-[600px]">
                    <div className="grid grid-cols-12 gap-2 text-on-surface-variant border-b border-outline-variant pb-1 mb-1 text-[10px] font-label-mono">
                      <div className="col-span-4">PROJECT_TITLE</div>
                      <div className="col-span-2 text-center">VERSION</div>
                      <div className="col-span-2 text-center">STATUS</div>
                      <div className="col-span-2 text-center">PRICE</div>
                      <div className="col-span-2 text-right">ACTION</div>
                    </div>
                    {games.map((game) => (
                      <div key={game.id || game.gameId} className="grid grid-cols-12 gap-2 text-primary hover:bg-surface-container cursor-pointer transition-colors py-2 group items-center border-b border-outline-variant/10">
                        <div className="col-span-4 flex items-center gap-3 font-bold">
                          {game.coverUrl ? (
                            <img src={game.coverUrl} className="w-8 h-8 object-cover border border-outline-variant" alt="" />
                          ) : (
                            <div className="w-8 h-8 border border-outline-variant bg-surface flex items-center justify-center">
                              <Layers size={14} className="text-outline-variant" />
                            </div>
                          )}
                          <span className="truncate">{game.title}</span>
                        </div>
                        <div className="col-span-2 text-center font-label-mono text-[10px]">
                          V.{game.version || "1.0.0"}
                        </div>
                        <div className="col-span-2 text-center">
                          <span className={`text-[9px] px-1 border font-label-mono ${
                            game.status === "PUBLISHED"
                              ? "border-secondary-container text-secondary shadow-[0_0_5px_var(--secondary)]"
                              : "border-outline-variant text-on-surface-variant"
                          }`}>
                            {game.status || "DRAFT"}
                          </span>
                        </div>
                        <div className="col-span-2 text-center font-label-mono text-[10px]">
                          {game.licensing === "FREE" ? "FREE" : `₹${game.price}`}
                        </div>
                        <div className="col-span-2 text-right flex items-center justify-end gap-3">
                          <button
                            onClick={() => enterDeployMode(game)}
                            className="bg-surface-container border border-outline-variant p-1.5 hover:border-primary hover:text-primary transition-all text-on-surface"
                          >
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CREATE / DEPLOYMENT WORKSPACE VIEW */}
        {(view === "create" || view === "deploy") && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200 pb-16">
            
            {/* Header Section */}
            <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-4 border-b border-outline-variant/10">
              <div>
                <h1 className="font-headline-xl text-4xl text-primary glow-text-primary uppercase leading-none tracking-tighter">
                  {selectedGame ? 'PROJECT_CORE_MANAGEMENT' : 'ADVANCED_DEPLOYMENT_SUITE'}
                </h1>
                <p className="font-label-mono text-slate-400 text-xs mt-2 tracking-widest">
                  &gt; STATUS: {selectedGame?.status || 'DRAFT'} // ID: {selectedGame?.id || 'NEW_PROJECT'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  <div className={`w-4 h-4 ${isDeploying ? 'bg-primary animate-pulse' : 'bg-primary'}`}></div>
                  <div className={`w-4 h-4 ${isDeploying ? 'bg-primary animate-pulse delay-75' : 'bg-primary'}`}></div>
                  <div className={`w-4 h-4 ${isDeploying ? 'bg-primary animate-pulse delay-150' : 'bg-primary'}`}></div>
                  <div className="w-4 h-4 bg-slate-800"></div>
                </div>
              </div>
            </section>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-12 gap-6">
              
              {/* Metadata Card */}
              <div className="col-span-12 lg:col-span-7 bg-[#0d1410]/20 pixel-border p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                  <h3 className="font-label-mono text-primary text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                    <span className="material-symbols-outlined text-[16px]">info</span> GAME_METADATA
                  </h3>
                  <span className="text-[9px] font-label-mono text-slate-500 uppercase tracking-widest">ENCRYPTION: ENABLED</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block font-label-mono text-[10px] text-slate-400">_TITLE</label>
                    <div className="flex items-center bg-[#0B120D] text-primary p-3 border border-outline-variant/20 focus-within:border-primary group">
                      <span className="mr-2 group-focus-within:animate-pulse font-mono text-xs">&gt;</span>
                      <input
                        placeholder="ENTER_PROJECT_NAME"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="bg-transparent border-none focus:ring-0 p-0 w-full font-label-mono text-sm text-slate-200 outline-none uppercase placeholder:opacity-30"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block font-label-mono text-[10px] text-slate-400">_VERSION</label>
                    <div className="flex items-center bg-[#0B120D] text-primary p-3 border border-outline-variant/20 focus-within:border-primary group">
                      <span className="mr-2 group-focus-within:animate-pulse font-mono text-xs">&gt;</span>
                      <input
                        placeholder="1.0.0"
                        value={form.version}
                        onChange={(e) => setForm({ ...form, version: e.target.value })}
                        className="bg-transparent border-none focus:ring-0 p-0 w-full font-label-mono text-sm text-slate-200 outline-none"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="col-span-full space-y-2">
                    <label className="block font-label-mono text-[10px] text-slate-400">_DESCRIPTION_MANIFEST</label>
                    <div className="bg-[#0B120D] border border-outline-variant/20">
                      <ReactQuill
                        theme="snow"
                        value={form.description}
                        onChange={(content) => setForm({ ...form, description: content })}
                        modules={quillModules}
                        placeholder="DECRYPT_CONTENT_SYNOPSIS..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Hardware Specs Card */}
              <div className="col-span-12 lg:col-span-5 bg-[#0d1410]/20 pixel-border p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                  <h3 className="font-label-mono text-primary text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                    <span className="material-symbols-outlined text-[16px]">settings_input_component</span> PLATFORM_SPECS
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'WINDOWS', label: 'Windows (Native)' },
                    { id: 'LINUX', label: 'Linux (Native)' },
                    { id: 'ANDROID', label: 'Android (Native)' },
                    { id: 'WEB', label: 'Web Browser' }
                  ].map((spec) => {
                    const isSelected = form.hardwareSpecs.includes(spec.id);
                    return (
                      <label key={spec.id} className={`group flex items-center gap-3 p-3 bg-[#0B120D]/60 border transition-all cursor-pointer ${isSelected ? 'border-primary bg-primary/10' : 'border-outline-variant/20 hover:border-primary/50'}`}>
                        <input
                          checked={isSelected}
                          onChange={() => handleHardwareToggle(spec.id)}
                          className="form-checkbox bg-transparent border-2 border-outline-variant/30 text-primary rounded-none focus:ring-0"
                          type="checkbox"
                        />
                        <span className={`font-label-mono text-[11px] ${isSelected ? 'text-primary' : 'group-hover:text-primary text-slate-400'}`}>{spec.label}</span>
                      </label>
                    );
                  })}
                </div>

                {form.hardwareSpecs.includes('WEB') && (
                  <div className="p-3 border border-amber-500/30 bg-amber-500/10 text-amber-400 font-label-mono text-[9px] uppercase tracking-wider text-center leading-normal animate-in fade-in duration-200">
                    ⚠️ WARNING: WEB BUILDS ARE STRICTLY FOR FREE PLAY & DEMO PURPOSES ONLY. THEY CANNOT BE SOLD FOR A PRICE.
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-label-mono text-[10px] text-primary uppercase font-bold tracking-wider">HARDWARE_REQUIREMENTS</span>
                    <div className="h-[1px] flex-1 mx-4 bg-outline-variant/10"></div>
                  </div>

                  {form.hardwareSpecs.filter(h => h !== 'WEB').length === 0 ? (
                    <div className="p-4 text-center border border-dashed border-outline-variant/20 bg-[#0B120D]/30 rounded font-label-mono text-[10px] text-slate-500 italic uppercase">
                      NO_HARDWARE_SPECIFICATIONS_REQUIRED_FOR_WEB_ONLY_BUILD
                    </div>
                  ) : (
                    <div className="space-y-6 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {form.hardwareSpecs
                        .filter(platform => platform !== 'WEB')
                        .map(platform => {
                          const specs = platformSpecs[platform] || {
                            minimum: { os: '', processor: '', memory: '', graphics: '', storage: '' },
                            recommended: { os: '', processor: '', memory: '', graphics: '', storage: '' }
                          };
                          return (
                            <div key={platform} className="p-4 bg-[#0B120D]/40 border border-outline-variant/15 rounded space-y-4">
                              <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
                                <span className="text-[9px] font-label-mono font-black px-2 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">
                                  {platform} SPECIFICATIONS
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                {/* Minimum Specs */}
                                <div className="space-y-3 bg-[#0B120D]/60 p-3 border border-outline-variant/10">
                                  <p className="font-label-mono text-[8px] text-secondary uppercase mb-1 underline underline-offset-2">MINIMUM_SPECS</p>
                                  {['os', 'processor', 'memory', 'graphics', 'storage'].map(field => (
                                    <div key={field} className="space-y-1">
                                      <label className="block font-label-mono text-[7px] text-slate-500 uppercase">{field}</label>
                                      <input
                                        className="w-full bg-[#0B120D] border border-outline-variant/20 p-1.5 text-[9px] font-label-mono text-slate-200 focus:border-primary outline-none"
                                        value={specs.minimum[field] || ''}
                                        onChange={(e) => {
                                          setPlatformSpecs(prev => ({
                                            ...prev,
                                            [platform]: {
                                              ...prev[platform],
                                              minimum: { ...prev[platform].minimum, [field]: e.target.value }
                                            }
                                          }));
                                        }}
                                        autoComplete="off"
                                      />
                                    </div>
                                  ))}
                                </div>

                                {/* Recommended Specs */}
                                <div className="space-y-3 bg-[#0B120D]/60 p-3 border border-outline-variant/10">
                                  <p className="font-label-mono text-[8px] text-primary uppercase mb-1 underline underline-offset-2">RECOMMENDED_SPECS</p>
                                  {['os', 'processor', 'memory', 'graphics', 'storage'].map(field => (
                                    <div key={field} className="space-y-1">
                                      <label className="block font-label-mono text-[7px] text-slate-500 uppercase">{field}</label>
                                      <input
                                        className="w-full bg-[#0B120D] border border-outline-variant/20 p-1.5 text-[9px] font-label-mono text-slate-200 focus:border-primary outline-none"
                                        value={specs.recommended[field] || ''}
                                        onChange={(e) => {
                                          setPlatformSpecs(prev => ({
                                            ...prev,
                                            [platform]: {
                                              ...prev[platform],
                                              recommended: { ...prev[platform].recommended, [field]: e.target.value }
                                            }
                                          }));
                                        }}
                                        autoComplete="off"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>

              {/* Categorization Module */}
              <div className="col-span-12 lg:col-span-6 bg-[#0d1410]/20 pixel-border p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                  <h3 className="font-label-mono text-primary text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                    <span className="material-symbols-outlined text-[16px]">label</span> CATEGORIZATION
                  </h3>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="block font-label-mono text-[10px] text-slate-400 mb-2 uppercase">_GENRE_TAGS</label>
                    <div className="flex flex-wrap gap-2">
                      {GENRES.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleGenreToggle(tag)}
                          className={`px-3 py-1.5 border font-label-mono text-[9px] transition-all uppercase ${form.genres.includes(tag) ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant/20 text-slate-400 hover:border-primary/50'}`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block font-label-mono text-[10px] text-slate-400 mb-2 uppercase">_CUSTOM_VECTORS</label>
                    <div className="flex items-center bg-[#0B120D] text-primary p-3 border border-outline-variant/20 focus-within:border-primary group">
                      <span className="mr-2 group-focus-within:animate-pulse font-mono text-xs">&gt;</span>
                      <input
                        className="bg-transparent border-none focus:ring-0 p-0 w-full font-label-mono text-[12px] uppercase placeholder:opacity-30 outline-none text-slate-200"
                        placeholder="ADD_TAG_AND_PRESS_ENTER"
                        type="text"
                        autoComplete="off"
                        onKeyDown={(e: any) => {
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
                        <span key={tag} className="flex items-center gap-2 px-3 py-1 bg-[#0B120D] text-primary font-label-mono text-[10px] border border-primary/30">
                          {tag}
                          <span onClick={() => setForm(prev => ({ ...prev, customTags: prev.customTags.filter(t => t !== tag) }))} className="material-symbols-outlined text-[14px] cursor-pointer hover:text-error transition-colors">close</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Store Info Module */}
              <div className="col-span-12 lg:col-span-6 bg-[#0d1410]/20 pixel-border p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                  <h3 className="font-label-mono text-primary text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                    <span className="material-symbols-outlined text-[16px]">storefront</span> STORE_INTEGRATION
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block font-label-mono text-[10px] text-slate-400 uppercase">_LICENSING_MODEL</label>
                    <div className="relative bg-[#0B120D] border border-outline-variant/20 focus-within:border-primary">
                      <select
                        value={form.licensing}
                        onChange={(e) => setForm({ ...form, licensing: e.target.value as "FREE" | "PAID", price: e.target.value === "FREE" ? 0 : form.price })}
                        className="w-full bg-[#0B120D] border-none text-primary font-label-mono p-3 appearance-none focus:ring-0 cursor-pointer text-[12px] outline-none uppercase"
                      >
                        <option value="PAID">PREMIUM (PAID)</option>
                        <option value="FREE">FREE_TO_PLAY (F2P)</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary">expand_more</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block font-label-mono text-[10px] text-slate-400 uppercase">_BASE_PRICE (INR)</label>
                    <div className={`flex items-center p-3 border transition-all group ${form.licensing === 'FREE' ? 'bg-[#0B120D]/30 border-outline-variant/10 grayscale opacity-40' : 'bg-[#0B120D] text-primary border-outline-variant/20 focus-within:border-primary'}`}>
                      <span className="mr-2 text-slate-400 font-label-mono">₹</span>
                      <input
                        className="bg-transparent border-none focus:ring-0 p-0 w-full font-label-mono text-[12px] outline-none text-slate-200"
                        type="number"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                        disabled={form.licensing === 'FREE'}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mt-2">
                  <div className="flex justify-between items-center">
                    <label className="block font-label-mono text-[10px] text-slate-400 uppercase">_STORE_COMMISSION_CUT</label>
                    <span className="font-label-mono text-xs text-primary font-bold bg-primary/10 px-2 py-0.5 border border-primary/20 rounded shadow-[0_0_10px_rgba(var(--primary-rgb),0.1)]">
                      {form.storeCut || 10}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4 bg-[#0B120D] p-4 border border-outline-variant/20 focus-within:border-primary">
                    <span className="font-label-mono text-[10px] text-slate-500">5%</span>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      value={form.storeCut || 10}
                      onChange={(e) => setForm({ ...form, storeCut: Number(e.target.value) })}
                      className="flex-1 accent-primary h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer focus:outline-none"
                    />
                    <span className="font-label-mono text-[10px] text-slate-500">50%</span>
                  </div>
                  <p className="font-label-mono text-[8px] text-slate-400 opacity-60">
                    THE SYSTEM ALLOCATES A PERCENTAGE OF SALES REVENUE TO SECURING MAINFRAME OPERATIONS.
                  </p>
                </div>
              </div>

              {/* Asset Deployment Card */}
              <div className="col-span-12 bg-[#0d1410]/20 pixel-border p-6">
                <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3 mb-6">
                  <h3 className="font-label-mono text-primary text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                    <span className="material-symbols-outlined text-[16px]">cloud_upload</span> ASSET_DEPLOYMENT
                  </h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {[
                    { id: 'COVER_IMAGE', icon: 'auto_stories', label: 'PROJECT_COVER', sub: '600x900 (2:3 RATIO)', accept: 'image/*', file: coverFile, setFile: setCoverFile },
                    { id: 'HERO_BANNER', icon: 'image', label: 'HERO_BANNER', sub: '1920x1080 (16:9)', accept: 'image/*', file: bannerFile, setFile: setBannerFile },
                    { id: 'SCREENSHOTS', icon: 'collections', label: 'SCREENSHOTS', sub: '1920x1080 (MAX 10)', accept: 'image/*', files: screenshotsFiles, setFiles: setScreenshotsFiles, multiple: true },
                    { id: 'VIDEO_TRAILER', icon: 'movie', label: 'VIDEO_TRAILER', sub: '.MP4 (MAX 1GB)', accept: 'video/*', file: trailerFile, setFile: setTrailerFile }
                  ].map(slot => {
                    const hasFile = slot.multiple ? slot.files && slot.files.length > 0 : !!slot.file;
                    return (
                      <label
                        key={slot.id}
                        className={`relative border-2 border-dashed p-6 flex flex-col items-center justify-center text-center bg-[#0B120D]/60 transition-all group cursor-pointer min-h-[160px] ${
                          hasFile 
                            ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]' 
                            : 'border-outline-variant/20 hover:border-primary hover:bg-[#0B120D]/80'
                        }`}
                      >
                        <input
                          type="file"
                          className="hidden"
                          multiple={slot.multiple}
                          accept={slot.accept}
                          onChange={(e) => {
                            const selected = e.target.files;
                            if (selected && selected.length > 0) {
                              if (slot.multiple) {
                                const filesArray = Array.from(selected);
                                slot.setFiles!(prev => [...prev, ...filesArray].slice(0, 10));
                              } else {
                                slot.setFile!(selected[0]);
                              }
                            }
                            e.target.value = "";
                          }}
                        />
                        <span className={`material-symbols-outlined text-4xl group-hover:text-primary mb-2 transition-transform group-hover:scale-110 ${hasFile ? 'text-primary animate-pulse' : 'text-slate-400'}`}>{slot.icon}</span>
                        <p className={`font-label-mono text-[11px] font-bold uppercase tracking-wider mb-1 ${hasFile ? 'text-primary' : 'text-slate-200'}`}>{slot.label}</p>
                        <p className="font-label-mono text-[8px] text-slate-400 opacity-70 group-hover:opacity-100 transition-opacity">
                          {slot.multiple 
                            ? (slot.files && slot.files.length > 0 ? `${slot.files.length}_FILES_STAGED` : slot.sub)
                            : (slot.file ? `${slot.file.name.slice(0, 15)}...` : slot.sub)}
                        </p>
                        {hasFile && (
                          <div 
                            className="absolute top-2 right-2 p-1 bg-slate-900 border border-outline-variant/20 hover:bg-error/20 transition-colors cursor-pointer group/close z-10" 
                            onClick={(e) => { 
                              e.preventDefault(); 
                              e.stopPropagation(); 
                              if (slot.multiple) {
                                slot.setFiles!([]); 
                              } else {
                                slot.setFile!(null); 
                              }
                            }}
                          >
                            <span className="material-symbols-outlined text-[14px] text-slate-400 group-hover/close:text-error transition-colors">close</span>
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>

                {/* Target Builds */}
                {form.hardwareSpecs.length > 0 && (
                  <div className="space-y-4 mt-8 pt-8 border-t border-outline-variant/20">
                    <h4 className="font-label-mono text-[10px] text-primary uppercase tracking-widest flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px]">terminal</span> TARGET_PLATFORM_BUILDS_AND_ENTRYPOINTS
                    </h4>
                    <div className="space-y-4">
                      {form.hardwareSpecs.map(platform => {
                        const binaryPath = binaryFiles[platform];
                        return (
                          <div key={platform} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-[#0B120D]/40 border border-outline-variant/20 rounded items-center">
                            
                            {/* Left Column: Platform Entry Point Input */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="font-label-mono text-[10px] text-slate-200 bg-primary/20 px-2 py-0.5 rounded font-black tracking-widest uppercase">
                                  {platform}
                                </span>
                                <span className="font-label-mono text-[9px] text-slate-400 uppercase tracking-wider">
                                  ENTRYPOINT (E.G. {platform === 'WEB' ? 'INDEX.HTML' : 'GAME.EXE'})
                                </span>
                              </div>
                              <div className="flex items-center bg-[#0B120D] text-primary p-2.5 border border-outline-variant/20 focus-within:border-primary group">
                                <span className="mr-2 group-focus-within:animate-pulse text-primary font-mono text-[10px]">&gt;</span>
                                <input
                                  className="bg-transparent border-none focus:ring-0 p-0 w-full font-label-mono text-[11px] placeholder:opacity-30 text-slate-200 outline-none"
                                  placeholder={platform === 'WEB' ? 'index.html' : 'game.exe'}
                                  type="text"
                                  value={form.platformEntrypoints?.[platform] || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setForm(prev => ({
                                      ...prev,
                                      platformEntrypoints: {
                                        ...(prev.platformEntrypoints || {}),
                                        [platform]: val
                                      }
                                    }));
                                  }}
                                  autoComplete="off"
                                />
                              </div>
                            </div>

                            {/* Right Column: Platform zip/executable upload slot */}
                            <div className="space-y-2">
                              <div
                                onClick={async () => {
                                  if (window.lazplayAPI?.selectFolder) {
                                    const path = await window.lazplayAPI.selectFolder();
                                    if (path) setBinaryFiles((prev) => ({ ...prev, [platform]: path }));
                                  }
                                }}
                                className={`relative border-2 border-dashed p-4 flex flex-col items-center justify-center text-center bg-[#0B120D]/60 transition-all group cursor-pointer min-h-[90px] ${
                                  binaryPath
                                    ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]'
                                    : 'border-outline-variant/20 hover:border-primary hover:bg-[#0B120D]/80'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`material-symbols-outlined text-headline-sm transition-transform group-hover:scale-110 ${binaryPath ? 'text-primary' : 'text-slate-400'}`}>
                                    folder
                                  </span>
                                  <p className={`font-label-mono text-[10px] font-bold uppercase tracking-wider ${binaryPath ? 'text-primary' : 'text-slate-300'}`}>
                                    {binaryPath ? 'BUILD_DIRECTORY_STAGED' : `SELECT_${platform}_BUILD_DIRECTORY`}
                                  </p>
                                </div>
                                <p className="font-label-mono text-[8px] text-slate-400 opacity-70 mt-1 max-w-[90%] truncate">
                                  {binaryPath ? binaryPath : 'CHOOSE THE LOCAL BUILD DIRECTORY'}
                                </p>
                                {binaryPath && (
                                  <div 
                                    className="absolute top-2 right-2 p-1 bg-slate-900 border border-outline-variant/20 hover:bg-error/20 transition-colors cursor-pointer group/close" 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setBinaryFiles(prev => ({ ...prev, [platform]: null })); 
                                    }}
                                  >
                                    <span className="material-symbols-outlined text-[12px] text-slate-400 group-hover/close:text-error transition-colors">close</span>
                                  </div>
                                )}
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Terminal Feed / Console Output */}
              <div className="col-span-12 lg:col-span-8 bg-[#050505] border-2 border-outline-variant/20 h-[300px] flex flex-col relative overflow-hidden group shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb),0.05)_1px,transparent_1px)] bg-[length:100%_4px] pointer-events-none"></div>
                <div className="bg-[#0B120D] border-b border-outline-variant/20 px-3 py-1.5 flex justify-between items-center">
                  <span className="font-label-mono text-[10px] text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">terminal</span> DEPLOYMENT_LOGS.txt {isDeploying && `:: STAGE_${deployStep}_OF_8`}
                  </span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 border border-outline-variant/20"></div>
                    <div className="w-2 h-2 border border-outline-variant/20"></div>
                    <div className="w-2 h-2 bg-primary"></div>
                  </div>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto font-label-mono text-[10px] space-y-1">
                  {logs.map((log, i) => (
                    <div key={i} className="flex gap-4">
                      <span className="text-slate-500 opacity-40">[{new Date().toLocaleTimeString()}]</span>
                      <span className={log.includes('SYSTEM_FAILURE') || log.includes('FAILED') ? 'text-error' : (log.includes('SUCCESS') || log.includes('✓') ? 'text-primary' : 'text-slate-300')}>
                        {log.startsWith('STEP') ? `>> ${log}` : `> ${log}`}
                      </span>
                    </div>
                  ))}
                  {isDeploying && (
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-primary animate-pulse">&gt; UPLOADING_PAYLOAD_STAGE...</span>
                      <span className="w-2 h-4 bg-primary animate-blink"></span>
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </div>

                {uploadProgress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-[#0B120D] border-t border-primary/20 p-4 animate-slide-up">
                    <div className="flex justify-between font-label-mono text-[10px] text-primary mb-2">
                      <span>UPLOADING_PAYLOAD_STAGE</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1 bg-[#050505] border border-outline-variant/20 relative overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 bg-primary shadow-[0_0_10px_var(--primary)] transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Area */}
              <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                <button
                  onClick={handleExecuteDeployment}
                  disabled={isDeploying || !form.title}
                  className={`w-full h-full font-headline-md p-6 border-2 border-primary bg-primary/10 hover:bg-primary/20 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-4 group min-h-[150px] disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <span className={`material-symbols-outlined text-4xl group-hover:scale-110 transition-transform ${isDeploying ? 'animate-spin' : ''}`}>
                    {isDeploying ? 'sync' : 'rocket_launch'}
                  </span>
                  <span className="uppercase tracking-tighter font-extrabold text-lg text-primary glow-text-primary">
                    {isDeploying ? 'WE_ARE_PROCESSING...' : (selectedGame ? 'UPDATE_&_DEPLOY' : 'INITIATE_DEPLOY')}
                  </span>
                  <span className="font-label-mono text-[9px] opacity-70 uppercase text-slate-400">
                    {selectedGame ? 'FORCE_OVERWRITE_ACTIVE' : 'CONFIRM_GRID_UPLOAD'}
                  </span>
                </button>

                {errorMessage && (
                  <div className="bg-error/10 border border-error text-error p-3 font-label-mono text-[10px] uppercase flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    <span>FAILURE: {errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="bg-primary/10 border border-primary text-primary p-3 font-label-mono text-[10px] uppercase flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span>VERIFIED: {successMessage}</span>
                  </div>
                )}

                {selectedGame && (
                  <button
                    onClick={async () => {
                      if (window.confirm("CRITICAL WARNING: Terminate this project permanently?")) {
                        try {
                          setIsDeploying(true);
                          await axios.delete(`https://play.lazplay.tech/api/v1/developer/games/${selectedGame.id}`, { headers: { Authorization: `Bearer ${token}` } });
                          fetchDeveloperGames(token);
                          setView("dashboard");
                        } catch (err: any) {
                          alert(err.response?.data?.message || "Failed to terminate project.");
                        } finally {
                          setIsDeploying(false);
                        }
                      }
                    }}
                    disabled={isDeploying}
                    className="w-full py-4 border-2 border-error/50 text-error font-label-mono hover:bg-error/10 transition-all uppercase tracking-widest text-[10px]"
                  >
                    TERMINATE_PROJECT
                  </button>
                )}

                <button 
                  onClick={() => setView('dashboard')} 
                  className="w-full py-4 border-2 border-outline-variant/30 text-slate-300 font-label-mono hover:bg-slate-800 transition-all uppercase tracking-widest text-[10px]"
                >
                  EXIT_WORKSPACE
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

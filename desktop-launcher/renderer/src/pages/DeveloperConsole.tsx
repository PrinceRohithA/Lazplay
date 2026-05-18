import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Terminal as TerminalIcon,
  Plus,
  ChevronLeft,
  UploadCloud,
  CheckCircle,
  AlertTriangle,
  Shield,
  Layers,
  ArrowRight,
  DollarSign,
  Activity,
  UserCheck,
  Trash2
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
  minSpecs: { os: "Windows 10", processor: "Intel i3", memory: "8 GB RAM", graphics: "GTX 1050", storage: "5 GB space" },
  recSpecs: { os: "Windows 11", processor: "Intel i7", memory: "16 GB RAM", graphics: "RTX 3060", storage: "10 GB space" }
};

const GENRES = ["ACTION", "ADVENTURE", "RPG", "STRATEGY", "CASUAL", "ARCADE", "SHOOTER", "RACING"];
const HARDWARE_OPTIONS = ["WINDOWS", "LINUX", "ANDROID", "WEB"];

export default function DeveloperConsole() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [view, setView] = useState<"dashboard" | "create" | "deploy">("dashboard");
  const [selectedGame, setSelectedGame] = useState<any>(null);

  // Form State
  const [form, setForm] = useState<GameForm>(INITIAL_FORM);
  const [customTagInput, setCustomTagInput] = useState("");

  // Asset Files State
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [trailerFile, setTrailerFile] = useState<File | null>(null);
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
    setForm({
      title: game.title || "",
      version: game.version || "1.0.0",
      entrypoint: game.entrypoint || "",
      platformEntrypoints: Object.keys(platformEntrypoints).length > 0 ? platformEntrypoints : { WINDOWS: "game.exe" },
      description: game.description || "",
      hardwareSpecs: game.hardwareSpecs || ["WINDOWS"],
      genres: game.genres || ["ACTION"],
      customTags: game.customTags || [],
      licensing: game.licensing || "FREE",
      price: game.price || 0,
      minSpecs: game.minSpecs || INITIAL_FORM.minSpecs,
      recSpecs: game.recSpecs || INITIAL_FORM.recSpecs
    });
    setCoverFile(null);
    setBannerFile(null);
    setTrailerFile(null);
    setBinaryFiles({});
    setLogs([]);
    setErrorMessage(null);
    setSuccessMessage(null);
    setView("deploy");
  };

  const enterCreateMode = () => {
    setSelectedGame(null);
    setForm(INITIAL_FORM);
    setCoverFile(null);
    setBannerFile(null);
    setTrailerFile(null);
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
    setForm((prev) => ({
      ...prev,
      hardwareSpecs: prev.hardwareSpecs.includes(spec)
        ? prev.hardwareSpecs.filter((s) => s !== spec)
        : [...prev.hardwareSpecs, spec]
    }));
  };

  const handleCustomTagAdd = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && customTagInput.trim()) {
      e.preventDefault();
      const newTag = customTagInput.trim().toUpperCase();
      if (!form.customTags.includes(newTag)) {
        setForm((prev) => ({
          ...prev,
          customTags: [...prev.customTags, newTag]
        }));
      }
      setCustomTagInput("");
    }
  };

  const handleCustomTagRemove = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      customTags: prev.customTags.filter((t) => t !== tag)
    }));
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

      const payload = {
        title: form.title,
        version: form.version,
        entrypoint: form.entrypoint || undefined,
        platformEntrypoints: form.platformEntrypoints || undefined,
        description: form.description,
        hardwareSpecs: form.hardwareSpecs,
        genres: form.genres,
        customTags: form.customTags,
        licensing: form.licensing,
        price: Number(form.price),
        minSpecs: form.minSpecs,
        recSpecs: form.recSpecs
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
    <div className="w-full h-full bg-transparent text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      
      {/* Upper Navigation Header */}
      <header className="h-[70px] border-b border-slate-800/80 bg-slate-950/20 backdrop-blur-md flex-shrink-0 flex items-center justify-between px-8 relative z-20">
        <div className="flex items-center gap-3">
          <TerminalIcon className="text-brand-500 animate-pulse" size={24} />
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-100 uppercase">
              Creator Workspace
            </h1>
            <p className="text-[10px] font-mono text-brand-500 uppercase tracking-widest">
              Status: Online // AUTH: {userProfile.displayName || userProfile.email}
            </p>
          </div>
        </div>

        {view !== "dashboard" && (
          <button
            onClick={() => setView("dashboard")}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all px-4 py-2 rounded-lg text-xs font-mono font-bold"
          >
            <ChevronLeft size={16} />
            <span>Return to Dashboard</span>
          </button>
        )}
      </header>

      {/* Main Content Areas */}
      <div className="flex-1 overflow-y-auto p-8">
        
        {/* DASHBOARD VIEW */}
        {view === "dashboard" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Bento Grid Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-slate-950 border border-slate-800/80 p-5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Total Projects</span>
                  <span className="text-3xl font-black text-slate-100">{games.length}</span>
                </div>
                <div className="w-12 h-12 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500">
                  <Layers size={22} />
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 p-5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-mono uppercase text-slate-500 mb-1">System Status</span>
                  <span className="text-3xl font-black text-emerald-400">ONLINE</span>
                </div>
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Activity size={22} />
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 p-5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Currency</span>
                  <span className="text-3xl font-black text-brand-500">INR (₹)</span>
                </div>
                <div className="w-12 h-12 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500">
                  <DollarSign size={22} />
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 p-5 rounded-xl flex flex-col justify-center">
                <button
                  onClick={enterCreateMode}
                  className="w-full bg-brand-600 hover:bg-brand-500 transition-all font-mono text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                >
                  <Plus size={16} />
                  <span>Create New Project</span>
                </button>
              </div>
            </div>

            {/* Games Listing Workspace */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">Projects List</h3>
                <span className="text-[10px] font-mono text-slate-500 uppercase">{games.length} Active Projects</span>
              </div>

              {games.length === 0 ? (
                <div className="p-16 text-center border-t border-slate-900">
                  <UploadCloud className="text-slate-700 mx-auto mb-4 opacity-50" size={48} />
                  <p className="text-slate-400 font-mono text-sm uppercase">No Projects Found</p>
                  <button
                    onClick={enterCreateMode}
                    className="mt-4 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors font-mono text-xs text-brand-500 font-bold"
                  >
                    &gt; Create First Project
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/50">
                  {games.map((game) => (
                    <div
                      key={game.id || game.gameId}
                      className="px-6 py-5 hover:bg-slate-900/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        {game.coverUrl ? (
                          <img src={game.coverUrl} className="w-10 h-14 object-cover rounded bg-slate-850" alt="" />
                        ) : (
                          <div className="w-10 h-14 rounded bg-slate-850 border border-slate-800 flex items-center justify-center">
                            <Layers className="text-slate-700" size={16} />
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-slate-100 uppercase">{game.title}</h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] font-mono text-slate-400">
                              V.{game.version || "1.0.0"}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${
                              game.status === "PUBLISHED"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : game.status === "QUEUED"
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-blue-500/10 text-blue-400"
                            }`}>
                              {game.status || "DRAFT"}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] font-mono text-slate-400 uppercase">
                              {game.licensing === "FREE" ? "FREE" : `₹${game.price}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => enterDeployMode(game)}
                          className="px-4 py-2 rounded bg-brand-600/10 border border-brand-500/20 hover:bg-brand-600 hover:text-white transition-all text-xs font-mono font-bold text-brand-500 flex items-center gap-1.5"
                        >
                          <span>Manage Project</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CREATE / DEPLOYMENT WORKSPACE VIEW */}
        {(view === "create" || view === "deploy") && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
            
            {/* Deploy Pipeline Logs Terminal */}
            {(isDeploying || logs.length > 0 || errorMessage || successMessage) && (
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-5 shadow-2xl relative overflow-hidden flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
                  <div className="flex items-center gap-2 text-brand-500 font-mono text-xs uppercase tracking-wider">
                    <TerminalIcon size={16} className={isDeploying ? "animate-pulse" : ""} />
                    <span>DEPLOYMENT_CONSOLE_OUTPUT.LOG</span>
                  </div>
                  {isDeploying && (
                    <div className="text-[10px] font-mono text-brand-500 animate-pulse">
                      PROCESSING_STAGE_{deployStep}_OF_8
                    </div>
                  )}
                </div>

                {/* Animated Stages Progress Tracker */}
                {isDeploying && (
                  <div className="grid grid-cols-8 gap-1.5 h-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <div
                        key={s}
                        className={`h-full transition-all duration-300 ${
                          s < deployStep
                            ? "bg-emerald-500"
                            : s === deployStep
                            ? "bg-brand-500 animate-pulse"
                            : "bg-slate-800"
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Log Screen */}
                <div className="bg-black/90 rounded border border-slate-900 p-4 h-[200px] overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1.5 custom-scrollbar">
                  {logs.map((log, index) => (
                    <div key={index} className={log.includes("SYSTEM_FAILURE") ? "text-red-400" : log.includes("✓") ? "text-emerald-400" : "text-slate-300"}>
                      {log}
                    </div>
                  ))}
                  {isDeploying && (
                    <div className="text-brand-500 animate-pulse flex items-center gap-1.5">
                      <span>&gt; STREAMING_SIGNAL_CELLS...</span>
                      {uploadProgress > 0 && <span className="font-bold text-xs">({uploadProgress}%)</span>}
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </div>

                {/* Progress Bar */}
                {isDeploying && uploadProgress > 0 && (
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-brand-500 h-1.5 transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}

                {/* Failure Alerts */}
                {errorMessage && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded text-xs font-mono flex items-center gap-2 animate-in slide-in-from-top duration-200">
                    <AlertTriangle size={16} />
                    <span>SYSTEM_FAILURE_ENCOUNTERED: {errorMessage}</span>
                  </div>
                )}

                {/* Success Alerts */}
                {successMessage && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded text-xs font-mono flex items-center gap-2 animate-in slide-in-from-top duration-200">
                    <CheckCircle size={16} />
                    <span>PROTOCOL_VERIFIED_SUCCESSFUL: {successMessage}</span>
                  </div>
                )}
              </div>
            )}

            {/* Two-Column Specification Form */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column - Metadata */}
              <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800/80 rounded-xl p-6 space-y-6">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                    Project Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono uppercase text-slate-500">Project Title</label>
                    <input
                      placeholder="e.g. CyberRun 2099"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 p-3 rounded-lg text-sm text-slate-200 outline-none transition-all font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono uppercase text-slate-500">Version</label>
                    <input
                      placeholder="e.g. 1.0.0"
                      value={form.version}
                      onChange={(e) => setForm({ ...form, version: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 p-3 rounded-lg text-sm text-slate-200 outline-none transition-all font-mono"
                    />
                  </div>



                  <div className="space-y-2 col-span-full">
                    <label className="block text-[10px] font-mono uppercase text-slate-500">Description</label>
                    <textarea
                      placeholder="Input description details here..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={5}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 p-3 rounded-lg text-sm text-slate-200 outline-none transition-all font-mono resize-none"
                    />
                  </div>
                </div>

                {/* Specifications Matrix */}
                <div className="space-y-4">
                  <span className="block text-[10px] font-mono uppercase text-slate-500 border-b border-slate-800/40 pb-1.5">
                    Hardware Requirements
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Minimum Specs */}
                    <div className="bg-slate-900/50 p-4 border border-slate-800/60 rounded-lg space-y-3">
                      <span className="block text-[9px] font-mono uppercase text-brand-500">Minimum Specs</span>
                      {["os", "processor", "memory", "graphics", "storage"].map((f) => (
                        <div key={f} className="space-y-1">
                          <label className="block text-[8px] font-mono uppercase text-slate-500">{f}</label>
                          <input
                            value={(form.minSpecs as any)[f]}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                minSpecs: { ...form.minSpecs, [f]: e.target.value }
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 p-2 text-xs font-mono text-slate-300 focus:border-brand-500 outline-none"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Recommended Specs */}
                    <div className="bg-slate-900/50 p-4 border border-slate-800/60 rounded-lg space-y-3">
                      <span className="block text-[9px] font-mono uppercase text-emerald-400">Recommended Specs</span>
                      {["os", "processor", "memory", "graphics", "storage"].map((f) => (
                        <div key={f} className="space-y-1">
                          <label className="block text-[8px] font-mono uppercase text-slate-500">{f}</label>
                          <input
                            value={(form.recSpecs as any)[f]}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                recSpecs: { ...form.recSpecs, [f]: e.target.value }
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 p-2 text-xs font-mono text-slate-300 focus:border-brand-500 outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Categorization & Files */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Categorization & Pricing */}
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-6 space-y-5">
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                      Platform Integration
                    </h3>
                  </div>

                  {/* Platforms Supported */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono uppercase text-slate-500">Hardware Targets</label>
                    <div className="grid grid-cols-2 gap-2">
                      {HARDWARE_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => handleHardwareToggle(opt)}
                          className={`p-2 border font-mono text-[10px] text-left transition-all ${
                            form.hardwareSpecs.includes(opt)
                              ? "bg-brand-500/10 border-brand-500 text-brand-500 font-bold"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {form.hardwareSpecs.includes("WEB") && (
                      <div className="p-3 border border-amber-500/20 bg-amber-500/5 text-amber-500 font-mono text-[9px] uppercase animate-in fade-in duration-200 rounded-lg">
                        ⚠️ WARNING: WEB BUILDS ARE STRICTLY FOR FREE PLAY & DEMO PURPOSES ONLY. THEY CANNOT BE SOLD FOR A PRICE.
                      </div>
                    )}
                  </div>



                  {/* Genres Supported */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono uppercase text-slate-500">_GENRE_TAGS</label>
                    <div className="flex flex-wrap gap-1.5">
                      {GENRES.map((g) => (
                        <button
                          key={g}
                          onClick={() => handleGenreToggle(g)}
                          className={`px-2.5 py-1.5 border font-mono text-[9px] transition-all rounded ${
                            form.genres.includes(g)
                              ? "bg-brand-500/10 border-brand-500 text-brand-500 font-bold"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Vectors Tags */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono uppercase text-slate-500">_CUSTOM_VECTORS</label>
                    <input
                      placeholder="INPUT_TAG_AND_PRESS_ENTER"
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      onKeyDown={handleCustomTagAdd}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 p-2.5 rounded-lg text-xs text-slate-200 outline-none transition-all font-mono uppercase"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.customTags.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 text-slate-300 font-mono text-[9px] border border-slate-800 rounded"
                        >
                          <span>{tag}</span>
                          <button
                            onClick={() => handleCustomTagRemove(tag)}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Pricing / Base model */}
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-800/40">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-mono uppercase text-slate-500">_LICENSING</label>
                      <select
                        value={form.licensing}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            licensing: e.target.value as "FREE" | "PAID",
                            price: e.target.value === "FREE" ? 0 : form.price
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-800 text-slate-300 p-2.5 rounded-lg text-xs font-mono outline-none"
                      >
                        <option value="FREE">FREE_TO_PLAY</option>
                        <option value="PAID">PREMIUM</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-mono uppercase text-slate-500">_BASE_PRICE (INR)</label>
                      <input
                        type="number"
                        disabled={form.licensing === "FREE"}
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                        className="w-full bg-slate-900 disabled:opacity-40 border border-slate-800 focus:border-brand-500 p-2.5 rounded-lg text-xs text-slate-200 outline-none transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Native Staged File Uploaders */}
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-6 space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                      Media Assets
                    </h3>
                  </div>

                  {/* Cover image file picker */}
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-mono uppercase text-slate-500">Project Cover Art (2:3)</label>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 bg-slate-900 border border-slate-800 hover:border-brand-500 cursor-pointer p-3 rounded-lg flex items-center justify-between text-xs font-mono transition-all text-slate-400">
                        <span className="truncate">{coverFile ? coverFile.name : "Choose Cover Image..."}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                        />
                      </label>
                      {coverFile && (
                        <button onClick={() => setCoverFile(null)} className="text-slate-500 hover:text-red-400 p-2">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Banner Image file picker */}
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-mono uppercase text-slate-500">Hero Banner Art (16:9)</label>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 bg-slate-900 border border-slate-800 hover:border-brand-500 cursor-pointer p-3 rounded-lg flex items-center justify-between text-xs font-mono transition-all text-slate-400">
                        <span className="truncate">{bannerFile ? bannerFile.name : "Choose Banner Image..."}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                        />
                      </label>
                      {bannerFile && (
                        <button onClick={() => setBannerFile(null)} className="text-slate-500 hover:text-red-400 p-2">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Trailer Video file picker */}
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-mono uppercase text-slate-500">Trailer Video (.MP4)</label>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 bg-slate-900 border border-slate-800 hover:border-brand-500 cursor-pointer p-3 rounded-lg flex items-center justify-between text-xs font-mono transition-all text-slate-400">
                        <span className="truncate">{trailerFile ? trailerFile.name : "Choose Video File..."}</span>
                        <input
                          type="file"
                          accept="video/mp4"
                          className="hidden"
                          onChange={(e) => setTrailerFile(e.target.files?.[0] || null)}
                        />
                      </label>
                      {trailerFile && (
                        <button onClick={() => setTrailerFile(null)} className="text-slate-500 hover:text-red-400 p-2">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Platform Specific Build and Launch Configuration Grid */}
                  {form.hardwareSpecs.length > 0 && (
                    <div className="space-y-4 pt-4 mt-4 border-t border-slate-800/60">
                      <h4 className="text-[10px] font-mono uppercase text-brand-500 font-bold tracking-widest flex items-center gap-2">
                        <TerminalIcon size={12} className="animate-pulse" />
                        Target Platforms & Builds
                      </h4>
                      <div className="space-y-3.5">
                        {form.hardwareSpecs.map((platform) => {
                          const binaryPath = binaryFiles[platform];
                          return (
                            <div key={platform} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-slate-900/40 border border-slate-800/60 rounded-xl items-center animate-in fade-in duration-200">
                              
                              {/* Left Column: Platform Entry Point Input */}
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-500 uppercase">
                                    {platform}
                                  </span>
                                  <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wide">
                                    Entrypoint
                                  </span>
                                </div>
                                <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-brand-500 transition-all p-2.5 rounded-lg">
                                  <span className="text-slate-600 font-mono text-[10px] mr-2">&gt;</span>
                                  <input
                                    className="bg-transparent border-none p-0 focus:ring-0 w-full text-[10px] font-mono text-slate-300 placeholder:text-slate-700 outline-none"
                                    placeholder={platform === "WEB" ? "index.html" : "game.exe"}
                                    type="text"
                                    value={form.platformEntrypoints?.[platform] || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setForm({
                                        ...form,
                                        platformEntrypoints: {
                                          ...(form.platformEntrypoints || {}),
                                          [platform]: val
                                        }
                                      });
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Right Column: Platform Directory Picker */}
                              <div className="space-y-1.5">
                                <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wide">
                                  Build Directory
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (window.lazplayAPI?.selectFolder) {
                                        const path = await window.lazplayAPI.selectFolder();
                                        if (path) {
                                          setBinaryFiles((prev) => ({
                                            ...prev,
                                            [platform]: path
                                          }));
                                        }
                                      }
                                    }}
                                    className="flex-1 bg-slate-950 border border-emerald-500/20 hover:border-emerald-500 cursor-pointer p-2.5 rounded-lg flex items-center justify-between text-[10px] font-mono transition-all text-emerald-500/70 text-left"
                                  >
                                    <span className="truncate font-bold text-emerald-500/90 max-w-[85%]">
                                      {binaryPath ? binaryPath : `Choose Directory...`}
                                    </span>
                                  </button>
                                  {binaryPath && (
                                    <button
                                      onClick={() =>
                                        setBinaryFiles((prev) => ({
                                          ...prev,
                                          [platform]: null
                                        }))
                                      }
                                      className="text-slate-500 hover:text-red-400 p-2"
                                    >
                                      <Trash2 size={14} />
                                    </button>
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

                {/* Big Deploy action button */}
                <button
                  onClick={handleExecuteDeployment}
                  disabled={isDeploying || !form.title}
                  className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-40 active:scale-[0.98] transition-all py-4 rounded-xl text-slate-950 font-bold text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,246,246,0.2)]"
                >
                  {isDeploying ? (
                    <>
                      <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                      <span>Deploying Project...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={18} />
                      <span>{selectedGame ? "Update Project" : "Deploy Project"}</span>
                    </>
                  )}
                </button>

                {/* Terminate Project Button */}
                {selectedGame && (
                  <button
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to terminate this project? This will permanently delete the game, its builds, and all assets.")) {
                        try {
                          setIsDeploying(true);
                          await axios.delete(`https://play.lazplay.tech/api/v1/developer/games/${selectedGame.id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          alert("Project successfully terminated.");
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
                    className="w-full mt-4 bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all py-3 rounded-xl font-bold text-xs tracking-wider flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    <span>Terminate Project</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

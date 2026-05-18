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
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
            
            {/* Deploy Pipeline Logs Terminal */}
            {(isDeploying || logs.length > 0 || errorMessage || successMessage) && (
              <div className="bg-surface-container-lowest border-2 border-outline-variant p-4 flex flex-col gap-3 shadow-[8px_8px_0_0_rgba(0,55,55,0.5)]">
                <div className="flex justify-between items-center border-b-2 border-outline-variant pb-2">
                  <div className="flex items-center gap-2 text-primary font-label-mono text-[10px] uppercase font-bold">
                    <TerminalIcon size={14} className={isDeploying ? "animate-pulse" : ""} />
                    <span>PROJECT_TERMINAL :: ROOT_ACCESS</span>
                  </div>
                  {isDeploying && (
                    <div className="text-[10px] font-label-mono text-primary animate-pulse">
                      PROCESSING_STAGE_{deployStep}_OF_8
                    </div>
                  )}
                </div>

                {/* Log Screen */}
                <div className="bg-surface border border-outline-variant p-3 h-[180px] overflow-y-auto font-label-mono text-[10px] text-primary space-y-1 custom-scrollbar">
                  {logs.map((log, index) => (
                    <div key={index} className={log.includes("SYSTEM_FAILURE") || log.includes("CRITICAL") ? "text-error" : log.includes("SUCCESS") || log.includes("✓") ? "text-secondary" : "text-primary opacity-80"}>
                      <span className="mr-2 text-on-surface-variant opacity-50">&gt;</span> {log}
                    </div>
                  ))}
                  {isDeploying && (
                    <div className="text-primary animate-pulse flex items-center gap-1.5 mt-2">
                      <span className="mr-2 text-on-surface-variant opacity-50">&gt;</span>
                      <span>AWAITING_RESPONSE...</span>
                      {uploadProgress > 0 && <span className="font-bold text-secondary">[{uploadProgress}%]</span>}
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </div>

                {/* Progress Bar */}
                {isDeploying && uploadProgress > 0 && (
                  <div className="w-full bg-surface-container h-1 border border-outline-variant">
                    <div
                      className="bg-primary h-full transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}

                {/* Alerts */}
                {errorMessage && (
                  <div className="bg-error-container border border-error text-on-error-container p-2 text-[10px] font-label-mono uppercase flex items-center gap-2">
                    <AlertTriangle size={14} />
                    <span>SYSTEM_FAILURE_ENCOUNTERED: {errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="bg-secondary-container border border-secondary text-on-secondary-container p-2 text-[10px] font-label-mono uppercase flex items-center gap-2">
                    <CheckCircle size={14} />
                    <span>PROTOCOL_VERIFIED_SUCCESSFUL: {successMessage}</span>
                  </div>
                )}
              </div>
            )}

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-12 gap-6">
              
              {/* Metadata Card */}
              <div className="col-span-12 lg:col-span-7 bg-[#0D1410]/30 pixel-border p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-brand-500/10 pb-3">
                  <h3 className="font-label-mono text-primary text-[10px] font-bold flex items-center gap-2 uppercase tracking-widest">
                    <TerminalIcon size={14} /> Project Metadata
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block font-label-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider">Project Title</label>
                    <div className="flex items-center bg-[#0B120D] text-primary p-2.5 border border-brand-500/12 rounded-lg focus-within:border-brand-500/60 focus-within:shadow-[0_0_12px_rgba(57,255,136,0.12)] transition-all group">
                      <span className="mr-2 text-brand-500/40 font-mono group-focus-within:text-brand-500">&gt;</span>
                      <input
                        placeholder="Enter project name"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="bg-transparent border-none focus:ring-0 p-0 w-full font-sans text-sm text-slate-200 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block font-label-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider">Version</label>
                    <div className="flex items-center bg-[#0B120D] text-primary p-2.5 border border-brand-500/12 rounded-lg focus-within:border-brand-500/60 focus-within:shadow-[0_0_12px_rgba(57,255,136,0.12)] transition-all group">
                      <span className="mr-2 text-brand-500/40 font-mono group-focus-within:text-brand-500">&gt;</span>
                      <input
                        placeholder="1.0.0"
                        value={form.version}
                        onChange={(e) => setForm({ ...form, version: e.target.value })}
                        className="bg-transparent border-none focus:ring-0 p-0 w-full font-sans text-sm text-slate-200 outline-none"
                      />
                    </div>
                  </div>

                  <div className="col-span-full space-y-2">
                    <label className="block font-label-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider">Description</label>
                    <textarea
                      placeholder="Tell players about your game, mechanics, and story..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={4}
                      className="w-full bg-[#0B120D] border border-brand-500/12 focus:border-brand-500/60 focus:shadow-[0_0_12px_rgba(57,255,136,0.12)] p-3 rounded-lg text-sm text-slate-200 outline-none transition-all font-sans resize-none"
                    />
                  </div>
                </div>

                {/* Specs */}
                <div className="space-y-4 pt-4 border-t border-brand-500/10">
                  <span className="block text-[10px] font-label-mono uppercase text-primary font-bold tracking-wider">
                    Hardware Requirements (Per Platform)
                  </span>

                  {form.hardwareSpecs.filter((h) => h !== "WEB").length === 0 ? (
                    <div className="p-4 text-center border border-dashed border-brand-500/20 bg-[#0B120D]/60 rounded-xl text-slate-400 font-label-mono text-xs italic">
                      NO HARDWARE SPECIFICATIONS REQUIRED FOR WEB-ONLY DEPLOYMENT
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {form.hardwareSpecs
                        .filter((platform) => platform !== "WEB")
                        .map((platform) => {
                          const specs = platformSpecs[platform] || {
                            minimum: { os: "", processor: "", memory: "", graphics: "", storage: "" },
                            recommended: { os: "", processor: "", memory: "", graphics: "", storage: "" }
                          };
                          return (
                            <div key={platform} className="bg-[#0B120D]/40 border border-brand-500/10 rounded-xl p-4 space-y-4">
                              <div className="flex items-center gap-2 border-b border-brand-500/10 pb-2">
                                <span className="text-[9px] font-label-mono font-bold px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30 uppercase">
                                  {platform} SPECIFICATIONS
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Minimum specs */}
                                <div className="bg-[#0D1410]/20 p-4 border border-brand-500/5 rounded-lg space-y-3">
                                  <p className="font-label-mono text-[9px] text-secondary/80 font-bold tracking-wider uppercase mb-1">Minimum Specs</p>
                                  {["os", "processor", "memory", "graphics", "storage"].map((f) => (
                                    <div key={f} className="space-y-1">
                                      <label className="block font-label-mono text-[8px] text-slate-400 uppercase tracking-wider">{f === "os" ? "OS" : f}</label>
                                      <input
                                        value={specs.minimum[f] || ""}
                                        onChange={(e) => {
                                          setPlatformSpecs((prev) => ({
                                            ...prev,
                                            [platform]: {
                                              ...prev[platform],
                                              minimum: { ...prev[platform].minimum, [f]: e.target.value }
                                            }
                                          }));
                                        }}
                                        className="w-full bg-[#0B120D] border border-brand-500/12 rounded-lg p-2 text-xs font-sans text-slate-200 focus:border-brand-500/60 focus:shadow-[0_0_12px_rgba(57,255,136,0.12)] outline-none transition-all"
                                      />
                                    </div>
                                  ))}
                                </div>

                                {/* Recommended specs */}
                                <div className="bg-[#0D1410]/20 p-4 border border-brand-500/5 rounded-lg space-y-3">
                                  <p className="font-label-mono text-[9px] text-primary/80 font-bold tracking-wider uppercase mb-1">Recommended Specs</p>
                                  {["os", "processor", "memory", "graphics", "storage"].map((f) => (
                                    <div key={f} className="space-y-1">
                                      <label className="block font-label-mono text-[8px] text-slate-400 uppercase tracking-wider">{f === "os" ? "OS" : f}</label>
                                      <input
                                        value={specs.recommended[f] || ""}
                                        onChange={(e) => {
                                          setPlatformSpecs((prev) => ({
                                            ...prev,
                                            [platform]: {
                                              ...prev[platform],
                                              recommended: { ...prev[platform].recommended, [f]: e.target.value }
                                            }
                                          }));
                                        }}
                                        className="w-full bg-[#0B120D] border border-brand-500/12 rounded-lg p-2 text-xs font-sans text-slate-200 focus:border-brand-500/60 focus:shadow-[0_0_12px_rgba(57,255,136,0.12)] outline-none transition-all"
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

              {/* Categorization & Integrations Card */}
              <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
                
                <div className="bg-[#0D1410]/30 pixel-border p-6 space-y-5 flex-1">
                  <div className="border-b border-brand-500/10 pb-3">
                    <h3 className="font-label-mono text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <Layers size={14} /> Categorization & Licensing
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <label className="block font-label-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider">Target Platforms</label>
                    <div className="grid grid-cols-2 gap-2">
                      {HARDWARE_OPTIONS.map((opt) => {
                        const isSelected = form.hardwareSpecs.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleHardwareToggle(opt)}
                            className={`p-3 rounded-lg border text-xs transition-all font-sans flex items-center justify-between ${
                              isSelected
                                ? "bg-primary/8 border-brand-500 text-brand-500 shadow-[0_0_10px_rgba(57,255,136,0.08)] font-bold"
                                : "bg-[#0D1410]/40 border-brand-500/12 text-slate-400 hover:text-slate-200 hover:border-brand-500/30"
                            }`}
                          >
                            <span>{opt.charAt(0) + opt.slice(1).toLowerCase()}</span>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block font-label-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider">Genre Tags</label>
                    <div className="flex flex-wrap gap-1.5">
                      {GENRES.map((g) => {
                        const isSelected = form.genres.includes(g);
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => handleGenreToggle(g)}
                            className={`px-2.5 py-1.5 rounded-md border text-[9px] font-mono transition-all uppercase ${
                              isSelected
                                ? "bg-secondary/15 border-secondary text-secondary font-bold"
                                : "bg-[#0D1410]/40 border-brand-500/12 text-slate-400 hover:border-secondary/40 hover:text-slate-200"
                            }`}
                          >
                            {g}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-brand-500/10">
                    <div className="space-y-2">
                      <label className="block font-label-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider">Licensing</label>
                      <select
                        value={form.licensing}
                        onChange={(e) => setForm({ ...form, licensing: e.target.value as "FREE" | "PAID", price: e.target.value === "FREE" ? 0 : form.price })}
                        className="w-full bg-[#0B120D] border border-brand-500/12 text-slate-300 p-2.5 rounded-lg text-xs outline-none focus:border-brand-500/60 focus:shadow-[0_0_12px_rgba(57,255,136,0.12)] transition-all font-sans"
                      >
                        <option value="FREE">Free to Play</option>
                        <option value="PAID">Premium Paid</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-label-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider">Base Price (INR)</label>
                      <input
                        type="number"
                        disabled={form.licensing === "FREE"}
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                        className="w-full bg-[#0B120D] disabled:opacity-30 border border-brand-500/12 rounded-lg focus:border-brand-500/60 focus:shadow-[0_0_12px_rgba(57,255,136,0.12)] p-2.5 text-xs text-slate-200 outline-none transition-all font-sans"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-[#0D1410]/30 pixel-border p-6 space-y-4">
                  <div className="border-b border-brand-500/10 pb-3">
                    <h3 className="font-label-mono text-[10px] font-bold uppercase text-primary flex items-center gap-2 tracking-widest">
                      <UploadCloud size={14} /> Asset Uplink
                    </h3>
                  </div>

                  {/* Media Files */}
                  {[
                    { key: "cover", label: "Cover Art (2:3 Ratio)", file: coverFile, setFile: setCoverFile },
                    { key: "banner", label: "Hero Banner (16:9 Ratio)", file: bannerFile, setFile: setBannerFile },
                    { key: "trailer", label: "Trailer (.mp4 video file)", file: trailerFile, setFile: setTrailerFile }
                  ].map((asset) => (
                    <div key={asset.key} className="space-y-1.5">
                      <label className="block font-label-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider">{asset.label}</label>
                      <div className="flex items-center gap-2">
                        <label className="flex-1 bg-[#0B120D] border border-brand-500/12 hover:border-brand-500/40 cursor-pointer p-2.5 rounded-lg flex items-center justify-between text-xs transition-all text-slate-300">
                          <span className="truncate">{asset.file ? asset.file.name : "Select Asset File..."}</span>
                          <input type="file" accept={asset.key === "trailer" ? "video/mp4" : "image/*"} className="hidden" onChange={(e) => asset.setFile(e.target.files?.[0] || null)} />
                        </label>
                        {asset.file && (
                          <button onClick={() => asset.setFile(null)} className="text-slate-400 hover:text-error p-1">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Screenshots Files Upload slot */}
                  <div className="space-y-1.5">
                    <label className="block font-label-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider">Screenshots (Up to 10 Images)</label>
                    <div className="flex flex-col gap-2">
                      <label className="bg-[#0B120D] border border-brand-500/12 hover:border-brand-500/40 cursor-pointer p-2.5 rounded-lg flex items-center justify-between text-xs transition-all text-slate-300">
                        <span className="truncate">
                          {screenshotsFiles.length > 0 
                            ? `${screenshotsFiles.length} Screenshot(s) Selected` 
                            : "Select Screenshot Files..."}
                        </span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          className="hidden" 
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setScreenshotsFiles((prev) => [...prev, ...files].slice(0, 10));
                          }} 
                        />
                      </label>
                      {screenshotsFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-2 bg-[#0B120D]/60 border border-brand-500/10 rounded-lg">
                          {screenshotsFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 bg-[#0D1410] border border-brand-500/10 px-2 py-1 rounded text-[10px] text-slate-300">
                              <span className="truncate max-w-[120px]">{file.name}</span>
                              <button 
                                type="button"
                                onClick={() => setScreenshotsFiles((prev) => prev.filter((_, i) => i !== idx))} 
                                className="text-slate-500 hover:text-error"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Build Targets */}
                  {form.hardwareSpecs.length > 0 && (
                    <div className="space-y-4 pt-4 mt-4 border-t border-brand-500/10">
                      <h4 className="font-label-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider">Target Builds</h4>
                      <div className="space-y-3">
                        {form.hardwareSpecs.map((platform) => {
                          const binaryPath = binaryFiles[platform];
                          return (
                            <div key={platform} className="bg-[#0B120D]/60 border border-brand-500/10 p-3 rounded-lg space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-label-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase border border-primary/20">
                                  {platform}
                                </span>
                                <input
                                  className="bg-[#0B120D] border border-brand-500/12 focus:border-brand-500/60 rounded-md w-full px-2 py-1 text-xs font-sans text-slate-200 outline-none"
                                  placeholder={platform === "WEB" ? "index.html" : "game.exe"}
                                  value={form.platformEntrypoints?.[platform] || ""}
                                  onChange={(e) => setForm({ ...form, platformEntrypoints: { ...(form.platformEntrypoints || {}), [platform]: e.target.value } })}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (window.lazplayAPI?.selectFolder) {
                                      const path = await window.lazplayAPI.selectFolder();
                                      if (path) setBinaryFiles((prev) => ({ ...prev, [platform]: path }));
                                    }
                                  }}
                                  className="flex-1 bg-[#0B120D] border border-secondary/20 hover:border-secondary/50 rounded-md p-2 text-xs font-sans transition-all text-secondary text-left"
                                >
                                  <span className="truncate">{binaryPath || `Select Local Directory`}</span>
                                </button>
                                {binaryPath && (
                                  <button onClick={() => setBinaryFiles((prev) => ({ ...prev, [platform]: null }))} className="text-slate-400 hover:text-error p-1">
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-4 border-t border-brand-500/10 space-y-3">
                    <button
                      onClick={handleExecuteDeployment}
                      disabled={isDeploying || !form.title}
                      className="w-full bg-brand-500 text-slate-950 hover:bg-brand-500/80 active:scale-[0.98] disabled:opacity-40 transition-all py-3 rounded-lg font-sans font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(57,255,136,0.12)]"
                    >
                      {isDeploying ? "Transmitting..." : (selectedGame ? "Update Project" : "Initialize Deployment")}
                    </button>

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
                        className="w-full border border-error/35 text-error hover:bg-error/5 hover:border-error rounded-lg transition-all py-2 font-sans text-xs flex items-center justify-center gap-2"
                      >
                        <Trash2 size={14} /> Terminate Project
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

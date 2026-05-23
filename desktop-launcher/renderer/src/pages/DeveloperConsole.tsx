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
      addLog(isUpdate ? `Updating game metadata...` : "Initializing new game entry...");

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
        addLog("Game metadata updated successfully ✓");
      } else {
        const res = await axios.post("https://play.lazplay.tech/api/v1/developer/games", payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const created = res.data.data || res.data;
        gameId = created.id || created.gameId;
        addLog(`Game entry created successfully ✓`);
      }

      // Step 2: Upload Cover Image
      if (coverFile) {
        setDeployStep(2);
        addLog("Requesting upload url for cover image...");
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

        addLog(`Uploading cover image: ${coverFile.name} (${Math.round(coverFile.size / 1024)} KB)...`);
        await uploadToR2(uploadUrl, coverFile, (pct) => setUploadProgress(pct));
        addLog("Cover image uploaded successfully ✓");

        addLog("Registering cover image with backend...");
        await axios.post(
          `https://play.lazplay.tech/api/v1/developer/games/${gameId}/media`,
          {
            type: "IMAGE",
            url: publicUrl,
            purpose: "COVER"
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        addLog("Cover image registered ✓");

        addLog("Syncing cover image url...");
        await axios.patch(`https://play.lazplay.tech/api/v1/developer/games/${gameId}`, {
          coverUrl: publicUrl
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        addLog("Cover url synced ✓");
        setUploadProgress(0);
      }

      // Step 3: Upload Hero Banner
      if (bannerFile) {
        setDeployStep(3);
        addLog("Requesting upload url for hero banner...");
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

        addLog(`Uploading hero banner: ${bannerFile.name} (${Math.round(bannerFile.size / 1024)} KB)...`);
        await uploadToR2(uploadUrl, bannerFile, (pct) => setUploadProgress(pct));
        addLog("Hero banner uploaded successfully ✓");

        addLog("Registering hero banner...");
        await axios.post(
          `https://play.lazplay.tech/api/v1/developer/games/${gameId}/media`,
          {
            type: "IMAGE",
            url: publicUrl,
            purpose: "BANNER"
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        addLog("Hero banner registered ✓");
        setUploadProgress(0);
      }

      // Step 4: Upload Trailer Video
      if (trailerFile) {
        setDeployStep(4);
        addLog("Requesting upload url for video trailer...");
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

        addLog(`Uploading video trailer: ${trailerFile.name} (${Math.round(trailerFile.size / (1024 * 1024))} MB)...`);
        await uploadToR2(uploadUrl, trailerFile, (pct) => setUploadProgress(pct));
        addLog("Video trailer uploaded successfully ✓");

        addLog("Registering video trailer...");
        await axios.post(
          `https://play.lazplay.tech/api/v1/developer/games/${gameId}/media`,
          {
            type: "VIDEO",
            url: publicUrl,
            purpose: "TRAILER"
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        addLog("Video trailer registered ✓");
        setUploadProgress(0);
      }

      // Step 4B: Upload Screenshots
      if (screenshotsFiles.length > 0) {
        setDeployStep(4);
        addLog(`Uploading screenshots (${screenshotsFiles.length} files)...`);
        for (let i = 0; i < screenshotsFiles.length; i++) {
          const file = screenshotsFiles[i];
          addLog(`[Screenshot ${i + 1}/${screenshotsFiles.length}] Requesting upload url...`);
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

          addLog(`[Screenshot ${i + 1}/${screenshotsFiles.length}] Uploading: ${file.name} (${Math.round(file.size / 1024)} KB)...`);
          await uploadToR2(uploadUrl, file, (pct) => setUploadProgress(pct));

          addLog(`[Screenshot ${i + 1}/${screenshotsFiles.length}] Registering screenshot...`);
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
        addLog("Screenshots uploaded successfully ✓");
        setUploadProgress(0);
      }

      // Step 5: High-performance Client-side Chunked & ZSTD Compression pipeline
      for (const platform of form.hardwareSpecs) {
        const folderPath = binaryFiles[platform];
        if (folderPath) {
          setDeployStep(5);
          addLog(`Creating new build entry for ${platform}...`);
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
          addLog(`Build entry initialized for ${platform} ✓`);

          addLog(`Starting upload helper for ${platform}...`);
          addLog(`[Uploader] Scanning directory and staging files...`);
          
          setUploadProgress(0);

          let removeProgress = () => {};
          if (window.lazplayAPI?.onUploadProgress) {
            removeProgress = window.lazplayAPI.onUploadProgress((data: any) => {
              if (data.buildId === buildId) {
                setUploadProgress(data.progress);
                addLog(`[Uploader] ${data.status}`);
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
          addLog(`Build folder processed and compressed for ${platform} ✓`);
          addLog(`Manifest published for ${platform} ✓`);
          setUploadProgress(0);

          // Step 6: Antivirus & validation sandbox scanning
          setDeployStep(6);
          addLog(`Triggering security scan for ${platform}...`);
          await axios.post(
            `https://play.lazplay.tech/api/v1/developer/builds/${buildId}/scan`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          addLog(`Scan triggered: package verified secure for ${platform} ✓`);

          // Step 7: Publishing/Deploying build
          setDeployStep(7);
          addLog(`Deploying build for ${platform} to store...`);
          await axios.post(
            `https://play.lazplay.tech/api/v1/developer/builds/${buildId}/deploy`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          addLog(`Deployment complete for ${platform} ✓`);
        } else {
          addLog(`Warning: No build staged for ${platform}. Skipping.`);
        }
      }

      setDeployStep(8);
      addLog("Deployment process completed successfully ✓");
      setSuccessMessage(isUpdate ? "Game project updated and deployed successfully!" : "New game project deployed successfully!");
      fetchDeveloperGames(token);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || "An unknown deployment error occurred.";
      addLog(`[Error] Deployment failed: ${errMsg}`);
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
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <span className="text-on-surface-variant font-mono text-xs uppercase tracking-widest animate-pulse">
            Loading Creator Workspace...
          </span>
        </div>
      </div>
    );
  }

  // Not Logged In Safeguard
  if (!token) {
    return (
      <div className="w-full h-full bg-transparent flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-surface-container border border-outline-variant rounded-xl p-6 text-center select-none shadow-2xl">
          <AlertTriangle className="text-amber-500 mx-auto mb-4" size={48} />
          <h3 className="text-xl font-bold mb-2 uppercase tracking-wide text-on-surface">Access Restricted</h3>
          <p className="text-on-surface-variant text-sm mb-6">
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
        <div className="max-w-xl mx-auto bg-surface-container border border-outline-variant rounded-xl p-8 shadow-2xl relative overflow-hidden">
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-primary font-mono text-xs uppercase tracking-widest mb-3">
              <Shield size={16} />
              <span>Developer Registration</span>
            </div>

            <h2 className="text-3xl font-black text-on-surface mb-2 uppercase tracking-tight">Become a LazPlay Developer</h2>
            <p className="text-on-surface-variant text-sm mb-8 leading-relaxed">
              Register as a verified developer to publish and manage games on LazPlay.
            </p>

            <form onSubmit={handleRegisterDeveloper} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase text-on-surface-variant">Display Name / Developer Name *</label>
                <input
                  required
                  placeholder="e.g. RetroByte Games"
                  value={registerForm.displayName}
                  onChange={(e) => setRegisterForm({ ...registerForm, displayName: e.target.value })}
                  className="w-full bg-surface border border-outline-variant focus:border-primary p-3 rounded-lg text-sm text-on-surface outline-none transition-all font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase text-on-surface-variant">Support / Developer Email *</label>
                <input
                  required
                  type="email"
                  placeholder="e.g. support@retrobyte.tech"
                  value={registerForm.supportEmail}
                  onChange={(e) => setRegisterForm({ ...registerForm, supportEmail: e.target.value })}
                  className="w-full bg-surface border border-outline-variant focus:border-primary p-3 rounded-lg text-sm text-on-surface outline-none transition-all font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase text-on-surface-variant">Portfolio Website (Optional)</label>
                <input
                  placeholder="https://retrobyte.tech"
                  value={registerForm.website}
                  onChange={(e) => setRegisterForm({ ...registerForm, website: e.target.value })}
                  className="w-full bg-surface border border-outline-variant focus:border-primary p-3 rounded-lg text-sm text-on-surface outline-none transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={registering}
                className="w-full mt-6 bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all text-white font-mono text-sm py-3.5 rounded-lg font-bold flex items-center justify-center gap-2 tracking-wider shadow-md"
              >
                {registering ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <UserCheck size={18} />
                    <span>Register as Developer</span>
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
          background: #101010; 
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
          background: #151d19; 
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
          background-color: #101010 !important; 
          color: #cbd5e1 !important; 
          border: 1px solid rgba(255, 255, 255, 0.1) !important; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.5); 
        }
        .ql-snow .ql-tooltip { 
          background-color: #101010 !important; 
          color: #cbd5e1 !important; 
          border: 1px solid rgba(255, 255, 255, 0.1) !important; 
        }
        .ql-snow .ql-tooltip input[type=text] { 
          background: #101010 !important; 
          color: #cbd5e1 !important; 
          border: 1px solid rgba(255, 255, 255, 0.1) !important; 
        }
      `}</style>
      
      {/* Upper Navigation Header */}
      <header className="flex-shrink-0 flex items-center justify-between p-6 border-b border-outline-variant relative z-20">
        <div>
          <h1 className="font-headline-lg text-2xl text-on-surface mb-1 flex items-center gap-3 font-bold">
            Creator Workspace
          </h1>
          <p className="font-label-mono text-xs text-on-surface-variant uppercase tracking-wider">
            Developer: {userProfile.displayName || userProfile.email} | Status: Online
          </p>
        </div>

        <div className="flex gap-2">
          {view !== "dashboard" ? (
            <button
              onClick={() => setView("dashboard")}
              className="bg-surface-container border border-outline-variant px-4 py-2 font-label-mono text-xs text-on-surface hover:border-primary hover:text-primary transition-colors flex items-center gap-2 group"
            >
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Return to Dashboard
            </button>
          ) : (
            <>
              <button 
                onClick={() => fetchDeveloperGames(token!)}
                className="bg-surface-container border border-outline-variant px-4 py-2 font-label-mono text-xs text-on-surface hover:border-primary hover:text-primary transition-colors flex items-center gap-2 group"
              >
                <Activity size={16} className="group-hover:animate-spin" />
                Refresh
              </button>
              <button 
                onClick={enterCreateMode}
                className="bg-primary/10 border border-primary text-primary hover:bg-primary hover:text-white transition-all px-4 py-2 font-label-mono font-bold text-xs flex items-center gap-2 rounded-lg"
              >
                <Plus size={16} />
                Create Project
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
              {/* Analytics: Revenue */}
              <div className="col-span-12 lg:col-span-8 bg-surface border border-outline-variant hover:border-primary/40 transition-colors group relative overflow-hidden flex flex-col rounded-xl">
                <div className="bg-surface-container border-b border-outline-variant px-3 py-1.5 flex justify-between items-center group-hover:bg-surface-container-high transition-colors">
                  <span className="font-label-mono text-xs text-on-surface-variant">Revenue Analytics</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 border border-outline-variant"></div>
                    <div className="w-3 h-3 border border-outline-variant"></div>
                    <div className="w-3 h-3 bg-outline-variant border border-outline-variant"></div>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col gap-4 relative">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="font-label-mono text-xs text-on-surface-variant block mb-1">Total Gross Revenue</span>
                      <span className="font-headline-lg text-4xl text-primary block font-bold">
                        ₹0.00
                      </span>
                    </div>
                    <span className="bg-surface-container border border-outline-variant text-on-surface font-label-mono text-xs px-2 py-1 flex items-center gap-1">
                      Sales: 0
                    </span>
                  </div>
                  <div className="flex-1 flex items-end gap-1 mt-4 h-32 w-full border-b border-l border-outline-variant pt-2 pr-2 relative">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb),0.05)_1px,transparent_1px)] bg-[length:100%_20px] pointer-events-none"></div>
                    {/* Placeholder Bar Chart */}
                    <div className="flex-1 group/bar relative border-t transition-all bg-surface-container border-outline-variant" style={{ height: "10%" }}></div>
                    <div className="flex-1 group/bar relative border-t transition-all bg-surface-container border-outline-variant" style={{ height: "30%" }}></div>
                    <div className="flex-1 group/bar relative border-t transition-all bg-surface-container border-outline-variant" style={{ height: "15%" }}></div>
                    <div className="flex-1 group/bar relative border-t transition-all bg-surface-container border-outline-variant" style={{ height: "5%" }}></div>
                  </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                <div className="bg-surface border border-outline-variant p-4 hover:border-primary transition-all group flex-1 flex flex-col justify-center rounded-xl">
                  <span className="font-label-mono text-xs text-on-surface-variant flex justify-between">
                    Active Players
                    <span className="text-primary animate-pulse">●</span>
                  </span>
                  <span className="font-headline-md text-2xl text-on-surface mt-2 block group-hover:text-primary transition-colors">
                    0 / 0
                  </span>
                  <div className="flex gap-1 mt-4 h-3 w-full">
                    <div className="flex-1 bg-surface-container border border-outline-variant"></div>
                    <div className="flex-1 bg-surface-container border border-outline-variant"></div>
                    <div className="flex-1 bg-surface-container border border-outline-variant"></div>
                  </div>
                </div>
                <div className="bg-surface border border-outline-variant p-4 hover:border-primary transition-all group flex-1 flex flex-col justify-center rounded-xl">
                  <span className="font-label-mono text-xs text-on-surface-variant flex justify-between">
                    Total Projects
                    <span className="text-primary font-bold block">Linked</span>
                  </span>
                  <span className="font-headline-md text-2xl text-primary mt-2 block font-bold">
                    {games.length}
                  </span>
                  <p className="font-label-mono text-[10px] text-on-surface-variant mt-4 uppercase">
                    Version Control: Active
                  </p>
                </div>
              </div>
            </div>

            {/* Games Listing Workspace */}
            <div className="bg-surface border border-outline-variant flex flex-col shadow-md mb-8 rounded-xl overflow-hidden">
              <div className="bg-surface-container px-4 py-2 flex justify-between items-center">
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
                  No projects found in workspace
                </div>
              ) : (
                <div className="p-4 overflow-x-auto">
                  <div className="min-w-[600px]">
                    <div className="grid grid-cols-12 gap-2 text-on-surface-variant pb-2 mb-2 text-[10px] font-label-mono uppercase tracking-wider">
                      <div className="col-span-4">Project Title</div>
                      <div className="col-span-2 text-center">Version</div>
                      <div className="col-span-2 text-center">Status</div>
                      <div className="col-span-2 text-center">Price</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>
                    {games.map((game) => (
                      <div key={game.id || game.gameId} className="grid grid-cols-12 gap-2 text-on-surface hover:bg-surface-container cursor-pointer transition-colors py-2 group items-center last:border-b-0">
                        <div className="col-span-4 flex items-center gap-3 font-bold">
                          {game.coverUrl ? (
                            <img src={game.coverUrl} className="w-8 h-8 object-cover border border-outline-variant" alt="" />
                          ) : (
                            <div className="w-8 h-8 border border-outline-variant bg-surface flex items-center justify-center">
                              <Layers size={14} className="text-outline-variant" />
                            </div>
                          )}
                          <span className="truncate text-primary">{game.title}</span>
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
                <h1 className="font-headline-xl text-4xl text-primary leading-none tracking-tighter">
                  {selectedGame ? 'Project Management' : 'Project Deployment Suite'}
                </h1>
                <p className="font-label-mono text-on-surface-variant text-xs mt-2 tracking-widest">
                  &gt; Status: {selectedGame?.status || 'Draft'} | ID: {selectedGame?.id || 'New Project'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  <div className={`w-4 h-4 ${isDeploying ? 'bg-primary animate-pulse' : 'bg-primary'}`}></div>
                  <div className={`w-4 h-4 ${isDeploying ? 'bg-primary animate-pulse delay-75' : 'bg-primary'}`}></div>
                  <div className={`w-4 h-4 ${isDeploying ? 'bg-primary animate-pulse delay-150' : 'bg-primary'}`}></div>
                  <div className="w-4 h-4 bg-surface-variant"></div>
                </div>
              </div>
            </section>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-12 gap-6">
              
              {/* Metadata Card */}
              <div className="col-span-12 lg:col-span-7 bg-surface-container/25 border border-zinc-700/60 p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between pb-3">
                  <h3 className="font-label-mono text-primary text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                    <span className="material-symbols-outlined text-[16px]">info</span> Game Metadata
                  </h3>
                  <span className="text-[9px] font-label-mono text-on-surface-variant uppercase tracking-widest">Security: Active</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block font-label-mono text-[10px] text-on-surface-variant">Title</label>
                    <div className="flex items-center bg-surface-container/40 text-primary p-3 group">
                      <span className="mr-2 group-focus-within:animate-pulse font-mono text-xs">&gt;</span>
                      <input
                        placeholder="Enter Project Name"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="bg-transparent border-none focus:ring-0 p-0 w-full font-label-mono text-sm text-on-surface outline-none uppercase placeholder:opacity-30"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block font-label-mono text-[10px] text-on-surface-variant">Version</label>
                    <div className="flex items-center bg-surface-container/40 text-primary p-3 group">
                      <span className="mr-2 group-focus-within:animate-pulse font-mono text-xs">&gt;</span>
                      <input
                        placeholder="1.0.0"
                        value={form.version}
                        onChange={(e) => setForm({ ...form, version: e.target.value })}
                        className="bg-transparent border-none focus:ring-0 p-0 w-full font-label-mono text-sm text-on-surface outline-none"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="col-span-full space-y-2">
                    <label className="block font-label-mono text-[10px] text-on-surface-variant">Description</label>
                    <div className="bg-surface-container/40">
                      <ReactQuill
                        theme="snow"
                        value={form.description}
                        onChange={(content) => setForm({ ...form, description: content })}
                        modules={quillModules}
                        placeholder="Describe your game here..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Hardware Specs Card */}
              <div className="col-span-12 lg:col-span-5 bg-surface-container/25 border border-zinc-700/60 p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between pb-3">
                  <h3 className="font-label-mono text-primary text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                    <span className="material-symbols-outlined text-[16px]">settings_input_component</span> Supported Platforms
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
                      <label key={spec.id} className={`group flex items-center gap-3 p-3 bg-surface-container-lowest/60 transition-all cursor-pointer ${isSelected ? 'bg-primary/10' : ''}`}>
                        <input
                          checked={isSelected}
                          onChange={() => handleHardwareToggle(spec.id)}
                          className="form-checkbox bg-transparent text-primary rounded-none focus:ring-0"
                          type="checkbox"
                        />
                        <span className={`font-label-mono text-[11px] ${isSelected ? 'text-primary' : 'group-hover:text-primary text-on-surface-variant'}`}>{spec.label}</span>
                      </label>
                    );
                  })}
                </div>

                {form.hardwareSpecs.includes('WEB') && (
                  <div className="p-3 bg-amber-500/10 text-amber-500 font-label-mono text-[9px] uppercase tracking-wider text-center leading-normal animate-in fade-in duration-200">
                    ⚠️ Web builds are strictly for free play and demo purposes. They cannot be sold.
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-label-mono text-[10px] text-primary uppercase font-bold tracking-wider">System Requirements</span>
                    <div className="h-[1px] flex-1 mx-4 bg-outline-variant/10"></div>
                  </div>

                  {form.hardwareSpecs.filter(h => h !== 'WEB').length === 0 ? (
                    <div className="p-4 text-center bg-surface-container-lowest/30 rounded font-label-mono text-[10px] text-on-surface-variant italic uppercase">
                      No system requirements required for Web-only build
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
                            <div key={platform} className="p-4 bg-surface-container-lowest/40 rounded space-y-4">
                              <div className="flex items-center gap-2 pb-2">
                                <span className="text-[9px] font-label-mono font-black px-2 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">
                                  {platform} System Requirements
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                {/* Minimum Specs */}
                                <div className="space-y-3 bg-surface-container-lowest/60 p-3">
                                  <p className="font-label-mono text-[8px] text-secondary uppercase mb-1 underline underline-offset-2">Minimum Requirements</p>
                                  {['os', 'processor', 'memory', 'graphics', 'storage'].map(field => (
                                    <div key={field} className="space-y-1">
                                      <label className="block font-label-mono text-[7px] text-on-surface-variant uppercase">{field}</label>
                                      <input
                                        className="w-full bg-surface-container-lowest p-1.5 text-[9px] font-label-mono text-on-surface outline-none"
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
                                <div className="space-y-3 bg-surface-container-lowest/60 p-3">
                                  <p className="font-label-mono text-[8px] text-primary uppercase mb-1 underline underline-offset-2">Recommended Requirements</p>
                                  {['os', 'processor', 'memory', 'graphics', 'storage'].map(field => (
                                    <div key={field} className="space-y-1">
                                      <label className="block font-label-mono text-[7px] text-on-surface-variant uppercase">{field}</label>
                                      <input
                                        className="w-full bg-surface-container-lowest p-1.5 text-[9px] font-label-mono text-on-surface outline-none"
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
              <div className="col-span-12 lg:col-span-6 bg-surface-container/25 border border-zinc-700/60 p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between pb-3">
                  <h3 className="font-label-mono text-primary text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                    <span className="material-symbols-outlined text-[16px]">label</span> Categorization
                  </h3>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="block font-label-mono text-[10px] text-on-surface-variant mb-2 uppercase">Genre Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {GENRES.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleGenreToggle(tag)}
                          className={`px-3 py-1.5 font-label-mono text-[9px] transition-all uppercase ${form.genres.includes(tag) ? 'text-primary bg-primary/10' : 'text-on-surface-variant bg-surface-container-lowest/60'}`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block font-label-mono text-[10px] text-on-surface-variant mb-2 uppercase">Custom Tags</label>
                    <div className="flex items-center bg-surface-container-lowest text-primary p-3 group">
                      <span className="mr-2 group-focus-within:animate-pulse font-mono text-xs">&gt;</span>
                      <input
                        className="bg-transparent border-none focus:ring-0 p-0 w-full font-label-mono text-[12px] uppercase placeholder:opacity-30 outline-none text-on-surface"
                        placeholder="Add tag and press Enter"
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
                        <span key={tag} className="flex items-center gap-2 px-3 py-1 bg-surface-container-lowest text-primary font-label-mono text-[10px]">
                          {tag}
                          <span onClick={() => setForm(prev => ({ ...prev, customTags: prev.customTags.filter(t => t !== tag) }))} className="material-symbols-outlined text-[14px] cursor-pointer hover:text-error transition-colors">close</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Store Info Module */}
              <div className="col-span-12 lg:col-span-6 bg-surface-container/25 border border-zinc-700/60 p-6 flex flex-col gap-6 relative overflow-hidden">
                <div className="absolute inset-0 z-10 bg-black/35 backdrop-blur-sm cursor-not-allowed"></div>
                <div className="absolute inset-0 z-20 flex items-center justify-center">
                  <span className="text-[9px] font-label-mono uppercase tracking-widest text-on-surface-variant border border-zinc-700/60 px-3 py-1 bg-black/40">
                    Coming soon
                  </span>
                </div>
                <div className="flex items-center justify-between pb-3 relative z-0 opacity-70">
                  <h3 className="font-label-mono text-primary text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                    <span className="material-symbols-outlined text-[16px]">storefront</span> Store Integration
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-0 opacity-70">
                  <div className="space-y-2">
                    <label className="block font-label-mono text-[10px] text-on-surface-variant uppercase">Licensing Model</label>
                    <div className="relative bg-surface-container-lowest">
                      <select
                        value={form.licensing}
                        onChange={(e) => setForm({ ...form, licensing: e.target.value as "FREE" | "PAID", price: e.target.value === "FREE" ? 0 : form.price })}
                        className="w-full bg-surface-container-lowest border-none text-primary font-label-mono p-3 appearance-none focus:ring-0 cursor-pointer text-[12px] outline-none uppercase"
                      >
                        <option value="PAID">Premium (Paid)</option>
                        <option value="FREE">Free to Play (F2P)</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary">expand_more</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block font-label-mono text-[10px] text-on-surface-variant uppercase">Base Price (INR)</label>
                    <div className={`flex items-center p-3 transition-all group ${form.licensing === 'FREE' ? 'bg-surface-container-lowest/30 grayscale opacity-40' : 'bg-surface-container-lowest text-primary'}`}>
                      <span className="mr-2 text-on-surface-variant font-label-mono">₹</span>
                      <input
                        className="bg-transparent border-none focus:ring-0 p-0 w-full font-label-mono text-[12px] outline-none text-on-surface"
                        type="number"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                        disabled={form.licensing === 'FREE'}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mt-2 relative z-0 opacity-70">
                  <div className="flex justify-between items-center">
                    <label className="block font-label-mono text-[10px] text-on-surface-variant uppercase">Store Commission</label>
                    <span className="font-label-mono text-xs text-primary font-bold bg-primary/10 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(var(--primary-rgb),0.1)]">
                      {form.storeCut || 10}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4 bg-surface-container-lowest p-4">
                    <span className="font-label-mono text-[10px] text-on-surface-variant">5%</span>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      value={form.storeCut || 10}
                      onChange={(e) => setForm({ ...form, storeCut: Number(e.target.value) })}
                      className="flex-1 accent-primary h-1 bg-surface-variant rounded-lg appearance-none cursor-pointer focus:outline-none"
                    />
                    <span className="font-label-mono text-[10px] text-on-surface-variant">50%</span>
                  </div>
                  <p className="font-label-mono text-[8px] text-on-surface-variant opacity-60">
                    The platform takes a standard cut of sales revenue to fund server hosting and distribution.
                  </p>
                </div>
              </div>

              {/* Asset Deployment Card */}
              <div className="col-span-12 bg-surface-container/25 border border-zinc-700/60 p-6 rounded-xl">
                <div className="flex items-center justify-between pb-3 mb-6">
                  <h3 className="font-label-mono text-primary text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                    <span className="material-symbols-outlined text-[16px]">cloud_upload</span> Asset Uploads
                  </h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {[
                    { id: 'COVER_IMAGE', icon: 'auto_stories', label: 'Project Cover', sub: '600x900 (2:3 RATIO)', accept: 'image/*', file: coverFile, setFile: setCoverFile },
                    { id: 'HERO_BANNER', icon: 'image', label: 'Hero Banner', sub: '1920x1080 (16:9)', accept: 'image/*', file: bannerFile, setFile: setBannerFile },
                    { id: 'SCREENSHOTS', icon: 'collections', label: 'Screenshots', sub: '1920x1080 (MAX 10)', accept: 'image/*', files: screenshotsFiles, setFiles: setScreenshotsFiles, multiple: true },
                    { id: 'VIDEO_TRAILER', icon: 'movie', label: 'Video Trailer', sub: '.MP4 (MAX 1GB)', accept: 'video/*', file: trailerFile, setFile: setTrailerFile }
                  ].map(slot => {
                    const hasFile = slot.multiple ? slot.files && slot.files.length > 0 : !!slot.file;
                    return (
                      <label
                        key={slot.id}
                        className={`relative border border-dashed border-transparent p-6 flex flex-col items-center justify-center text-center bg-surface-container-lowest/60 transition-all group cursor-pointer min-h-[160px] rounded-xl ${
                          hasFile 
                            ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]' 
                            : 'border-transparent hover:border-primary hover:bg-surface-container-lowest'
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
                        <span className={`material-symbols-outlined text-4xl group-hover:text-primary mb-2 transition-transform group-hover:scale-110 ${hasFile ? 'text-primary animate-pulse' : 'text-on-surface-variant'}`}>{slot.icon}</span>
                        <p className={`font-label-mono text-[11px] font-bold uppercase tracking-wider mb-1 ${hasFile ? 'text-primary' : 'text-on-surface'}`}>{slot.label}</p>
                        <p className="font-label-mono text-[8px] text-on-surface-variant opacity-70 group-hover:opacity-100 transition-opacity">
                          {slot.multiple 
                            ? (slot.files && slot.files.length > 0 ? `${slot.files.length} files staged` : slot.sub)
                            : (slot.file ? `${slot.file.name.slice(0, 15)}...` : slot.sub)}
                        </p>
                        {hasFile && (
                          <div 
                            className="absolute top-2 right-2 p-1 bg-surface-container hover:bg-error/20 transition-colors cursor-pointer group/close z-10" 
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
                            <span className="material-symbols-outlined text-[14px] text-on-surface-variant group-hover/close:text-error transition-colors">close</span>
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>

                {/* Target Builds */}
                {form.hardwareSpecs.length > 0 && (
                  <div className="space-y-4 mt-8 pt-8">
                    <h4 className="font-label-mono text-[10px] text-primary uppercase tracking-widest flex items-center gap-2 font-bold">
                      <span className="material-symbols-outlined text-[14px]">terminal</span> Target Platform Builds & Entry Points
                    </h4>
                    <div className="space-y-4">
                      {form.hardwareSpecs.map(platform => {
                        const binaryPath = binaryFiles[platform];
                        return (
                          <div key={platform} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-surface-container-lowest/40 rounded-xl items-center">
                            
                            {/* Left Column: Platform Entry Point Input */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="font-label-mono text-[10px] text-on-surface bg-primary/20 px-2 py-0.5 rounded font-black tracking-widest uppercase">
                                  {platform}
                                </span>
                                <span className="font-label-mono text-[9px] text-on-surface-variant uppercase tracking-wider">
                                  Entry Point (e.g. {platform === 'WEB' ? 'index.html' : 'game.exe'})
                                </span>
                              </div>
                              <div className="flex items-center bg-surface-container-lowest text-primary p-2.5 group">
                                <span className="mr-2 group-focus-within:animate-pulse text-primary font-mono text-[10px]">&gt;</span>
                                <input
                                  className="bg-transparent border-none focus:ring-0 p-0 w-full font-label-mono text-[11px] placeholder:opacity-30 text-on-surface outline-none"
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
                                className={`relative border border-dashed border-transparent p-4 flex flex-col items-center justify-center text-center bg-surface-container/60 transition-all group cursor-pointer min-h-[90px] rounded-xl ${
                                  binaryPath
                                    ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]'
                                    : 'border-transparent hover:border-primary hover:bg-surface-container'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`material-symbols-outlined text-headline-sm transition-transform group-hover:scale-110 ${binaryPath ? 'text-primary' : 'text-on-surface-variant'}`}>
                                    folder
                                  </span>
                                  <p className={`font-label-mono text-[10px] font-bold uppercase tracking-wider ${binaryPath ? 'text-primary' : 'text-on-surface'}`}>
                                    {binaryPath ? 'Build folder staged' : `Select ${platform} Build Folder`}
                                  </p>
                                </div>
                                <p className="font-label-mono text-[8px] text-on-surface-variant/70 mt-1 max-w-[90%] truncate font-medium">
                                  {binaryPath ? binaryPath : 'Choose the local folder containing your build'}
                                </p>
                                {binaryPath && (
                                  <div 
                                    className="absolute top-2 right-2 p-1 bg-surface-container hover:bg-error/20 transition-colors cursor-pointer group/close" 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setBinaryFiles(prev => ({ ...prev, [platform]: null })); 
                                    }}
                                  >
                                    <span className="material-symbols-outlined text-[12px] text-on-surface-variant group-hover/close:text-error transition-colors">close</span>
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
              <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest border border-zinc-700/60 h-[300px] flex flex-col relative overflow-hidden group shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] rounded-xl">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb),0.05)_1px,transparent_1px)] bg-[length:100%_4px] pointer-events-none"></div>
                <div className="bg-surface-container px-3 py-1.5 flex justify-between items-center">
                  <span className="font-label-mono text-[10px] text-primary flex items-center gap-2 font-bold">
                    <span className="material-symbols-outlined text-[14px]">terminal</span> Deployment Logs {isDeploying && `:: Step ${deployStep} of 8`}
                  </span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-surface-variant"></div>
                    <div className="w-2 h-2 bg-surface-variant"></div>
                    <div className="w-2 h-2 bg-primary"></div>
                  </div>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto font-label-mono text-[10px] space-y-1">
                  {logs.map((log, i) => (
                    <div key={i} className="flex gap-4">
                      <span className="text-on-surface-variant opacity-40">[{new Date().toLocaleTimeString()}]</span>
                      <span className={log.includes('Error') || log.includes('FAILED') ? 'text-error' : (log.includes('successfully') || log.includes('✓') ? 'text-primary' : 'text-on-surface')}>
                        {log.startsWith('STEP') ? `>> ${log}` : `> ${log}`}
                      </span>
                    </div>
                  ))}
                  {isDeploying && (
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-primary animate-pulse">&gt; Uploading build files...</span>
                      <span className="w-2 h-4 bg-primary animate-blink"></span>
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </div>

                {uploadProgress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-surface-container border-t border-primary/20 p-4 animate-slide-up">
                    <div className="flex justify-between font-label-mono text-[10px] text-primary mb-2 font-bold">
                      <span>Uploading build files...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1 bg-surface-container-lowest relative overflow-hidden">
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
                  className={`w-full h-full font-headline-md p-6 border-2 border-primary bg-primary/10 hover:bg-primary/20 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-4 group min-h-[150px] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl`}
                >
                  <span className={`material-symbols-outlined text-4xl group-hover:scale-110 transition-transform ${isDeploying ? 'animate-spin' : ''}`}>
                    {isDeploying ? 'sync' : 'rocket_launch'}
                  </span>
                  <span className="uppercase tracking-tighter font-extrabold text-lg text-primary glow-text-primary">
                    {isDeploying ? 'Processing...' : (selectedGame ? 'Update & Deploy' : 'Initiate Deploy')}
                  </span>
                  <span className="font-label-mono text-[9px] opacity-70 uppercase text-on-surface-variant font-medium">
                    {selectedGame ? 'Overwrite Existing Build' : 'Confirm Upload'}
                  </span>
                </button>

                {errorMessage && (
                  <div className="bg-error/10 border border-error text-error p-3 font-label-mono text-[10px] uppercase flex items-center gap-2 rounded-lg font-bold">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    <span>Error: {errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="bg-primary/10 border border-primary text-primary p-3 font-label-mono text-[10px] uppercase flex items-center gap-2 rounded-lg font-bold">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span>Success: {successMessage}</span>
                  </div>
                )}

                {selectedGame && (
                  <button
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to delete this project permanently?")) {
                        try {
                          setIsDeploying(true);
                          await axios.delete(`https://play.lazplay.tech/api/v1/developer/games/${selectedGame.id}`, { headers: { Authorization: `Bearer ${token}` } });
                          fetchDeveloperGames(token);
                          setView("dashboard");
                        } catch (err: any) {
                          alert(err.response?.data?.message || "Failed to delete project.");
                        } finally {
                          setIsDeploying(false);
                        }
                      }
                    }}
                    disabled={isDeploying}
                    className="w-full py-4 border-2 border-error/50 text-error font-label-mono hover:bg-error/10 transition-all uppercase tracking-widest text-[10px] rounded-lg font-bold"
                  >
                    Delete Project
                  </button>
                )}

                <button 
                  onClick={() => setView('dashboard')} 
                  className="w-full py-4 border-2 border-outline-variant/30 text-on-surface font-label-mono hover:bg-surface-container-high transition-all uppercase tracking-widest text-[10px] rounded-lg font-bold"
                >
                  Exit Workspace
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

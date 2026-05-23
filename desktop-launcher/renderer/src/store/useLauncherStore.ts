import { create } from "zustand";

interface GameState {
  id: string;
  title: string;
  status: "installed" | "downloading" | "paused" | "corrupted" | "uninstalled";
  progress?: number;
  downloadedBytes?: number;
  totalBytes?: number;
  isRunning?: boolean;
  isOwned?: boolean;
  downloadUrl?: string;
  usesChunkDistribution?: boolean;
  entrypoint?: string;
  coverUrl?: string;
  bannerUrl?: string;
  statusText?: string;
  platforms?: string[];
  playtime?: number;
  size?: number;
  lastPlayed?: number;
}

interface LauncherStore {
  games: Record<string, GameState>;
  selectedGameId: string | null;
  activePage: "library" | "store" | "developer" | "settings";
  isAuthenticated: boolean;
  user: any | null;
  authChecked: boolean;
  setGameState: (id: string, state: Partial<GameState>) => void;
  setSelectedGame: (id: string | null) => void;
  loadInstalledGames: () => Promise<void>;
  updateDownloadProgress: (data: any) => void;
  setRunningState: (id: string, isRunning: boolean) => void;
  setActivePage: (page: "library" | "store" | "developer" | "settings") => void;
  syncRemoteLibrary: () => Promise<void>;
  claimGame: (gameId: string) => Promise<void>;
  uninstallGame: (gameId: string) => Promise<void>;
  checkAuth: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// In a real app, declare global types for the injected API
declare global {
  interface Window {
    lazplayAPI: any;
  }
}

export const useLauncherStore = create<LauncherStore>((set, get) => ({
  games: {},
  selectedGameId: null,
  activePage: "store",
  isAuthenticated: false,
  user: null,
  authChecked: false,

  setSelectedGame: (id) => set({ selectedGameId: id }),

  setGameState: (id, state) =>
    set((prev) => ({
      games: {
        ...prev.games,
        [id]: { ...prev.games[id], ...state, id },
      },
    })),

  loadInstalledGames: async () => {
    if (window.lazplayAPI) {
      const installed = await window.lazplayAPI.getInstalledGames();
      const newGames = { ...get().games };
      installed.forEach((game: any) => {
        newGames[game.id] = { ...game, isRunning: false };
      });
      set({ games: newGames });

      const running = await window.lazplayAPI.getRunningGames();
      running.forEach((id: string) => {
        if (newGames[id]) newGames[id].isRunning = true;
      });
      set({ games: newGames });
    }
  },

  updateDownloadProgress: (data) => {
    set((prev) => {
      const existingGame = prev.games[data.gameId];
      const progress = (data.status === "paused" && existingGame) ? existingGame.progress : data.progress;
      const downloadedBytes = (data.status === "paused" && existingGame) ? existingGame.downloadedBytes : data.downloadedBytes;
      const totalBytes = (data.status === "paused" && existingGame) ? existingGame.totalBytes : data.totalBytes;
      return {
        games: {
          ...prev.games,
          [data.gameId]: {
            ...existingGame,
            id: data.gameId,
            status: data.status,
            progress,
            downloadedBytes,
            totalBytes,
          },
        },
      };
    });
  },

  setRunningState: (id, isRunning) => {
    set((prev) => ({
      games: {
        ...prev.games,
        [id]: { ...prev.games[id], isRunning },
      },
    }));
  },

  setActivePage: (page) => {
    set({ activePage: page });
    if (window.lazplayAPI) {
      if (page === "store") {
        window.lazplayAPI.setStoreVisibility(true);
      } else {
        window.lazplayAPI.setStoreVisibility(false);
      }
    }
  },

  syncRemoteLibrary: async () => {
    if (window.lazplayAPI) {
      const result = await window.lazplayAPI.syncRemoteLibrary();
      console.log("[LauncherStore] syncRemoteLibrary result:", result);

      if (!result.success) {
        throw new Error(result.error || "Library sync failed");
      }

      set((prev) => {
        const newGames = { ...prev.games };
        const ownedSet = new Set(result.ownedIds as string[]);

        result.allGames.forEach((item: any) => {
          const itemId = String(item.id);
          const isOwned = ownedSet.has(itemId);
          if (!newGames[itemId]) {
            newGames[itemId] = {
              id: itemId,
              title: item.title,
              status: "uninstalled",
              isOwned,
              downloadUrl: item.downloadUrl,
              usesChunkDistribution: item.usesChunkDistribution,
              entrypoint: item.entrypoint,
              coverUrl: item.coverUrl,
              bannerUrl: item.bannerUrl,
              platforms: item.platforms || [],
              playtime: item.playtime || 0,
              size: item.size || 0,
              lastPlayed: item.lastPlayed || undefined,
            };
          } else {
            newGames[itemId] = {
              ...newGames[itemId],
              title: item.title,
              isOwned,
              downloadUrl: item.downloadUrl,
              usesChunkDistribution: item.usesChunkDistribution,
              entrypoint: item.entrypoint,
              coverUrl: item.coverUrl,
              bannerUrl: item.bannerUrl,
              platforms: item.platforms || newGames[itemId].platforms || [],
              playtime: item.playtime || newGames[itemId].playtime || 0,
              size: item.size || newGames[itemId].size || 0,
              lastPlayed: item.lastPlayed || newGames[itemId].lastPlayed,
            };
          }
        });
        return { games: newGames };
      });
    }
  },

  claimGame: async (gameId) => {
    if (window.lazplayAPI) {
      const result = await window.lazplayAPI.claimGame(gameId);
      if (result.success) {
        set((prev) => ({
          games: {
            ...prev.games,
            [gameId]: { ...prev.games[gameId], isOwned: true },
          },
        }));
      }
    }
  },

  uninstallGame: async (gameId) => {
    if (window.lazplayAPI) {
      await window.lazplayAPI.uninstallGame(gameId);
      set((prev) => ({
        games: {
          ...prev.games,
          [gameId]: { ...prev.games[gameId], status: "uninstalled" },
        },
      }));
    }
  },

  checkAuth: async () => {
    if (window.lazplayAPI) {
      try {
        const result = await window.lazplayAPI.checkAuth();
        if (result.success) {
          set({
            isAuthenticated: true,
            user: result.user,
            authChecked: true,
          });
          // Authenticated! Now trigger library sync
          try {
            await get().syncRemoteLibrary();
          } catch (e) {
            console.error("Library sync failed during checkAuth:", e);
          }
        } else {
          set({
            isAuthenticated: false,
            user: null,
            authChecked: true,
          });
        }
      } catch (e) {
        console.error("checkAuth failed:", e);
        set({
          isAuthenticated: false,
          user: null,
          authChecked: true,
        });
      }
    } else {
      set({ authChecked: true });
    }
  },

  login: async (identifier, password) => {
    try {
      const response = await fetch("https://play.lazplay.tech/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || errData?.message || "Invalid credentials or login failed.");
      }

      const result = await response.json();
      const data = result.data || result;
      const token = data.accessToken || data.token;
      const refreshToken = data.refreshToken;
      const user = data.user;

      if (window.lazplayAPI) {
        // Save token to Electron SQLite, which will also inject it to storeView
        await window.lazplayAPI.saveSession(token, refreshToken);
      }

      set({
        isAuthenticated: true,
        user: user,
        authChecked: true,
      });

      // Synchronize library
      try {
        await get().syncRemoteLibrary();
      } catch (e) {
        console.error("Library sync failed after login:", e);
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      throw error;
    }
  },

  logout: async () => {
    if (window.lazplayAPI) {
      window.lazplayAPI.setStoreVisibility(false);
      await window.lazplayAPI.clearSession();
    }
    set({
      isAuthenticated: false,
      user: null,
      activePage: "store", // Reset default page to store
    });
  },
}));

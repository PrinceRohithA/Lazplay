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
  activePage: "library" | "store";
  setGameState: (id: string, state: Partial<GameState>) => void;
  setSelectedGame: (id: string | null) => void;
  loadInstalledGames: () => Promise<void>;
  updateDownloadProgress: (data: any) => void;
  setRunningState: (id: string, isRunning: boolean) => void;
  setActivePage: (page: "library" | "store") => void;
  syncRemoteLibrary: () => Promise<void>;
  claimGame: (gameId: string) => Promise<void>;
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
    set((prev) => ({
      games: {
        ...prev.games,
        [data.gameId]: {
          ...prev.games[data.gameId],
          id: data.gameId,
          status: data.status,
          progress: data.progress,
          downloadedBytes: data.downloadedBytes,
          totalBytes: data.totalBytes,
        },
      },
    }));
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
      window.lazplayAPI.setStoreVisibility(page === "store");
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
              entrypoint: item.entrypoint,
              coverUrl: item.coverUrl,
              bannerUrl: item.bannerUrl,
            };
          } else {
            newGames[itemId] = {
              ...newGames[itemId],
              title: item.title,
              isOwned,
              downloadUrl: item.downloadUrl,
              entrypoint: item.entrypoint,
              coverUrl: item.coverUrl,
              bannerUrl: item.bannerUrl,
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
}));

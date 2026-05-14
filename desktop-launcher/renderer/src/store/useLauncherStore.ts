import { create } from "zustand";

interface GameState {
  id: string;
  title: string;
  status: "installed" | "downloading" | "paused" | "corrupted" | "uninstalled";
  progress?: number;
  downloadedBytes?: number;
  totalBytes?: number;
  isRunning?: boolean;
}

interface LauncherStore {
  games: Record<string, GameState>;
  activePage: "library" | "store";
  setGameState: (id: string, state: Partial<GameState>) => void;
  loadInstalledGames: () => Promise<void>;
  updateDownloadProgress: (data: any) => void;
  setRunningState: (id: string, isRunning: boolean) => void;
  setActivePage: (page: "library" | "store") => void;
  syncRemoteLibrary: () => Promise<void>;
}

// In a real app, declare global types for the injected API
declare global {
  interface Window {
    lazplayAPI: any;
  }
}

export const useLauncherStore = create<LauncherStore>((set, get) => ({
  games: {},
  activePage: "store",

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
      if (result.success) {
        set((prev) => {
          const newGames = { ...prev.games };
          result.items.forEach((item: any) => {
            // Only add if not already present or if status is not 'installed'
            if (!newGames[item.id]) {
              newGames[item.id] = {
                id: item.id,
                title: item.title,
                status: "uninstalled",
              };
            }
          });
          return { games: newGames };
        });
      }
    }
  },
}));

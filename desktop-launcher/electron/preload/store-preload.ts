import { contextBridge, ipcRenderer } from "electron";

// This is the preload script injected into the external WebContentsView (https://play.lazplay.tech)
contextBridge.exposeInMainWorld("electron", {
  // Generic invoke for any IPC channel
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),

  // Explicit methods (convenience)
  installGame: (gameId: string, options?: any) => ipcRenderer.invoke("install-game", gameId, options),
  launchGame: (gameId: string) => ipcRenderer.invoke("launch-game", gameId),
  uninstallGame: (gameId: string) =>
    ipcRenderer.invoke("uninstall-game", gameId),

  pauseDownload: (gameId: string) =>
    ipcRenderer.invoke("pause-download", gameId),
  resumeDownload: (gameId: string) =>
    ipcRenderer.invoke("resume-download", gameId),
  openInstallFolder: (gameId: string) =>
    ipcRenderer.invoke("open-install-folder", gameId),

  // Provide token for native layer to use
  syncSession: (token: string, refreshToken: string) =>
    ipcRenderer.invoke("sync-session", { token, refreshToken }),

  // Listeners from desktop to web
  onDownloadProgress: (
    callback: (gameId: string, progress: number, status: string) => void,
  ) => {
    ipcRenderer.on("store-download-progress", (_event, data) =>
      callback(data.gameId, data.progress, data.status),
    );
  },
  onGameStateChange: (callback: (gameId: string, state: string) => void) => {
    ipcRenderer.on("store-game-state", (_event, data) =>
      callback(data.gameId, data.state),
    );
  },
});

import { contextBridge, ipcRenderer } from "electron";

// This is the preload script for the Native UI (Launcher Sidebar, etc.)
contextBridge.exposeInMainWorld("lazplayAPI", {
  // Game operations
  installGame: (gameId: string, options?: any) => ipcRenderer.invoke("install-game", gameId, options),
  launchGame: (gameId: string) => ipcRenderer.invoke("launch-game", gameId),
  uninstallGame: (gameId: string) =>
    ipcRenderer.invoke("uninstall-game", gameId),
  setGameEntrypoint: (gameId: string, entrypoint: string) =>
    ipcRenderer.invoke("set-game-entrypoint", gameId, entrypoint),

  // Download operations
  pauseDownload: (gameId: string) =>
    ipcRenderer.invoke("pause-download", gameId),
  resumeDownload: (gameId: string) =>
    ipcRenderer.invoke("resume-download", gameId),
  getDownloadProgress: (gameId: string) =>
    ipcRenderer.invoke("get-download-progress", gameId),

  // Status and System
  getInstalledGames: () => ipcRenderer.invoke("get-installed-games"),
  getRunningGames: () => ipcRenderer.invoke("get-running-games"),
  getDiskUsage: () => ipcRenderer.invoke("get-disk-usage"),
  openInstallFolder: (gameId: string) =>
    ipcRenderer.invoke("open-install-folder", gameId),
  setStoreVisibility: (visible: boolean) =>
    ipcRenderer.invoke("set-store-visibility", visible),
  navigateStorePath: (path: string) =>
    ipcRenderer.invoke("navigate-store-path", path),
  syncRemoteLibrary: () => ipcRenderer.invoke("sync-remote-library"),
  claimGame: (gameId: string) => ipcRenderer.invoke("claim-game", gameId),

  // Auth Operations
  checkAuth: () => ipcRenderer.invoke("check-auth"),
  getAccessToken: () => ipcRenderer.invoke("get-access-token"),
  saveSession: (token: string, refreshToken: string) =>
    ipcRenderer.invoke("sync-session", { token, refreshToken }),
  clearSession: () => ipcRenderer.invoke("clear-session"),

  // UI Communications
  onDeepLink: (callback: (url: string) => void) => {
    ipcRenderer.on("deep-link", (_event, url) => callback(url));
  },
  onDownloadProgress: (callback: (data: any) => void) => {
    ipcRenderer.on("download-progress", (_event, data) => callback(data));
  },
  onGameStateChange: (callback: (data: any) => void) => {
    ipcRenderer.on("game-state-change", (_event, data) => callback(data));
  },
  onRequestEntrypoint: (callback: (data: any) => void) => {
    ipcRenderer.on("request-entrypoint", (_event, data) => callback(data));
  },
  onSessionUpdated: (callback: (data: any) => void) => {
    ipcRenderer.on("session-updated", (_event, data) => callback(data));
  },
});

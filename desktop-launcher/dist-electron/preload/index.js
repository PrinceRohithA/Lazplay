"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("lazplayAPI", {
  // Game operations
  installGame: (gameId, options) => electron.ipcRenderer.invoke("install-game", gameId, options),
  launchGame: (gameId) => electron.ipcRenderer.invoke("launch-game", gameId),
  uninstallGame: (gameId) => electron.ipcRenderer.invoke("uninstall-game", gameId),
  setGameEntrypoint: (gameId, entrypoint) => electron.ipcRenderer.invoke("set-game-entrypoint", gameId, entrypoint),
  // Download operations
  pauseDownload: (gameId) => electron.ipcRenderer.invoke("pause-download", gameId),
  resumeDownload: (gameId) => electron.ipcRenderer.invoke("resume-download", gameId),
  getDownloadProgress: (gameId) => electron.ipcRenderer.invoke("get-download-progress", gameId),
  // Status and System
  getInstalledGames: () => electron.ipcRenderer.invoke("get-installed-games"),
  getRunningGames: () => electron.ipcRenderer.invoke("get-running-games"),
  getDiskUsage: () => electron.ipcRenderer.invoke("get-disk-usage"),
  openInstallFolder: (gameId) => electron.ipcRenderer.invoke("open-install-folder", gameId),
  setStoreVisibility: (visible) => electron.ipcRenderer.invoke("set-store-visibility", visible),
  navigateStorePath: (path) => electron.ipcRenderer.invoke("navigate-store-path", path),
  syncRemoteLibrary: () => electron.ipcRenderer.invoke("sync-remote-library"),
  claimGame: (gameId) => electron.ipcRenderer.invoke("claim-game", gameId),
  // Auth Operations
  checkAuth: () => electron.ipcRenderer.invoke("check-auth"),
  getAccessToken: () => electron.ipcRenderer.invoke("get-access-token"),
  saveSession: (token, refreshToken) => electron.ipcRenderer.invoke("sync-session", { token, refreshToken }),
  clearSession: () => electron.ipcRenderer.invoke("clear-session"),
  // UI Communications
  onDeepLink: (callback) => {
    electron.ipcRenderer.on("deep-link", (_event, url) => callback(url));
  },
  onDownloadProgress: (callback) => {
    electron.ipcRenderer.on("download-progress", (_event, data) => callback(data));
  },
  onGameStateChange: (callback) => {
    electron.ipcRenderer.on("game-state-change", (_event, data) => callback(data));
  },
  onRequestEntrypoint: (callback) => {
    electron.ipcRenderer.on("request-entrypoint", (_event, data) => callback(data));
  },
  onSessionUpdated: (callback) => {
    electron.ipcRenderer.on("session-updated", (_event, data) => callback(data));
  },
  // Creator Workspace Chunked Upload pipeline
  selectFolder: () => electron.ipcRenderer.invoke("select-folder"),
  uploadBuildDirectory: (params) => electron.ipcRenderer.invoke("upload-build-directory", params),
  onUploadProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    electron.ipcRenderer.on("upload-progress", handler);
    return () => electron.ipcRenderer.removeListener("upload-progress", handler);
  }
});

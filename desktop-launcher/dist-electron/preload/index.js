"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("lazplayAPI", {
  // Game operations
  installGame: (gameId) => electron.ipcRenderer.invoke("install-game", gameId),
  launchGame: (gameId) => electron.ipcRenderer.invoke("launch-game", gameId),
  uninstallGame: (gameId) => electron.ipcRenderer.invoke("uninstall-game", gameId),
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
  syncRemoteLibrary: () => electron.ipcRenderer.invoke("sync-remote-library"),
  claimGame: (gameId) => electron.ipcRenderer.invoke("claim-game", gameId),
  // UI Communications
  onDeepLink: (callback) => {
    electron.ipcRenderer.on("deep-link", (_event, url) => callback(url));
  },
  onDownloadProgress: (callback) => {
    electron.ipcRenderer.on("download-progress", (_event, data) => callback(data));
  },
  onGameStateChange: (callback) => {
    electron.ipcRenderer.on("game-state-change", (_event, data) => callback(data));
  }
});

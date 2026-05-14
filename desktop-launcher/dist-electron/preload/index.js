"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// This is the preload script for the Native UI (Launcher Sidebar, etc.)
electron_1.contextBridge.exposeInMainWorld("lazplayAPI", {
    // Game operations
    installGame: (gameId, options) => electron_1.ipcRenderer.invoke("install-game", gameId, options),
    launchGame: (gameId) => electron_1.ipcRenderer.invoke("launch-game", gameId),
    uninstallGame: (gameId) => electron_1.ipcRenderer.invoke("uninstall-game", gameId),
    setGameEntrypoint: (gameId, entrypoint) => electron_1.ipcRenderer.invoke("set-game-entrypoint", gameId, entrypoint),
    // Download operations
    pauseDownload: (gameId) => electron_1.ipcRenderer.invoke("pause-download", gameId),
    resumeDownload: (gameId) => electron_1.ipcRenderer.invoke("resume-download", gameId),
    getDownloadProgress: (gameId) => electron_1.ipcRenderer.invoke("get-download-progress", gameId),
    // Status and System
    getInstalledGames: () => electron_1.ipcRenderer.invoke("get-installed-games"),
    getRunningGames: () => electron_1.ipcRenderer.invoke("get-running-games"),
    getDiskUsage: () => electron_1.ipcRenderer.invoke("get-disk-usage"),
    openInstallFolder: (gameId) => electron_1.ipcRenderer.invoke("open-install-folder", gameId),
    setStoreVisibility: (visible) => electron_1.ipcRenderer.invoke("set-store-visibility", visible),
    syncRemoteLibrary: () => electron_1.ipcRenderer.invoke("sync-remote-library"),
    claimGame: (gameId) => electron_1.ipcRenderer.invoke("claim-game", gameId),
    // UI Communications
    onDeepLink: (callback) => {
        electron_1.ipcRenderer.on("deep-link", (_event, url) => callback(url));
    },
    onDownloadProgress: (callback) => {
        electron_1.ipcRenderer.on("download-progress", (_event, data) => callback(data));
    },
    onGameStateChange: (callback) => {
        electron_1.ipcRenderer.on("game-state-change", (_event, data) => callback(data));
    },
    onRequestEntrypoint: (callback) => {
        electron_1.ipcRenderer.on("request-entrypoint", (_event, data) => callback(data));
    },
    onSessionUpdated: (callback) => {
        electron_1.ipcRenderer.on("session-updated", (_event, data) => callback(data));
    },
});

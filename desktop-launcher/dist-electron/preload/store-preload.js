"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// This is the preload script injected into the external WebContentsView (https://play.lazplay.tech)
electron_1.contextBridge.exposeInMainWorld("electron", {
    // Generic invoke for any IPC channel
    invoke: (channel, ...args) => electron_1.ipcRenderer.invoke(channel, ...args),
    // Explicit methods (convenience)
    installGame: (gameId, options) => electron_1.ipcRenderer.invoke("install-game", gameId, options),
    launchGame: (gameId) => electron_1.ipcRenderer.invoke("launch-game", gameId),
    uninstallGame: (gameId) => electron_1.ipcRenderer.invoke("uninstall-game", gameId),
    pauseDownload: (gameId) => electron_1.ipcRenderer.invoke("pause-download", gameId),
    resumeDownload: (gameId) => electron_1.ipcRenderer.invoke("resume-download", gameId),
    openInstallFolder: (gameId) => electron_1.ipcRenderer.invoke("open-install-folder", gameId),
    // Provide token for native layer to use
    syncSession: (token, refreshToken) => electron_1.ipcRenderer.invoke("sync-session", { token, refreshToken }),
    // Listeners from desktop to web
    onDownloadProgress: (callback) => {
        electron_1.ipcRenderer.on("store-download-progress", (_event, data) => callback(data.gameId, data.progress, data.status));
    },
    onGameStateChange: (callback) => {
        electron_1.ipcRenderer.on("store-game-state", (_event, data) => callback(data.gameId, data.state));
    },
});

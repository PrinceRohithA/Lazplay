"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = require("path");
const handlers_1 = require("../ipc/handlers");
const db_1 = require("../storage/db");
const auto_updater_1 = require("../updater/auto-updater");
const electron_log_1 = __importDefault(require("electron-log"));
// Configure logger
electron_log_1.default.transports.file.resolvePathFn = () => (0, path_1.join)(electron_1.app.getPath("userData"), "logs/launcher.log");
electron_log_1.default.transports.console.level = "info";
electron_log_1.default.info("Starting LazPlay Launcher...");
process.on("uncaughtException", (err) => {
    electron_log_1.default.error("Uncaught Exception:", err);
});
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
let mainWindow = null;
let storeView = null;
const STORE_URL = "https://play.lazplay.tech";
function createWindow() {
    // Initialize storage first to ensure SQLite is ready
    try {
        (0, db_1.initStorage)();
        electron_log_1.default.info("Storage initialized");
    }
    catch (err) {
        electron_log_1.default.error("Failed to initialize storage:", err);
    }
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 768,
        title: "LazPlay Launcher",
        webPreferences: {
            preload: (0, path_1.join)(__dirname, "../preload/index.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        // Customize titlebar later if needed
    });
    mainWindow.setMenu(null);
    // Setup security restrictions
    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        // Deny most permissions by default
        const allowedPermissions = ["fullscreen"];
        if (allowedPermissions.includes(permission)) {
            callback(true);
        }
        else {
            callback(false);
        }
    });
    mainWindow.webContents.setWindowOpenHandler((details) => {
        // Open external links in default browser
        electron_1.shell.openExternal(details.url);
        return { action: "deny" };
    });
    // Load the React app (Launcher UI)
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        // mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile((0, path_1.join)(__dirname, "../../dist/index.html"));
    }
    // Set up the Storefront View using WebContentsView (replaces BrowserView)
    storeView = new electron_1.WebContentsView({
        webPreferences: {
            preload: (0, path_1.join)(__dirname, "../preload/store-preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
        },
    });
    // Inject session tokens on dom-ready
    storeView.webContents.on("dom-ready", () => {
        try {
            const { token, refreshToken } = db_1.db.getTokens();
            if (token) {
                electron_log_1.default.info("dom-ready: Injecting tokens into storeView localStorage");
                storeView?.webContents.executeJavaScript(`
          localStorage.setItem('accessToken', ${JSON.stringify(token)});
          localStorage.setItem('refreshToken', ${JSON.stringify(refreshToken || '')});
          window.dispatchEvent(new Event('storage'));
        `).catch(err => electron_log_1.default.error("Failed to inject tokens in dom-ready:", err));
            }
        }
        catch (e) {
            electron_log_1.default.error("Error retrieving tokens on dom-ready:", e);
        }
    });
    // Navigate to store
    storeView.webContents.loadURL(STORE_URL);
    // Position the store view (leave space for sidebar/header if any)
    // This will be dynamic in real app, listening to resize events
    storeView.setBounds({ x: 0, y: 0, width: 1280, height: 800 - 80 });
    mainWindow.on("resize", () => {
        if (mainWindow && storeView) {
            const bounds = mainWindow.getContentBounds();
            storeView.setBounds({
                x: 0,
                y: 0,
                width: bounds.width,
                height: bounds.height - 80,
            });
        }
    });
    // Initialize modules
    try {
        (0, handlers_1.setupIpcHandlers)(mainWindow, storeView);
        electron_log_1.default.info("IPC Handlers initialized");
    }
    catch (err) {
        electron_log_1.default.error("Failed to setup IPC handlers:", err);
    }
    try {
        (0, auto_updater_1.initAutoUpdater)(mainWindow);
        electron_log_1.default.info("Auto-updater initialized");
    }
    catch (err) {
        electron_log_1.default.error("Failed to initialize auto-updater:", err);
    }
}
electron_1.app.whenReady().then(() => {
    // Deep linking setup
    if (process.defaultApp) {
        if (process.argv.length >= 2) {
            electron_1.app.setAsDefaultProtocolClient("lazplay", process.execPath, [
                (0, path_1.resolve)(process.argv[1]),
            ]);
        }
    }
    else {
        electron_1.app.setAsDefaultProtocolClient("lazplay");
    }
    createWindow();
    electron_1.app.on("activate", () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
// Deep link handler
electron_1.app.on("open-url", (event, url) => {
    event.preventDefault();
    electron_log_1.default.info(`Deep link received: ${url}`);
    if (mainWindow) {
        if (mainWindow.isMinimized())
            mainWindow.restore();
        mainWindow.focus();
        // Handle specific routes
        mainWindow.webContents.send("deep-link", url);
    }
});
// Enforce single instance
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on("second-instance", (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
        const url = commandLine.pop();
        if (url && url.startsWith("lazplay://")) {
            mainWindow?.webContents.send("deep-link", url);
        }
    });
}

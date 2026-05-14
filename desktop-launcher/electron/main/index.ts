import { app, BrowserWindow, shell, ipcMain, WebContentsView } from "electron";
import { join, resolve } from "path";
import { setupIpcHandlers } from "../ipc/handlers";
import { initStorage } from "../storage/db";
import { initAutoUpdater } from "../updater/auto-updater";
import log from "electron-log";

// Configure logger
log.transports.file.resolvePathFn = () =>
  join(app.getPath("userData"), "logs/launcher.log");
log.transports.console.level = "info";

log.info("Starting LazPlay Launcher...");

process.on("uncaughtException", (err) => {
  log.error("Uncaught Exception:", err);
});

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

let mainWindow: BrowserWindow | null = null;
let storeView: WebContentsView | null = null;

const STORE_URL = "https://play.lazplay.tech";

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: "LazPlay Launcher",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    // Customize titlebar later if needed
  });

  // Setup security restrictions
  mainWindow.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      // Deny most permissions by default
      const allowedPermissions = ["fullscreen"];
      if (allowedPermissions.includes(permission)) {
        callback(true);
      } else {
        callback(false);
      }
    },
  );

  mainWindow.webContents.setWindowOpenHandler((details) => {
    // Open external links in default browser
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // Load the React app (Launcher UI)
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, "../../dist/index.html"));
  }

  // Set up the Storefront View using WebContentsView (replaces BrowserView)
  storeView = new WebContentsView({
    webPreferences: {
      preload: join(__dirname, "../preload/store-preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Attach the view to the window
  mainWindow.contentView.addChildView(storeView);

  // Navigate to store
  storeView.webContents.loadURL(STORE_URL);

  // Position the store view (leave space for sidebar/header if any)
  // This will be dynamic in real app, listening to resize events
  storeView.setBounds({ x: 250, y: 0, width: 1030, height: 800 });

  mainWindow.on("resize", () => {
    if (mainWindow && storeView) {
      const bounds = mainWindow.getContentBounds();
      storeView.setBounds({
        x: 250,
        y: 0,
        width: bounds.width - 250,
        height: bounds.height,
      });
    }
  });

  // Initialize modules
  try {
    initStorage();
    log.info("Storage initialized");
  } catch (err) {
    log.error("Failed to initialize storage:", err);
  }

  try {
    setupIpcHandlers(mainWindow, storeView);
    log.info("IPC Handlers initialized");
  } catch (err) {
    log.error("Failed to setup IPC handlers:", err);
  }

  try {
    initAutoUpdater(mainWindow);
    log.info("Auto-updater initialized");
  } catch (err) {
    log.error("Failed to initialize auto-updater:", err);
  }
}

app.whenReady().then(() => {
  // Deep linking setup
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient("lazplay", process.execPath, [
        resolve(process.argv[1]),
      ]);
    }
  } else {
    app.setAsDefaultProtocolClient("lazplay");
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Deep link handler
app.on("open-url", (event, url) => {
  event.preventDefault();
  log.info(`Deep link received: ${url}`);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    // Handle specific routes
    mainWindow.webContents.send("deep-link", url);
  }
});

// Enforce single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const url = commandLine.pop();
    if (url && url.startsWith("lazplay://")) {
      mainWindow?.webContents.send("deep-link", url);
    }
  });
}

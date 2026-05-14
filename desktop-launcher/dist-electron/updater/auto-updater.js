"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAutoUpdater = initAutoUpdater;
const electron_updater_1 = require("electron-updater");
const electron_log_1 = __importDefault(require("electron-log"));
function initAutoUpdater(mainWindow) {
    electron_updater_1.autoUpdater.logger = electron_log_1.default;
    electron_updater_1.autoUpdater.logger.transports.file.level = "info";
    electron_updater_1.autoUpdater.on("checking-for-update", () => {
        electron_log_1.default.info("Checking for update...");
    });
    electron_updater_1.autoUpdater.on("update-available", (info) => {
        electron_log_1.default.info("Update available.");
        mainWindow.webContents.send("update-available", info);
    });
    electron_updater_1.autoUpdater.on("update-not-available", (info) => {
        electron_log_1.default.info("Update not available.");
    });
    electron_updater_1.autoUpdater.on("error", (err) => {
        electron_log_1.default.error("Error in auto-updater. " + err);
    });
    electron_updater_1.autoUpdater.on("download-progress", (progressObj) => {
        let log_message = "Download speed: " + progressObj.bytesPerSecond;
        log_message = log_message + " - Downloaded " + progressObj.percent + "%";
        log_message =
            log_message +
                " (" +
                progressObj.transferred +
                "/" +
                progressObj.total +
                ")";
        electron_log_1.default.info(log_message);
        mainWindow.webContents.send("update-progress", progressObj);
    });
    electron_updater_1.autoUpdater.on("update-downloaded", (info) => {
        electron_log_1.default.info("Update downloaded");
        mainWindow.webContents.send("update-downloaded", info);
        // Silent update install on quit
        electron_updater_1.autoUpdater.quitAndInstall();
    });
    // Check for updates every hour
    electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
    setInterval(() => {
        electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
    }, 1000 * 60 * 60);
}

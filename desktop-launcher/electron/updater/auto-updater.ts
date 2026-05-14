import { autoUpdater } from "electron-updater";
import { BrowserWindow } from "electron";
import log from "electron-log";

export function initAutoUpdater(mainWindow: BrowserWindow) {
  autoUpdater.logger = log;
  (autoUpdater.logger as any).transports.file.level = "info";

  autoUpdater.on("checking-for-update", () => {
    log.info("Checking for update...");
  });

  autoUpdater.on("update-available", (info) => {
    log.info("Update available.");
    mainWindow.webContents.send("update-available", info);
  });

  autoUpdater.on("update-not-available", (info) => {
    log.info("Update not available.");
  });

  autoUpdater.on("error", (err) => {
    log.error("Error in auto-updater. " + err);
  });

  autoUpdater.on("download-progress", (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + " - Downloaded " + progressObj.percent + "%";
    log_message =
      log_message +
      " (" +
      progressObj.transferred +
      "/" +
      progressObj.total +
      ")";
    log.info(log_message);
    mainWindow.webContents.send("update-progress", progressObj);
  });

  autoUpdater.on("update-downloaded", (info) => {
    log.info("Update downloaded");
    mainWindow.webContents.send("update-downloaded", info);
    // Silent update install on quit
    autoUpdater.quitAndInstall();
  });

  // Check for updates every hour
  autoUpdater.checkForUpdatesAndNotify();
  setInterval(
    () => {
      autoUpdater.checkForUpdatesAndNotify();
    },
    1000 * 60 * 60,
  );
}

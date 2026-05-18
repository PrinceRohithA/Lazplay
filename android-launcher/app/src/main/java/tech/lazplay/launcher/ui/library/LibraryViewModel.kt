package tech.lazplay.launcher.ui.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import tech.lazplay.launcher.data.ServiceLocator
import tech.lazplay.launcher.data.api.isAndroidGame
import tech.lazplay.launcher.data.api.isWebOnly
import tech.lazplay.launcher.data.api.resolvedGameId
import tech.lazplay.launcher.data.local.InstalledGameEntity
import tech.lazplay.launcher.download.ApkDownloadService
import tech.lazplay.launcher.download.ApkInstaller

class LibraryViewModel : ViewModel() {
    private val api = ServiceLocator.api
    private val dao = ServiceLocator.database.installedGameDao()
    private val downloadRepo = ServiceLocator.downloadRepository
    private val installer = ServiceLocator.apkInstaller

    val games = dao.observeAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    var lastError: String? = null
        private set

    fun refresh() {
        viewModelScope.launch {
            try {
                downloadRepo.verifyInstallAndApkStates()
                val items = api.library()
                    .filter { !it.isWebOnly() && it.isAndroidGame() }
                downloadRepo.syncLibraryToCache(items)
                downloadRepo.verifyInstallAndApkStates()
                lastError = null
            } catch (e: Exception) {
                lastError = e.message
            }
        }
    }

    fun deleteGame(game: InstalledGameEntity) {
        viewModelScope.launch {
            // Also delete the temporary unscrambled APK file (temp_install.apk) if it exists
            try {
                val downloadDir = java.io.File(ServiceLocator.requireContext().filesDir, "downloads")
                val tempFile = java.io.File(downloadDir, "temp_install.apk")
                if (tempFile.exists()) {
                    tempFile.delete()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }

            // 2. Trigger native app uninstallation dialog if installed
            val context = ServiceLocator.requireContext()
            var pkg = game.packageName
            if (pkg.isNullOrBlank()) {
                pkg = try {
                    val pm = context.packageManager
                    val apps = pm.getInstalledApplications(0)
                    var found: String? = null
                    for (app in apps) {
                        val label = pm.getApplicationLabel(app).toString()
                        if (label.equals(game.title, ignoreCase = true)) {
                            found = app.packageName
                            break
                        }
                    }
                    found
                } catch (e: Exception) {
                    null
                }
            }

            val isInstalled = pkg?.let {
                try {
                    context.packageManager.getPackageInfo(it, 0)
                    true
                } catch (e: Exception) {
                    false
                }
            } ?: false

            if (isInstalled && pkg != null) {
                // Game is installed. Prompt uninstallation and preserve the cache file!
                val intent = android.content.Intent(android.content.Intent.ACTION_DELETE).apply {
                    data = android.net.Uri.parse("package:$pkg")
                    addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)

                // Preserve the apkPath in the database so the card returns to the INSTALL stage!
                dao.upsert(game.copy(
                    packageName = pkg
                ))
            } else {
                // Game is not installed on the system (it's in the INSTALL stage).
                // Delete the physical .lazplay_locked cache file from disk to free up space!
                game.apkPath?.let { path ->
                    try {
                        val file = java.io.File(path)
                        if (file.exists()) {
                            file.delete()
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }

                // Reset back to READY
                dao.upsert(game.copy(
                    status = tech.lazplay.launcher.data.local.GameInstallStatus.READY.name,
                    progress = 0,
                    apkPath = null
                ))
            }

            // 4. Force a status sync refresh
            downloadRepo.verifyInstallAndApkStates()
        }
    }

    fun download(game: InstalledGameEntity) {
        val ctx = ServiceLocator.requireContext()
        ApkDownloadService.start(ctx, game.gameId, game.title)
    }

    fun installDownloaded(game: InstalledGameEntity) {
        val file = downloadRepo.prepareApkForInstall(game) ?: return
        if (!file.exists()) return
        if (!installer.canRequestPackageInstalls()) {
            installer.openInstallPermissionSettings()
            return
        }
        installer.promptInstall(file)
    }

    fun openWebGame(url: String) {
        val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url))
        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
        ServiceLocator.requireContext().startActivity(intent)
    }
}

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
                val items = api.library()
                    .filter { !it.isWebOnly() && it.isAndroidGame() }
                downloadRepo.syncLibraryToCache(items)
                lastError = null
            } catch (e: Exception) {
                lastError = e.message
            }
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

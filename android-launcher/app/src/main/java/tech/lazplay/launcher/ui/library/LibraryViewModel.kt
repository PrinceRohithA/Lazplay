package tech.lazplay.launcher.ui.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import tech.lazplay.launcher.data.ServiceLocator
import tech.lazplay.launcher.data.api.ApiException
import tech.lazplay.launcher.data.api.isAndroidGame
import tech.lazplay.launcher.data.api.isWebOnly
import tech.lazplay.launcher.data.api.resolvedGameId
import tech.lazplay.launcher.data.local.InstalledGameEntity
import tech.lazplay.launcher.download.ApkDownloadService
import tech.lazplay.launcher.download.ApkInstaller

sealed interface LibraryUiState {
    object Loading : LibraryUiState
    object NotLoggedIn : LibraryUiState
    data class Error(val message: String) : LibraryUiState
    object Success : LibraryUiState
}

class LibraryViewModel : ViewModel() {
    private val api = ServiceLocator.api
    private val dao = ServiceLocator.database.installedGameDao()
    private val downloadRepo = ServiceLocator.downloadRepository
    private val installer = ServiceLocator.apkInstaller

    // Always observe the full local DB — no session guard here (handled by uiState)
    val games: StateFlow<List<InstalledGameEntity>> = dao.observeAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _uiState = MutableStateFlow<LibraryUiState>(LibraryUiState.Loading)
    val uiState: StateFlow<LibraryUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        if (!ServiceLocator.tokenStore.hasSession()) {
            _uiState.value = LibraryUiState.NotLoggedIn
            return
        }

        _uiState.value = LibraryUiState.Loading

        viewModelScope.launch {
            try {
                // 1. Verify local states first so the list is correct before network
                downloadRepo.verifyInstallAndApkStates()

                // 2. Fetch library — try token refresh once on 401
                val items = try {
                    api.library()
                        .filter { !it.isWebOnly() && it.isAndroidGame() }
                } catch (e: ApiException) {
                    if (e.message?.contains("401") == true || e.message?.contains("SESSION") == true) {
                        // Try token refresh
                        val refreshed = api.tryRefresh()
                        if (refreshed) {
                            api.library().filter { !it.isWebOnly() && it.isAndroidGame() }
                        } else {
                            // Refresh failed — session truly expired, don't wipe local data
                            _uiState.value = LibraryUiState.Error("Session expired. Please log in again.")
                            return@launch
                        }
                    } else {
                        throw e
                    }
                }

                // 3. Only sync to cache if we actually got data (don't wipe on empty responses)
                if (items.isNotEmpty()) {
                    downloadRepo.syncLibraryToCache(items)
                }

                // 4. Re-verify states after sync
                downloadRepo.verifyInstallAndApkStates()
                _uiState.value = LibraryUiState.Success
            } catch (e: Exception) {
                val msg = e.message ?: "Unknown error"
                // If we have cached data, show success but log the error
                val cached = dao.getAll()
                if (cached.isNotEmpty()) {
                    _uiState.value = LibraryUiState.Success
                } else {
                    _uiState.value = LibraryUiState.Error(msg)
                }
            }
        }
    }

    fun deleteGame(game: InstalledGameEntity) {
        viewModelScope.launch {
            // Delete the temporary unscrambled APK file if it exists
            try {
                val downloadDir = java.io.File(ServiceLocator.requireContext().filesDir, "downloads")
                val tempFile = java.io.File(downloadDir, "temp_install.apk")
                if (tempFile.exists()) tempFile.delete()
            } catch (e: Exception) {
                e.printStackTrace()
            }

            // Trigger native app uninstallation dialog if installed
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
                val intent = android.content.Intent(android.content.Intent.ACTION_DELETE).apply {
                    data = android.net.Uri.parse("package:$pkg")
                    addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                dao.upsert(game.copy(packageName = pkg))
            } else {
                // Delete both the final locked APK and any partial/temporary download files
                val downloadDir = java.io.File(context.filesDir, "downloads")
                val partialFile = java.io.File(downloadDir, "${game.gameId}.apk.partial")
                val finalFile = java.io.File(downloadDir, "${game.gameId}.apk")

                try {
                    if (partialFile.exists()) partialFile.delete()
                    if (finalFile.exists()) finalFile.delete()
                } catch (e: Exception) {
                    e.printStackTrace()
                }

                game.apkPath?.let { path ->
                    try {
                        val file = java.io.File(path)
                        if (file.exists()) file.delete()
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
                dao.upsert(game.copy(
                    status = tech.lazplay.launcher.data.local.GameInstallStatus.READY.name,
                    progress = 0,
                    apkPath = null
                ))
            }
            downloadRepo.verifyInstallAndApkStates()
        }
    }

    fun download(game: InstalledGameEntity) {
        val ctx = ServiceLocator.requireContext()
        ApkDownloadService.start(ctx, game.gameId, game.title)
    }

    fun pause(game: InstalledGameEntity) {
        val ctx = ServiceLocator.requireContext()
        val intent = android.content.Intent(ctx, ApkDownloadService::class.java).apply {
            action = ApkDownloadService.ACTION_PAUSE_DOWNLOAD
            putExtra(ApkDownloadService.EXTRA_GAME_ID, game.gameId)
            putExtra(ApkDownloadService.EXTRA_TITLE, game.title)
        }
        ctx.startForegroundService(intent)
    }

    fun resume(game: InstalledGameEntity) {
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

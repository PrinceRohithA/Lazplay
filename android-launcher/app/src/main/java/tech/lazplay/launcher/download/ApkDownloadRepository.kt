package tech.lazplay.launcher.download

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.isActive
import okhttp3.OkHttpClient
import okhttp3.Request
import tech.lazplay.launcher.data.api.ApiException
import tech.lazplay.launcher.data.api.LazPlayApi
import tech.lazplay.launcher.data.api.LibraryItemDto
import tech.lazplay.launcher.data.api.resolvedGameId
import tech.lazplay.launcher.data.local.GameDatabase
import tech.lazplay.launcher.data.local.GameInstallStatus
import tech.lazplay.launcher.data.local.InstalledGameEntity
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

class ApkDownloadRepository(
    private val context: Context,
    private val api: LazPlayApi,
    database: GameDatabase,
) {
    private val dao = database.installedGameDao()
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(300, TimeUnit.SECONDS)
        .build()

    private val downloadDir: File
        get() = File(context.filesDir, "downloads").also { it.mkdirs() }

    init {
        try {
            val tempFile = File(downloadDir, "temp_install.apk")
            if (tempFile.exists()) {
                tempFile.delete()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun scrambleFile(file: File) {
        try {
            if (!file.exists() || file.length() < 1024) return
            java.io.RandomAccessFile(file, "rw").use { raf ->
                val buffer = ByteArray(1024)
                raf.seek(0)
                val read = raf.read(buffer)
                if (read > 0) {
                    for (i in 0 until read) {
                        buffer[i] = (buffer[i].toInt() xor 0x42).toByte()
                    }
                    raf.seek(0)
                    raf.write(buffer, 0, read)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun prepareApkForInstall(game: InstalledGameEntity): File? {
        val path = game.apkPath ?: return null
        val lockedFile = File(path)
        if (!lockedFile.exists()) return null
        
        if (lockedFile.name.endsWith(".lazplay_locked")) {
            val tempFile = File(lockedFile.parentFile, "temp_install.apk")
            try {
                if (tempFile.exists()) {
                    tempFile.delete()
                }
                lockedFile.inputStream().use { input ->
                    tempFile.outputStream().use { output ->
                        input.copyTo(output)
                    }
                }
                scrambleFile(tempFile)
                return tempFile
            } catch (e: Exception) {
                e.printStackTrace()
                return null
            }
        }
        return lockedFile
    }

    suspend fun syncLibraryToCache(items: List<LibraryItemDto>) {
        for (item in items) {
            val gameId = item.resolvedGameId()
            if (gameId.isBlank()) continue
            val existing = dao.get(gameId)
            dao.upsert(
                (existing ?: InstalledGameEntity(
                    gameId = gameId,
                    title = item.title ?: gameId,
                    version = item.version,
                    downloadUrl = item.downloadUrl,
                    coverUrl = item.coverUrl ?: item.heroBannerUrl ?: item.heroImageUrl,
                    entrypoint = item.entrypoint,
                    apkPath = null,
                    packageName = null,
                    status = GameInstallStatus.READY.name,
                )).copy(
                    title = item.title ?: existing?.title ?: gameId,
                    version = item.version ?: existing?.version,
                    downloadUrl = item.downloadUrl ?: existing?.downloadUrl,
                    coverUrl = item.coverUrl ?: item.heroBannerUrl ?: item.heroImageUrl ?: existing?.coverUrl,
                    entrypoint = item.entrypoint ?: existing?.entrypoint,
                    fileSizeBytes = item.size ?: existing?.fileSizeBytes ?: 0L,
                ),
            )
        }
    }

    suspend fun downloadApk(
        gameId: String,
        onProgress: (Int) -> Unit,
    ): File = withContext(Dispatchers.IO) {
        val row = dao.get(gameId) ?: throw ApiException("Game not in library cache")
        val url = row.downloadUrl ?: throw ApiException("No download URL for this game")

        val dest = File(downloadDir, "$gameId.apk")
        val partial = File(downloadDir, "$gameId.apk.partial")

        dao.upsert(row.copy(status = GameInstallStatus.DOWNLOADING.name, progress = 0))

        var attempts = 0
        val maxAttempts = 3
        var success = false
        var exception: Exception? = null

        while (attempts < maxAttempts && !success) {
            attempts++
            try {
                val existingBytes = if (partial.exists()) partial.length() else 0L
                val requestBuilder = Request.Builder().url(url)
                if (existingBytes > 0) {
                    requestBuilder.header("Range", "bytes=$existingBytes-")
                }
                val request = requestBuilder.get().build()

                client.newCall(request).execute().use { response ->
                    if (response.code != 200 && response.code != 206) {
                        throw ApiException("Download failed: HTTP ${response.code}")
                    }

                    val isPartial = response.code == 206
                    val body = response.body ?: throw ApiException("Empty download body")

                    var totalSize = row.fileSizeBytes
                    if (totalSize <= 0L) {
                        totalSize = body.contentLength() + if (isPartial) existingBytes else 0L
                    }

                    var downloaded = if (isPartial) existingBytes else 0L
                    val appendMode = isPartial && existingBytes > 0

                    java.io.FileOutputStream(partial, appendMode).use { out ->
                        body.byteStream().use { input ->
                            val buffer = ByteArray(8192)
                            while (true) {
                                if (!isActive) {
                                    throw kotlinx.coroutines.CancellationException("Download cancelled")
                                }

                                val read = input.read(buffer)
                                if (read <= 0) break
                                out.write(buffer, 0, read)
                                downloaded += read
                                val pct = ((downloaded * 100) / totalSize.coerceAtLeast(1L)).toInt().coerceIn(0, 100)
                                onProgress(pct)
                                dao.upsert(
                                    row.copy(
                                        status = GameInstallStatus.DOWNLOADING.name,
                                        progress = pct,
                                    ),
                                )
                            }
                        }
                    }
                    success = true
                }
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) {
                    throw e
                }
                exception = e
                if (attempts < maxAttempts) {
                    kotlinx.coroutines.delay(2000)
                }
            }
        }

        if (!success) {
            if (partial.exists()) {
                partial.delete()
            }
            val tempFile = File(downloadDir, "temp_install.apk")
            if (tempFile.exists()) {
                tempFile.delete()
            }

            dao.upsert(row.copy(
                status = GameInstallStatus.READY.name,
                progress = 0,
                apkPath = null
            ))

            throw exception ?: ApiException("Download failed after $maxAttempts attempts")
        }

        if (partial.length() < 1024) {
            partial.delete()
            dao.upsert(row.copy(
                status = GameInstallStatus.READY.name,
                progress = 0,
                apkPath = null
            ))
            throw ApiException("Downloaded file is too small")
        }

        partial.renameTo(dest)
        val hash = sha256(dest)

        // Extract package name from raw APK file before scrambling
        val pm = context.packageManager
        val info = pm.getPackageArchiveInfo(dest.absolutePath, 0)
        val packageName = info?.packageName

        // Scramble file in-place and rename to .lazplay_locked
        scrambleFile(dest)
        val lockedDest = File(dest.parentFile, "${dest.name}.lazplay_locked")
        if (lockedDest.exists()) {
            lockedDest.delete()
        }
        dest.renameTo(lockedDest)

        val updatedRow = row.copy(
            status = GameInstallStatus.DOWNLOADED.name,
            progress = 100,
            apkPath = lockedDest.absolutePath,
            packageName = packageName,
            checksumSha256 = hash,
            fileSizeBytes = lockedDest.length(),
        )
        dao.upsert(updatedRow)
        prepareApkForInstall(updatedRow) ?: lockedDest
    }

    private fun sha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(8192)
            while (true) {
                val read = input.read(buffer)
                if (read <= 0) break
                digest.update(buffer, 0, read)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    suspend fun verifyInstallAndApkStates() = withContext(Dispatchers.IO) {
        try {
            val games = dao.getAll()
            for (game in games) {
                var pkg = game.packageName
                if (pkg.isNullOrBlank()) {
                    pkg = findPackageByAppName(context, game.title)
                    if (!pkg.isNullOrBlank()) {
                        dao.upsert(game.copy(packageName = pkg))
                    }
                }

                val apkExists = game.apkPath?.let { File(it).exists() } ?: false
                val isInstalled = pkg?.let { isAppInstalled(it) } ?: false

                var newStatus = GameInstallStatus.from(game.status)

                if (isInstalled) {
                    newStatus = GameInstallStatus.INSTALLED
                } else {
                    if (newStatus == GameInstallStatus.INSTALLED) {
                        newStatus = if (apkExists) GameInstallStatus.DOWNLOADED else GameInstallStatus.READY
                    } else if (newStatus == GameInstallStatus.DOWNLOADED && !apkExists) {
                        newStatus = GameInstallStatus.READY
                    }
                }

                if (newStatus.name != game.status) {
                    dao.upsert(game.copy(status = newStatus.name))
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun findPackageByAppName(context: Context, appName: String): String? {
        return try {
            val pm = context.packageManager
            val apps = pm.getInstalledApplications(0)
            for (app in apps) {
                val label = pm.getApplicationLabel(app).toString()
                if (label.equals(appName, ignoreCase = true)) {
                    return app.packageName
                }
            }
            null
        } catch (e: Exception) {
            null
        }
    }

    private fun isAppInstalled(packageName: String): Boolean {
        return try {
            context.packageManager.getPackageInfo(packageName, 0)
            true
        } catch (e: Exception) {
            false
        }
    }

    suspend fun clearCache() = withContext(Dispatchers.IO) {
        try {
            downloadDir.listFiles()?.forEach { it.delete() }
            val games = dao.getAll()
            for (game in games) {
                val isInstalled = game.packageName?.let { isAppInstalled(it) } ?: false
                if (isInstalled) {
                    dao.upsert(game.copy(
                        status = GameInstallStatus.INSTALLED.name,
                        apkPath = null
                    ))
                } else {
                    dao.upsert(game.copy(
                        status = GameInstallStatus.READY.name,
                        progress = 0,
                        apkPath = null
                    ))
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

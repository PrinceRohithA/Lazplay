package tech.lazplay.launcher.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "installed_games")
data class InstalledGameEntity(
    @PrimaryKey val gameId: String,
    val title: String,
    val version: String?,
    val downloadUrl: String?,
    val coverUrl: String?,
    val entrypoint: String?,
    val apkPath: String?,
    val packageName: String?,
    val status: String,
    val progress: Int = 0,
    val fileSizeBytes: Long = 0,
    val checksumSha256: String? = null,
    val updatedAt: Long = System.currentTimeMillis(),
)

enum class GameInstallStatus {
    READY,
    DOWNLOADING,
    PAUSED,
    DOWNLOADED,
    INSTALLED,
    ERROR,
    ;

    companion object {
        fun from(raw: String): GameInstallStatus =
            entries.find { it.name == raw } ?: READY
    }
}

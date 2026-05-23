package tech.lazplay.launcher.ui.library

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import coil.load
import tech.lazplay.launcher.data.local.GameInstallStatus
import tech.lazplay.launcher.data.local.InstalledGameEntity
import tech.lazplay.launcher.databinding.ItemLibraryGameBinding
import tech.lazplay.launcher.ui.theme.ThemeManager

class LibraryAdapter(
    private val onDownload: (InstalledGameEntity) -> Unit,
    private val onPause: (InstalledGameEntity) -> Unit,
    private val onResume: (InstalledGameEntity) -> Unit,
    private val onInstall: (InstalledGameEntity) -> Unit,
    private val onDelete: (InstalledGameEntity) -> Unit,
) : ListAdapter<InstalledGameEntity, LibraryAdapter.VH>(Diff) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val binding = ItemLibraryGameBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false,
        )
        return VH(binding)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        holder.bind(getItem(position))
    }

    inner class VH(private val binding: ItemLibraryGameBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(game: InstalledGameEntity) {
            binding.gameTitle.text = game.title
            binding.gameVersion.text = game.version ?: "—"
            binding.gameStatus.text = game.status
            binding.progressBar.progress = game.progress

            // Dynamic outline color based on theme selection
            binding.cardRoot.strokeColor = ThemeManager.getThemeColor()

            // Dynamic progress bar tint
            binding.progressBar.progressTintList = ThemeManager.getThemeColorStateList()

            // Load Game Cover Cover URL
            binding.gameCover.load(game.coverUrl) {
                crossfade(true)
            }

            val status = GameInstallStatus.from(game.status)
            // Progress bar is visible during downloading or when paused
            binding.progressBar.visibility =
                if (status == GameInstallStatus.DOWNLOADING || status == GameInstallStatus.PAUSED) android.view.View.VISIBLE
                else android.view.View.GONE

            // Check dynamically if app is installed and if APK exists
            val apkExists = game.apkPath?.let { java.io.File(it).exists() } ?: false
            val isInstalled = game.packageName?.let { pkg ->
                try {
                    binding.root.context.packageManager.getPackageInfo(pkg, 0)
                    true
                } catch (e: Exception) {
                    false
                }
            } ?: false

            val hasUpdate = !game.latestChecksumSha256.isNullOrBlank() &&
                            !game.checksumSha256.isNullOrBlank() &&
                            game.checksumSha256 != game.latestChecksumSha256

            binding.actionButton.text = when {
                status == GameInstallStatus.DOWNLOADING -> "PAUSE"
                status == GameInstallStatus.PAUSED -> "RESUME"
                hasUpdate -> "UPDATE"
                isInstalled -> "PLAY"
                status == GameInstallStatus.DOWNLOADED -> "INSTALL"
                status == GameInstallStatus.ERROR -> "RETRY"
                else -> if (game.downloadUrl.isNullOrBlank()) "NO APK" else "DOWNLOAD"
            }

            binding.actionButton.isEnabled =
                isInstalled || !game.downloadUrl.isNullOrBlank() || hasUpdate ||
                status == GameInstallStatus.DOWNLOADING || status == GameInstallStatus.PAUSED

            val partialFile = java.io.File(java.io.File(binding.root.context.filesDir, "downloads"), "${game.gameId}.apk.partial")
            val partialExists = partialFile.exists()

            // Show delete button if APK is cached, app is installed, or partial download exists (paused/error), and not currently downloading
            binding.deleteButton.visibility =
                if ((apkExists || isInstalled || partialExists || status == GameInstallStatus.PAUSED || status == GameInstallStatus.ERROR) &&
                    status != GameInstallStatus.DOWNLOADING) {
                    android.view.View.VISIBLE
                } else {
                    android.view.View.GONE
                }

            // Dynamic theme styling on action button and status text
            ThemeManager.applyTheme(binding.actionButton)
            binding.gameStatus.setTextColor(ThemeManager.getThemeColor())

            binding.actionButton.setOnClickListener {
                if (hasUpdate) {
                    onDownload(game)
                } else if (isInstalled && !game.packageName.isNullOrBlank()) {
                    val intent = binding.root.context.packageManager.getLaunchIntentForPackage(game.packageName)
                    if (intent != null) {
                        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                        binding.root.context.startActivity(intent)
                    } else {
                        onInstall(game)
                    }
                } else {
                    when (status) {
                        GameInstallStatus.DOWNLOADED -> onInstall(game)
                        GameInstallStatus.DOWNLOADING -> onPause(game)
                        GameInstallStatus.PAUSED -> onResume(game)
                        else -> onDownload(game)
                    }
                }
            }

            binding.deleteButton.setOnClickListener {
                onDelete(game)
            }
        }
    }

    private object Diff : DiffUtil.ItemCallback<InstalledGameEntity>() {
        override fun areItemsTheSame(a: InstalledGameEntity, b: InstalledGameEntity) =
            a.gameId == b.gameId

        override fun areContentsTheSame(a: InstalledGameEntity, b: InstalledGameEntity) =
            a == b
    }
}

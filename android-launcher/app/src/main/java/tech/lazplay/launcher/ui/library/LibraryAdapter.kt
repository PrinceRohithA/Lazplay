package tech.lazplay.launcher.ui.library

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import tech.lazplay.launcher.data.local.GameInstallStatus
import tech.lazplay.launcher.data.local.InstalledGameEntity
import tech.lazplay.launcher.databinding.ItemLibraryGameBinding

class LibraryAdapter(
    private val onDownload: (InstalledGameEntity) -> Unit,
    private val onInstall: (InstalledGameEntity) -> Unit,
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

            val status = GameInstallStatus.from(game.status)
            binding.progressBar.visibility =
                if (status == GameInstallStatus.DOWNLOADING) android.view.View.VISIBLE
                else android.view.View.GONE

            binding.actionButton.text = when (status) {
                GameInstallStatus.DOWNLOADED -> "INSTALL"
                GameInstallStatus.DOWNLOADING -> "DOWNLOADING…"
                GameInstallStatus.INSTALLED -> "INSTALLED"
                GameInstallStatus.ERROR -> "RETRY"
                else -> if (game.downloadUrl.isNullOrBlank()) "NO APK" else "DOWNLOAD"
            }

            binding.actionButton.isEnabled =
                status != GameInstallStatus.DOWNLOADING &&
                    !game.downloadUrl.isNullOrBlank()

            binding.actionButton.setOnClickListener {
                when (GameInstallStatus.from(game.status)) {
                    GameInstallStatus.DOWNLOADED -> onInstall(game)
                    else -> onDownload(game)
                }
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

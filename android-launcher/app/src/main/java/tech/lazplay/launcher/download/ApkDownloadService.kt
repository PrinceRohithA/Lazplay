package tech.lazplay.launcher.download

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import tech.lazplay.launcher.R
import tech.lazplay.launcher.data.ServiceLocator
import tech.lazplay.launcher.ui.main.MainActivity

class ApkDownloadService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val repo get() = ServiceLocator.downloadRepository
    private val installer get() = ServiceLocator.apkInstaller

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val gameId = intent?.getStringExtra(EXTRA_GAME_ID) ?: return stopSelfResult()
        val title = intent.getStringExtra(EXTRA_TITLE) ?: gameId

        createChannel()
        startForeground(NOTIFICATION_ID, buildNotification(title, 0))

        scope.launch {
            try {
                val apk = repo.downloadApk(gameId) { progress ->
                    val nm = getSystemService(NotificationManager::class.java)
                    nm.notify(NOTIFICATION_ID, buildNotification(title, progress))
                }
                if (installer.canRequestPackageInstalls()) {
                    installer.promptInstall(apk)
                } else {
                    installer.openInstallPermissionSettings()
                }
            } catch (_: Exception) {
                // Status persisted in Room as ERROR
            } finally {
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }

        return START_NOT_STICKY
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    private fun buildNotification(title: String, progress: Int): Notification {
        val open = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(getString(R.string.downloading_game, title))
            .setContentText(getString(R.string.download_progress, progress))
            .setProgress(100, progress, progress == 0)
            .setOngoing(true)
            .setContentIntent(open)
            .build()
    }

    private fun createChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.download_channel_name),
            NotificationManager.IMPORTANCE_LOW,
        )
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    companion object {
        private const val CHANNEL_ID = "lazplay_downloads"
        private const val NOTIFICATION_ID = 1001
        private const val EXTRA_GAME_ID = "game_id"
        private const val EXTRA_TITLE = "title"

        fun start(context: Context, gameId: String, title: String) {
            val intent = Intent(context, ApkDownloadService::class.java).apply {
                putExtra(EXTRA_GAME_ID, gameId)
                putExtra(EXTRA_TITLE, title)
            }
            context.startForegroundService(intent)
        }
    }
}

package tech.lazplay.launcher

import android.app.Application
import tech.lazplay.launcher.data.ServiceLocator
import tech.lazplay.launcher.ui.theme.ThemeManager

class LazPlayApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        ServiceLocator.init(this)
        // Apply the user's saved display mode (SYSTEM/LIGHT/DARK) before any Activity starts
        ThemeManager.applyDarkMode()
    }
}

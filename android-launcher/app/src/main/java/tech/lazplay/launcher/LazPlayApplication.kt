package tech.lazplay.launcher

import android.app.Application
import tech.lazplay.launcher.data.ServiceLocator

class LazPlayApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        ServiceLocator.init(this)
    }
}

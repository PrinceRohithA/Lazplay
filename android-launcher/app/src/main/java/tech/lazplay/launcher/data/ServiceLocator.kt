package tech.lazplay.launcher.data

import android.content.Context
import tech.lazplay.launcher.data.api.LazPlayApi
import tech.lazplay.launcher.data.local.GameDatabase
import tech.lazplay.launcher.data.local.TokenStore
import tech.lazplay.launcher.download.ApkDownloadRepository
import tech.lazplay.launcher.download.ApkInstaller

object ServiceLocator {
    private lateinit var appContext: Context

    val tokenStore: TokenStore by lazy { TokenStore(appContext) }
    val database: GameDatabase by lazy { GameDatabase.get(appContext) }
    val api: LazPlayApi by lazy { LazPlayApi.create(tokenStore) }
    val downloadRepository: ApkDownloadRepository by lazy {
        ApkDownloadRepository(appContext, api, database)
    }
    val apkInstaller: ApkInstaller by lazy { ApkInstaller(appContext) }

    fun init(context: Context) {
        appContext = context.applicationContext
    }

    fun requireContext(): Context = appContext
}

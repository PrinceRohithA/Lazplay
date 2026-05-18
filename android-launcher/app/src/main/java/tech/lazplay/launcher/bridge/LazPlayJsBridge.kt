package tech.lazplay.launcher.bridge

import android.content.Intent
import android.net.Uri
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.fragment.app.Fragment
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import tech.lazplay.launcher.BuildConfig
import tech.lazplay.launcher.data.ServiceLocator
import tech.lazplay.launcher.download.ApkDownloadService

/**
 * JavaScript bridge exposed to the LazPlay storefront WebView as `window.LazPlayAndroid`.
 * Mirrors the desktop launcher's store-preload / electron bridge surface.
 */
class LazPlayJsBridge(
    private val fragment: Fragment,
    private val webViewProvider: () -> WebView?,
    private val onSessionChanged: () -> Unit,
    private val onOpenLibrary: () -> Unit,
) {
    private val scope = CoroutineScope(Dispatchers.Main)
    private val api get() = ServiceLocator.api
    private val tokenStore get() = ServiceLocator.tokenStore
    private val downloadRepo get() = ServiceLocator.downloadRepository

    @JavascriptInterface
    fun syncSession(accessToken: String, refreshToken: String?) {
        tokenStore.saveSession(accessToken, refreshToken)
        scope.launch { onSessionChanged() }
    }

    @JavascriptInterface
    fun getAccessToken(): String? = tokenStore.getAccessToken()

    @JavascriptInterface
    fun claimGame(gameId: String) {
        scope.launch {
            try {
                api.claimGame(gameId)
            } catch (_: Exception) {
                // Web UI may show its own errors
            }
        }
    }

    @JavascriptInterface
    fun installGame(gameId: String) {
        scope.launch {
            try {
                val items = api.library()
                downloadRepo.syncLibraryToCache(items)
                val item = items.find { it.id == gameId || it.gameId == gameId }
                val title = item?.title ?: gameId
                val ctx = fragment.requireContext()
                ApkDownloadService.start(ctx, gameId, title)
            } catch (_: Exception) {
                // Handled in library tab
            }
        }
    }

    @JavascriptInterface
    fun launchGame(gameId: String) {
        scope.launch { onOpenLibrary() }
    }

    @JavascriptInterface
    fun openWebGame(url: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        fragment.startActivity(intent)
    }

    @JavascriptInterface
    fun isLauncher(): Boolean = true

    fun injectBridgeScript() {
        val script = """
            (function() {
              if (window.LazPlayAndroid) {
                window.electron = window.electron || {};
                window.electron.syncSession = function(a, r) {
                  window.LazPlayAndroid.syncSession(a, r || '');
                };
                window.electron.installGame = function(id) {
                  window.LazPlayAndroid.installGame(id);
                };
                window.electron.launchGame = function(id) {
                  window.LazPlayAndroid.launchGame(id);
                };
                window.electron.invoke = function(channel) {
                  if (channel === 'get-access-token') {
                    return Promise.resolve(window.LazPlayAndroid.getAccessToken());
                  }
                  return Promise.reject(new Error('Unsupported channel: ' + channel));
                };
                window.electron.isLauncher = true;
              }
            })();
        """.trimIndent()
        webViewProvider()?.evaluateJavascript(script, null)
    }

    fun injectTokens() {
        val token = tokenStore.getAccessToken() ?: return
        val refresh = tokenStore.getRefreshToken().orEmpty()
        val script = """
            localStorage.setItem('accessToken', ${jsonString(token)});
            localStorage.setItem('refreshToken', ${jsonString(refresh)});
            window.dispatchEvent(new Event('storage'));
        """.trimIndent()
        webViewProvider()?.evaluateJavascript(script, null)
        injectBridgeScript()
    }

    private fun jsonString(value: String): String =
        "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""
}

package tech.lazplay.launcher.data.local

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class TokenStore(context: Context) {
    private val prefs = EncryptedSharedPreferences.create(
        context,
        FILE_NAME,
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    fun saveSession(accessToken: String, refreshToken: String?) {
        prefs.edit()
            .putString(KEY_ACCESS, accessToken)
            .putString(KEY_REFRESH, refreshToken.orEmpty())
            .apply()
    }

    fun getAccessToken(): String? = prefs.getString(KEY_ACCESS, null)?.takeIf { it.isNotBlank() }

    fun getRefreshToken(): String? = prefs.getString(KEY_REFRESH, null)?.takeIf { it.isNotBlank() }

    fun getThemeColor(): String = prefs.getString(KEY_THEME_COLOR, "#00F6F6") ?: "#00F6F6"

    fun saveThemeColor(colorHex: String) {
        prefs.edit().putString(KEY_THEME_COLOR, colorHex).apply()
    }

    fun clear() {
        // Retain the theme when logging out to keep preferred branding
        val currentTheme = getThemeColor()
        prefs.edit().clear().putString(KEY_THEME_COLOR, currentTheme).apply()
    }

    fun hasSession(): Boolean = getAccessToken() != null

    companion object {
        private const val FILE_NAME = "lazplay_secure_session"
        private const val KEY_ACCESS = "access_token"
        private const val KEY_REFRESH = "refresh_token"
        private const val KEY_THEME_COLOR = "theme_color"
    }
}

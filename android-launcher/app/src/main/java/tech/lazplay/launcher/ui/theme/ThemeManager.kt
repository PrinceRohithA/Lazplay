package tech.lazplay.launcher.ui.theme

import android.content.res.ColorStateList
import android.graphics.Color
import android.widget.TextView
import androidx.appcompat.app.AppCompatDelegate
import com.google.android.material.button.MaterialButton
import tech.lazplay.launcher.data.ServiceLocator

object ThemeManager {
    fun getThemeColorHex(): String {
        return ServiceLocator.tokenStore.getThemeColor()
    }

    fun getThemeColor(): Int {
        val hex = getThemeColorHex()
        return try {
            Color.parseColor(hex)
        } catch (_: Exception) {
            Color.parseColor("#00F6F6")
        }
    }

    fun applyTheme(textView: TextView) {
        textView.setTextColor(getThemeColor())
    }

    fun applyTheme(button: MaterialButton) {
        val color = getThemeColor()
        button.backgroundTintList = ColorStateList.valueOf(color)
        button.setTextColor(Color.BLACK) // Black text for high-contrast on neon background
    }

    fun getThemeColorStateList(): ColorStateList {
        return ColorStateList.valueOf(getThemeColor())
    }

    fun getBottomNavColorStateList(uncheckedColor: Int): ColorStateList {
        val checkedColor = getThemeColor()
        return ColorStateList(
            arrayOf(
                intArrayOf(android.R.attr.state_checked),
                intArrayOf(-android.R.attr.state_checked)
            ),
            intArrayOf(checkedColor, uncheckedColor)
        )
    }

    /**
     * Applies the stored display mode to the whole app via AppCompatDelegate.
     * Call this from Application.onCreate() and whenever the user changes the setting.
     * mode: "SYSTEM" | "LIGHT" | "DARK"
     */
    fun applyDarkMode(mode: String = ServiceLocator.tokenStore.getDarkMode()) {
        val nightMode = when (mode) {
            "LIGHT" -> AppCompatDelegate.MODE_NIGHT_NO
            "DARK"  -> AppCompatDelegate.MODE_NIGHT_YES
            else    -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        }
        AppCompatDelegate.setDefaultNightMode(nightMode)
    }
}


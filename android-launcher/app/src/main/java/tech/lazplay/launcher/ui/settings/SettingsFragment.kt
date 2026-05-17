package tech.lazplay.launcher.ui.settings

import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import tech.lazplay.launcher.data.ServiceLocator
import tech.lazplay.launcher.databinding.FragmentSettingsBinding
import tech.lazplay.launcher.ui.auth.LoginActivity
import tech.lazplay.launcher.ui.theme.ThemeManager

class SettingsFragment : Fragment() {
    private var _binding: FragmentSettingsBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        _binding = FragmentSettingsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        lifecycleScope.launch {
            try {
                val user = ServiceLocator.api.me()
                binding.profileName.text = user.displayName ?: user.username ?: "Player"
                binding.profileEmail.text = user.email ?: ""
            } catch (_: Exception) {
                binding.profileName.text = "—"
                binding.profileEmail.text = ""
            }
        }

        binding.clearCacheButton.setOnClickListener {
            ServiceLocator.downloadRepository.clearCache()
        }

        binding.logoutButton.setOnClickListener {
            ServiceLocator.tokenStore.clear()
            val intent = Intent(requireContext(), LoginActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            startActivity(intent)
            requireActivity().finish()
        }

        // Initialize Theme Color Preset Selectors
        setupColorPresets()
        updateColorPickers()
    }

    private fun setupColorPresets() {
        val presets = mapOf(
            binding.colorNeonGreen to "#39ff14",
            binding.colorCyberPink to "#fe00fe",
            binding.colorRetroCyan to "#00f6f6",
            binding.colorPlasmaPurple to "#9d00ff",
            binding.colorLaserRed to "#ff0000",
            binding.colorGoldenEye to "#ffcc00"
        )

        for ((card, hexColor) in presets) {
            card.setOnClickListener {
                ServiceLocator.tokenStore.saveThemeColor(hexColor)
                updateColorPickers()
            }
        }
    }

    private fun updateColorPickers() {
        if (_binding == null) return

        val activeColor = ThemeManager.getThemeColorHex().lowercase()
        val cards = mapOf(
            "#39ff14" to binding.colorNeonGreen,
            "#fe00fe" to binding.colorCyberPink,
            "#00f6f6" to binding.colorRetroCyan,
            "#9d00ff" to binding.colorPlasmaPurple,
            "#ff0000" to binding.colorLaserRed,
            "#ffcc00" to binding.colorGoldenEye
        )

        for ((color, card) in cards) {
            if (color == activeColor) {
                card.strokeWidth = 8
            } else {
                card.strokeWidth = 0
            }
        }

        // Live Apply Theme styling
        val themeColor = ThemeManager.getThemeColor()
        binding.settingsHeader.setTextColor(themeColor)
        binding.colorCalibrationLabel.setTextColor(themeColor)
        binding.profileCard.strokeColor = themeColor

        binding.clearCacheButton.strokeColor = ColorStateList.valueOf(themeColor)
        binding.clearCacheButton.setTextColor(themeColor)

        binding.logoutButton.backgroundTintList = ColorStateList.valueOf(themeColor)
        binding.logoutButton.setTextColor(Color.BLACK)

        (activity as? tech.lazplay.launcher.ui.main.MainActivity)?.updateBottomNavColors()
    }

    override fun onResume() {
        super.onResume()
        updateColorPickers()
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }
}

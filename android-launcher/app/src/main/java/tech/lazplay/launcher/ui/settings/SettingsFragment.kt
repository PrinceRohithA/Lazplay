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
import coil.load
import kotlinx.coroutines.launch
import tech.lazplay.launcher.data.ServiceLocator
import tech.lazplay.launcher.databinding.FragmentSettingsBinding
import tech.lazplay.launcher.databinding.ItemCachedApkBinding
import tech.lazplay.launcher.ui.auth.LoginActivity
import tech.lazplay.launcher.ui.theme.ThemeManager
import java.io.File

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
        
        // Dynamically load the cached APKs
        loadCacheList()
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
                // Reload list to apply new stroke styling
                loadCacheList()
            }
        }
    }

    private fun loadCacheList() {
        lifecycleScope.launch {
            try {
                binding.cacheContainer.removeAllViews()
                val dao = ServiceLocator.database.installedGameDao()
                val games = dao.getAll()
                val cachedGames = games.filter { game ->
                    game.apkPath?.let { File(it).exists() } ?: false
                }

                if (cachedGames.isEmpty()) {
                    val emptyTv = android.widget.TextView(requireContext()).apply {
                        text = "NO_CACHED_PAYLOADS_FOUND"
                        typeface = android.graphics.Typeface.MONOSPACE
                        textSize = 12f
                        gravity = android.view.Gravity.CENTER
                        setTextColor(Color.GRAY)
                        setPadding(0, 48, 0, 48)
                    }
                    binding.cacheContainer.addView(emptyTv)
                } else {
                    val inflater = LayoutInflater.from(requireContext())
                    val themeColor = ThemeManager.getThemeColor()

                    for (game in cachedGames) {
                        val itemBinding = ItemCachedApkBinding.inflate(inflater, binding.cacheContainer, false)

                        // Bind game details
                        itemBinding.gameTitle.text = game.title
                        itemBinding.gameCover.load(game.coverUrl) {
                            crossfade(true)
                        }

                        // Calculate file size
                        val file = File(game.apkPath!!)
                        val sizeMb = file.length() / (1024 * 1024)
                        itemBinding.cacheSize.text = "${sizeMb} MB // SECURED_PAYLOAD"

                        // Apply theme card styling
                        itemBinding.cardRoot.strokeColor = themeColor

                        // Clear button action
                        itemBinding.clearBtn.setOnClickListener {
                            lifecycleScope.launch {
                                // 1. Delete physical cache file
                                if (file.exists()) {
                                    file.delete()
                                }

                                // 2. Update DB based on if installed
                                val pkg = game.packageName
                                val isInstalled = pkg?.let { p ->
                                    try {
                                        requireContext().packageManager.getPackageInfo(p, 0)
                                        true
                                    } catch (e: Exception) {
                                        false
                                    }
                                } ?: false

                                if (isInstalled) {
                                    dao.upsert(game.copy(
                                        status = tech.lazplay.launcher.data.local.GameInstallStatus.INSTALLED.name,
                                        apkPath = null
                                    ))
                                } else {
                                    dao.upsert(game.copy(
                                        status = tech.lazplay.launcher.data.local.GameInstallStatus.READY.name,
                                        progress = 0,
                                        apkPath = null
                                    ))
                                }

                                // 3. Refresh list and repository
                                ServiceLocator.downloadRepository.verifyInstallAndApkStates()
                                loadCacheList()

                                android.widget.Toast.makeText(
                                    requireContext(),
                                    "Deleted cache for ${game.title}",
                                    android.widget.Toast.LENGTH_SHORT
                                ).show()
                            }
                        }

                        binding.cacheContainer.addView(itemBinding.root)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
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
        binding.cacheManagementLabel.setTextColor(themeColor)

        binding.logoutButton.backgroundTintList = ColorStateList.valueOf(themeColor)
        binding.logoutButton.setTextColor(Color.BLACK)

        (activity as? tech.lazplay.launcher.ui.main.MainActivity)?.updateBottomNavColors()
    }

    override fun onResume() {
        super.onResume()
        updateColorPickers()
        loadCacheList()
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }
}

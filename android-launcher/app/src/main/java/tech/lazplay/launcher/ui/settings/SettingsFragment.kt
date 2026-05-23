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

        // Load profile info
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

        // Logout
        binding.logoutButton.setOnClickListener {
            lifecycleScope.launch {
                try {
                    ServiceLocator.database.installedGameDao().deleteAll()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                ServiceLocator.tokenStore.clear()
                val intent = Intent(requireContext(), LoginActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                }
                startActivity(intent)
                requireActivity().finish()
            }
        }

        // Theme toggle
        setupThemeToggle()

        // Apply accent styling
        applyAccentColors()

        // Load cached APKs
        loadCacheList()
    }

    // ── Theme Toggle ──────────────────────────────────────────────────────────

    private fun setupThemeToggle() {
        // Reflect the current saved mode
        val currentMode = ServiceLocator.tokenStore.getDarkMode()
        val chipToCheck = when (currentMode) {
            "LIGHT"  -> binding.chipLight
            "DARK"   -> binding.chipDark
            else     -> binding.chipSystem
        }
        chipToCheck.isChecked = true

        binding.themeChipGroup.setOnCheckedStateChangeListener { _, checkedIds ->
            if (checkedIds.isEmpty()) return@setOnCheckedStateChangeListener

            val mode = when (checkedIds.first()) {
                binding.chipLight.id  -> "LIGHT"
                binding.chipDark.id   -> "DARK"
                else                  -> "SYSTEM"
            }

            ServiceLocator.tokenStore.saveDarkMode(mode)
            ThemeManager.applyDarkMode(mode)

            // Recreate the Activity so the new night-mode takes effect immediately
            requireActivity().recreate()
        }
    }

    // ── Cache List ────────────────────────────────────────────────────────────

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

                        itemBinding.gameTitle.text = game.title
                        itemBinding.gameCover.load(game.coverUrl) { crossfade(true) }

                        val file = File(game.apkPath!!)
                        val sizeMb = file.length() / (1024 * 1024)
                        itemBinding.cacheSize.text = "${sizeMb} MB // SECURED_PAYLOAD"
                        itemBinding.cardRoot.strokeColor = themeColor

                        itemBinding.clearBtn.setOnClickListener {
                            lifecycleScope.launch {
                                if (file.exists()) file.delete()

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

    // ── Accent colours (applied to non-chip UI elements) ─────────────────────

    private fun applyAccentColors() {
        if (_binding == null) return
        val themeColor = ThemeManager.getThemeColor()

        binding.settingsHeader.setTextColor(themeColor)
        binding.displayModeLabel.setTextColor(themeColor)
        binding.profileCard.strokeColor = themeColor
        binding.cacheManagementLabel.setTextColor(themeColor)

        binding.logoutButton.backgroundTintList = ColorStateList.valueOf(themeColor)
        binding.logoutButton.setTextColor(Color.BLACK)

        (activity as? tech.lazplay.launcher.ui.main.MainActivity)?.updateBottomNavColors()
    }

    override fun onResume() {
        super.onResume()
        applyAccentColors()
        loadCacheList()
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }
}

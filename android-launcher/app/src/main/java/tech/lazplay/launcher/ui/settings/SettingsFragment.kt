package tech.lazplay.launcher.ui.settings

import android.content.Intent
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
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }
}

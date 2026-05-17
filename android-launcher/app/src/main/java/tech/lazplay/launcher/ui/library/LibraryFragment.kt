package tech.lazplay.launcher.ui.library

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.recyclerview.widget.GridLayoutManager
import kotlinx.coroutines.launch
import tech.lazplay.launcher.databinding.FragmentLibraryBinding
import tech.lazplay.launcher.ui.theme.ThemeManager

class LibraryFragment : Fragment() {
    private var _binding: FragmentLibraryBinding? = null
    private val binding get() = _binding!!
    private val viewModel: LibraryViewModel by viewModels()

    private val adapter = LibraryAdapter(
        onDownload = { viewModel.download(it) },
        onInstall = { viewModel.installDownloaded(it) },
    )

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        _binding = FragmentLibraryBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.libraryList.layoutManager = GridLayoutManager(requireContext(), 2)
        binding.libraryList.adapter = adapter

        // Tint swipe refresh loader ring
        binding.libraryRefresh.setColorSchemeColors(ThemeManager.getThemeColor())

        binding.libraryRefresh.setOnRefreshListener {
            viewModel.refresh()
            binding.libraryRefresh.isRefreshing = false
        }

        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.games.collect { list ->
                    adapter.submitList(list)
                    binding.libraryEmpty.visibility =
                        if (list.isEmpty()) View.VISIBLE else View.GONE
                }
            }
        }

        viewModel.refresh()
    }

    override fun onResume() {
        super.onResume()
        viewModel.refresh()
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }
}

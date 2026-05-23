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
        onPause = { viewModel.pause(it) },
        onResume = { viewModel.resume(it) },
        onInstall = { viewModel.installDownloaded(it) },
        onDelete = { viewModel.deleteGame(it) },
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
        }

        // Observe the games list
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.games.collect { list ->
                    adapter.submitList(list)
                }
            }
        }

        // Observe UI state for loading/error/empty handling
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state ->
                    when (state) {
                        is LibraryUiState.Loading -> {
                            binding.libraryRefresh.isRefreshing = true
                            binding.libraryEmpty.visibility = View.GONE
                        }
                        is LibraryUiState.Success -> {
                            binding.libraryRefresh.isRefreshing = false
                            // Show empty view only after a successful sync with no results
                            val isEmpty = adapter.currentList.isEmpty()
                            binding.libraryEmpty.visibility =
                                if (isEmpty) View.VISIBLE else View.GONE
                            if (isEmpty) {
                                binding.libraryEmpty.text = "No Android games in your library.\nClaim games from the Store tab."
                            }
                        }
                        is LibraryUiState.Error -> {
                            binding.libraryRefresh.isRefreshing = false
                            // Show error in the empty view only if there is no data to display
                            if (adapter.currentList.isEmpty()) {
                                binding.libraryEmpty.text = state.message
                                binding.libraryEmpty.visibility = View.VISIBLE
                            } else {
                                binding.libraryEmpty.visibility = View.GONE
                            }
                        }
                        is LibraryUiState.NotLoggedIn -> {
                            binding.libraryRefresh.isRefreshing = false
                            binding.libraryEmpty.text = "Please log in to view your library."
                            binding.libraryEmpty.visibility = View.VISIBLE
                        }
                    }
                }
            }
        }
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

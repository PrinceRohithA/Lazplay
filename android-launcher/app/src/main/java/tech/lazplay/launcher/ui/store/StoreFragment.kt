package tech.lazplay.launcher.ui.store

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.fragment.app.Fragment
import tech.lazplay.launcher.BuildConfig
import tech.lazplay.launcher.R
import tech.lazplay.launcher.bridge.LazPlayJsBridge
import tech.lazplay.launcher.databinding.FragmentStoreBinding
import tech.lazplay.launcher.ui.main.MainActivity

class StoreFragment : Fragment() {
    private var _binding: FragmentStoreBinding? = null
    private val binding get() = _binding!!
    private lateinit var bridge: LazPlayJsBridge

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        _binding = FragmentStoreBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        bridge = LazPlayJsBridge(
            fragment = this,
            webViewProvider = { binding.storeWebView },
            onSessionChanged = { bridge.injectTokens() },
            onOpenLibrary = {
                (activity as? MainActivity)?.selectTab(R.id.libraryFragment)
            },
        )

        binding.storeWebView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = false
            setSupportZoom(true)
        }

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(binding.storeWebView, true)

        binding.storeWebView.addJavascriptInterface(bridge, "LazPlayAndroid")
        binding.storeWebView.webChromeClient = WebChromeClient()
        binding.storeWebView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                binding.storeProgress.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                binding.storeProgress.visibility = View.GONE
                bridge.injectTokens()
                bridge.injectBridgeScript()
            }

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest,
            ): Boolean {
                val host = request.url.host.orEmpty()
                if (host.endsWith("lazplay.tech")) {
                    return false
                }
                bridge.openWebGame(request.url.toString())
                return true
            }
        }

        if (savedInstanceState != null) {
            binding.storeWebView.restoreState(savedInstanceState)
        } else {
            binding.storeWebView.loadUrl(BuildConfig.STORE_URL)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        _binding?.storeWebView?.saveState(outState)
    }

    override fun onDestroyView() {
        binding.storeWebView.destroy()
        _binding = null
        super.onDestroyView()
    }
}

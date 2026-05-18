package tech.lazplay.launcher.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import tech.lazplay.launcher.data.ServiceLocator
import tech.lazplay.launcher.databinding.ActivityLoginBinding
import tech.lazplay.launcher.ui.main.MainActivity

class LoginActivity : AppCompatActivity() {
    private lateinit var binding: ActivityLoginBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (ServiceLocator.tokenStore.hasSession()) {
            verifyAndOpenMain()
            return
        }

        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.loginButton.setOnClickListener { attemptLogin() }
    }

    private fun verifyAndOpenMain() {
        lifecycleScope.launch {
            try {
                ServiceLocator.api.me()
                openMain()
            } catch (_: Exception) {
                try {
                    ServiceLocator.database.installedGameDao().deleteAll()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                ServiceLocator.tokenStore.clear()
                if (!::binding.isInitialized) {
                    binding = ActivityLoginBinding.inflate(layoutInflater)
                    setContentView(binding.root)
                    binding.loginButton.setOnClickListener { attemptLogin() }
                }
            }
        }
    }

    private fun attemptLogin() {
        val identifier = binding.identifierInput.text?.toString()?.trim().orEmpty()
        val password = binding.passwordInput.text?.toString().orEmpty()
        if (identifier.isBlank() || password.isBlank()) {
            binding.errorText.text = getString(tech.lazplay.launcher.R.string.login_fields_required)
            binding.errorText.visibility = View.VISIBLE
            return
        }

        binding.loginButton.isEnabled = false
        binding.errorText.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val result = ServiceLocator.api.login(identifier, password)
                val token = result.accessToken ?: throw IllegalStateException("No token")
                ServiceLocator.tokenStore.saveSession(token, result.refreshToken)
                openMain()
            } catch (e: Exception) {
                binding.errorText.text = e.message ?: getString(tech.lazplay.launcher.R.string.login_failed)
                binding.errorText.visibility = View.VISIBLE
                binding.loginButton.isEnabled = true
            }
        }
    }

    private fun openMain() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}

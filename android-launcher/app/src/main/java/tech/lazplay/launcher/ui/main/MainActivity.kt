package tech.lazplay.launcher.ui.main

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import android.graphics.Color
import tech.lazplay.launcher.R
import tech.lazplay.launcher.databinding.ActivityMainBinding
import tech.lazplay.launcher.ui.theme.ThemeManager

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val navHost = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        val navController = navHost.navController
        binding.bottomNav.setupWithNavController(navController)
        updateBottomNavColors()
    }

    override fun onResume() {
        super.onResume()
        updateBottomNavColors()
    }

    fun updateBottomNavColors() {
        val uncheckedColor = Color.parseColor("#9A9898")
        val stateList = ThemeManager.getBottomNavColorStateList(uncheckedColor)
        binding.bottomNav.itemIconTintList = stateList
        binding.bottomNav.itemTextColor = stateList
    }

    fun selectTab(destinationId: Int) {
        binding.bottomNav.selectedItemId = destinationId
    }
}

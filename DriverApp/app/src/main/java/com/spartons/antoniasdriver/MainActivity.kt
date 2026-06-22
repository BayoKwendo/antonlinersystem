package com.spartons.antoniasdriver

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.spartons.antoniasdriver.ui.AppNav
import com.spartons.antoniasdriver.ui.theme.AntonLinerDriverTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // targetSdk 35 forces edge-to-edge; opt in explicitly so the system bars
        // are transparent and their icon contrast follows the phone's light/dark theme.
        enableEdgeToEdge()
        setContent {
            AntonLinerDriverTheme {
                AppNav(startLoggedIn = ServiceLocator.session.cachedAccess != null)
            }
        }
    }
}

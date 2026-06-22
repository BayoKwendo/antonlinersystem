package com.spartons.antonis

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.spartons.antonis.ui.AppNav
import com.spartons.antonis.ui.theme.AntonLinerTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // targetSdk 35 forces edge-to-edge; opt in explicitly so the system bars
        // are transparent and their icon contrast follows the phone's light/dark theme.
        enableEdgeToEdge()
        setContent {
            AntonLinerTheme {
                AppNav(startLoggedIn = ServiceLocator.session.cachedAccess != null)
            }
        }
    }
}

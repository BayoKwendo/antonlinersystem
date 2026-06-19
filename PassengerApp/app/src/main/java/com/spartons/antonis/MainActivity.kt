package com.spartons.antonis

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.spartons.antonis.ui.AppNav
import com.spartons.antonis.ui.theme.AntonLinerTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AntonLinerTheme {
                AppNav(startLoggedIn = ServiceLocator.session.cachedAccess != null)
            }
        }
    }
}

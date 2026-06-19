package com.spartons.antoniasdriver

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.spartons.antoniasdriver.ui.AppNav
import com.spartons.antoniasdriver.ui.theme.AntonLinerDriverTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AntonLinerDriverTheme {
                AppNav(startLoggedIn = ServiceLocator.session.cachedAccess != null)
            }
        }
    }
}

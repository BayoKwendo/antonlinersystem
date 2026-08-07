package com.spartons.antoniasdriver

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.spartons.antoniasdriver.messaging.EXTRA_DEEPLINK_JOB_ID
import com.spartons.antoniasdriver.ui.AppNav
import com.spartons.antoniasdriver.ui.theme.AntonLinerDriverTheme

class MainActivity : ComponentActivity() {
    // Booking id to deep-link into (set from a "start your trip" push tap). Reactive
    // so a tap while the app is already running (onNewIntent) also navigates.
    private var deepLinkJobId by mutableStateOf<Long?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        deepLinkJobId = intent.jobDeepLink()
        // targetSdk 35 forces edge-to-edge; opt in explicitly so the system bars
        // are transparent and their icon contrast follows the phone's light/dark theme.
        enableEdgeToEdge()
        setContent {
            AntonLinerDriverTheme {
                AppNav(
                    startLoggedIn = ServiceLocator.session.cachedAccess != null,
                    deepLinkJobId = deepLinkJobId,
                    onDeepLinkConsumed = { deepLinkJobId = null },
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        intent.jobDeepLink()?.let { deepLinkJobId = it }
    }

    private fun Intent.jobDeepLink(): Long? =
        getLongExtra(EXTRA_DEEPLINK_JOB_ID, -1L).takeIf { it > 0L }
}

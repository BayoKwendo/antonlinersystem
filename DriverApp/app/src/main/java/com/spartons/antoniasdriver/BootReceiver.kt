package com.spartons.antoniasdriver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Brings location tracking back after the device reboots (or the app process is
 * recreated), but only if the driver was online when it stopped and is still
 * signed in. Registered for BOOT_COMPLETED in the manifest.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != Intent.ACTION_LOCKED_BOOT_COMPLETED &&
            action != "android.intent.action.QUICKBOOT_POWERON"
        ) return

        if (TrackingState.isWanted(context) && ServiceLocator.session.cachedAccess != null) {
            runCatching { DriverLocationService.start(context) }
        }
    }
}

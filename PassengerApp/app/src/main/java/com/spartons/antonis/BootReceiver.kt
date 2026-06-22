package com.spartons.antonis

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Resumes driver tracking after the device reboots, if the customer was watching
 * a booking and is still signed in. Best-effort: if the trip is already over the
 * backend simply won't send updates. Registered for BOOT_COMPLETED in the manifest.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != Intent.ACTION_LOCKED_BOOT_COMPLETED &&
            action != "android.intent.action.QUICKBOOT_POWERON"
        ) return

        val bookingId = TrackingState.booking(context)
        if (bookingId > 0 && ServiceLocator.session.cachedAccess != null) {
            runCatching { DriverTrackService.start(context, bookingId) }
        }
    }
}

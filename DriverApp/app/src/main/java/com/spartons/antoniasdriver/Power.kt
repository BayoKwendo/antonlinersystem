package com.spartons.antoniasdriver

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings

/**
 * Asks the system to exempt this app from battery optimization (Doze / App
 * Standby). Without this, OEMs aggressively kill the location service when the
 * screen is off, so tracking silently stops. No-ops if already exempt.
 *
 * Needs an Activity-capable context to show the system dialog.
 */
fun requestIgnoreBatteryOptimizations(context: Context) {
    val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    if (pm.isIgnoringBatteryOptimizations(context.packageName)) return
    val intent = Intent(
        Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
        Uri.parse("package:${context.packageName}"),
    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    runCatching { context.startActivity(intent) }
}

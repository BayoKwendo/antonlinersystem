package com.spartons.antoniasdriver

import android.content.Context

/**
 * Tiny synchronous flag recording whether the driver chose to be online and have
 * their location tracked. Backed by SharedPreferences so the boot receiver and
 * the service's restart paths can read it without coroutines/DataStore.
 *
 * This is the single source of truth for "should tracking be running right now",
 * which lets us bring the service back after a reboot or an OEM task-kill.
 */
object TrackingState {
    private const val PREFS = "tracking"
    private const val KEY_WANTED = "tracking_wanted"

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun setWanted(context: Context, wanted: Boolean) {
        prefs(context).edit().putBoolean(KEY_WANTED, wanted).apply()
    }

    fun isWanted(context: Context): Boolean = prefs(context).getBoolean(KEY_WANTED, false)
}

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
    private const val KEY_BOOKING = "active_booking"

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun setWanted(context: Context, wanted: Boolean) {
        prefs(context).edit().putBoolean(KEY_WANTED, wanted).apply()
    }

    fun isWanted(context: Context): Boolean = prefs(context).getBoolean(KEY_WANTED, false)

    /**
     * Persist the booking whose customer is being streamed, so WebSocket
     * publishing can resume (not degrade to REST-only) after a START_STICKY /
     * boot service restart. Pass null to clear it when tracking stops.
     */
    fun setActiveBooking(context: Context, bookingId: Long?) {
        prefs(context).edit().apply {
            if (bookingId == null) remove(KEY_BOOKING) else putLong(KEY_BOOKING, bookingId)
        }.apply()
    }

    /** The persisted active booking id, or null if none is stored. */
    fun activeBooking(context: Context): Long? {
        val p = prefs(context)
        return if (p.contains(KEY_BOOKING)) p.getLong(KEY_BOOKING, -1L).takeIf { it >= 0 } else null
    }
}

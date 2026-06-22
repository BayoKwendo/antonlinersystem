package com.spartons.antonis

import android.content.Context

/**
 * Tiny synchronous record of which booking the customer is currently watching, so
 * the boot receiver and the service's restart paths can resume tracking without
 * coroutines/DataStore. -1 means "not watching anything".
 */
object TrackingState {
    private const val PREFS = "tracking"
    private const val KEY_BOOKING = "watch_booking"
    const val NONE = -1L

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun setBooking(context: Context, bookingId: Long) {
        prefs(context).edit().putLong(KEY_BOOKING, bookingId).apply()
    }

    fun clear(context: Context) {
        prefs(context).edit().remove(KEY_BOOKING).apply()
    }

    fun booking(context: Context): Long = prefs(context).getLong(KEY_BOOKING, NONE)
}

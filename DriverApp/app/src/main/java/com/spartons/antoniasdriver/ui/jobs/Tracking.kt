package com.spartons.antoniasdriver.ui.jobs

import android.content.Context
import com.spartons.antoniasdriver.DriverLocationService
import com.spartons.antoniasdriver.ServiceLocator
import com.spartons.antoniasdriver.requestIgnoreBatteryOptimizations

/**
 * Live location tracking is tied to an active job (not the availability toggle).
 * It starts when the provider taps "Headed to Site" and stops on arrival or when
 * the job is submitted / left. The foreground service publishes coordinates to
 * [ServiceLocator.activeBookingId]'s tracking channel.
 */
internal fun startTracking(context: Context, bookingId: Long) {
    ServiceLocator.activeBookingId = bookingId
    // Ask to be exempt from battery optimisation so tracking survives in background.
    requestIgnoreBatteryOptimizations(context)
    DriverLocationService.start(context)
}

internal fun stopTracking(context: Context, bookingId: Long) {
    if (ServiceLocator.activeBookingId == bookingId) ServiceLocator.activeBookingId = null
    DriverLocationService.stop(context)
}

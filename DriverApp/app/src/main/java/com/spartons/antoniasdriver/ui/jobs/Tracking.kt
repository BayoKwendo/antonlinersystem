package com.spartons.antoniasdriver.ui.jobs

import android.content.Context
import com.spartons.antoniasdriver.DriverLocationService
import com.spartons.antoniasdriver.ServiceLocator
import com.spartons.antoniasdriver.TrackingState
import com.spartons.antoniasdriver.requestIgnoreBatteryOptimizations

/**
 * Live location tracking is tied to an active job (not the availability toggle).
 * It starts when the provider taps "Start Trip" and stops on arrival or when
 * the job is submitted / left. The foreground service publishes coordinates to
 * [ServiceLocator.activeBookingId]'s tracking channel.
 */
internal fun startTracking(context: Context, bookingId: Long) {
    ServiceLocator.activeBookingId = bookingId
    // Persist so WS publishing resumes for this booking after a service restart.
    TrackingState.setActiveBooking(context, bookingId)
    // Ask to be exempt from battery optimisation so tracking survives in background.
    requestIgnoreBatteryOptimizations(context)
    DriverLocationService.start(context)
}

internal fun stopTracking(context: Context, bookingId: Long) {
    if (ServiceLocator.activeBookingId == bookingId) ServiceLocator.activeBookingId = null
    TrackingState.setActiveBooking(context, null)
    DriverLocationService.stop(context)
}

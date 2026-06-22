package com.spartons.antonis.tracking

import com.google.android.gms.maps.model.LatLng
import kotlinx.coroutines.flow.MutableStateFlow

/**
 * Shared sink for the driver's live location. The foreground [DriverTrackService]
 * owns the tracking WebSocket and writes here; the UI observes it. This decouples
 * the connection's lifetime (the service) from the screen's lifetime, so tracking
 * keeps flowing while the app is backgrounded.
 */
object ActiveTracking {
    val location = MutableStateFlow<LatLng?>(null)

    @Volatile
    var bookingId: Long? = null
}
